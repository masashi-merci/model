import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn, setTimeout as delay } from 'node:timers/promises';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { connectAdminSession, createAdminSessionStore } from '../src/lib/adminSession';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const session = (token = 'test-token', user = 'test-user') => ({ access_token: token, user: { id: user } } as Session);
const allowed = () => new Response(JSON.stringify({ admin: true }));
function transport() {
  const calls: { signal: AbortSignal; response: ReturnType<typeof deferred<Response>> }[] = [];
  const fetcher = (async (url, init) => {
    assert.equal(url, '/api/admin-session');
    assert.equal(init?.cache, 'no-store');
    const response = deferred<Response>();
    calls.push({ signal: init!.signal as AbortSignal, response });
    return response.promise;
  }) as typeof fetch;
  return { calls, store: createAdminSessionStore({ fetcher, timeoutMs: 200 }) };
}
function authSource() {
  let callback: (event: string, value: Session | null) => void = () => {};
  let unsubscribed = false;
  const bootstrap = deferred<any>();
  const auth = {
    getSession: () => bootstrap.promise,
    onAuthStateChange: (listener: typeof callback) => {
      callback = listener;
      return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
    },
  } as unknown as SupabaseClient['auth'];
  return { auth, bootstrap, emit: (event: string, value: Session | null) => callback(event, value), unsubscribed: () => unsubscribed };
}

test('bootstrap, INITIAL_SESSION and repeated sign-in share one pending verification', async () => {
  const { calls, store } = transport();
  const source = authSource();
  const disconnect = connectAdminSession(store, source.auth);
  source.bootstrap.resolve({ data: { session: session() }, error: null });
  await nextTurn();
  source.emit('INITIAL_SESSION', session());
  source.emit('SIGNED_IN', session());
  const result = store.setSession(session());
  assert.equal(calls.length, 1);
  assert.equal(store.getSnapshot().isAdmin, false);
  calls[0].response.resolve(allowed());
  assert.equal(await result, true);
  assert.equal(store.getSnapshot().isAdmin, true);
  disconnect();
});

test('same-session refocus revalidates without withdrawing a verified screen, then fails closed', async () => {
  const { calls, store } = transport();
  let result = store.setSession(session());
  await nextTurn(); calls[0].response.resolve(allowed()); await result;
  result = store.setSession(session());
  assert.deepEqual([store.getSnapshot().isAdmin, store.getSnapshot().checking], [true, true]);
  assert.equal(store.setSession(session()), result);
  await nextTurn();
  assert.equal(calls.length, 2);
  calls[1].response.resolve(new Response('{}', { status: 403 }));
  assert.equal(await result, false);
  assert.equal(store.getSnapshot().isAdmin, false);
  assert.equal(store.getSnapshot().checking, false);
  assert.ok(store.getSnapshot().error);
  store.clear();
});

test('logout aborts verification and a late success cannot authorize again', async () => {
  const { calls, store } = transport();
  const source = authSource();
  const disconnect = connectAdminSession(store, source.auth);
  source.emit('SIGNED_IN', session());
  const result = store.setSession(session());
  await nextTurn();
  source.emit('SIGNED_OUT', null);
  assert.equal(calls[0].signal.aborted, true);
  calls[0].response.resolve(allowed());
  source.bootstrap.resolve({ data: { session: session() }, error: null });
  assert.equal(await result, false);
  await nextTurn();
  assert.deepEqual(store.getSnapshot(), { user: null, isAdmin: false, checking: false, error: null });
  disconnect();
});

test('a refreshed token immediately loses the old grant; out-of-order account checks cannot override it', async () => {
  const { calls, store } = transport();
  const initial = store.setSession(session());
  await nextTurn(); calls[0].response.resolve(allowed()); await initial;
  const oldCheck = store.setSession(session());
  await nextTurn();
  const newCheck = store.setSession(session('new-token', 'other-user'));
  assert.equal(store.getSnapshot().isAdmin, false);
  assert.equal(store.getSnapshot().user?.id, 'other-user');
  await nextTurn();
  assert.equal(calls[1].signal.aborted, true);
  calls[2].response.resolve(new Response('{}', { status: 403 }));
  calls[1].response.resolve(allowed());
  assert.equal(await oldCheck, false);
  assert.equal(await newCheck, false);
  assert.equal(store.getSnapshot().isAdmin, false);
  store.clear();
});

test('denials, malformed JSON and network failures never grant; a later login can retry', async () => {
  for (const response of [new Response('{}', { status: 401 }), new Response('{}', { status: 403 }), new Response('{}', { status: 500 }), new Response('invalid'), new Response('{"admin":false}'), new Response('{"admin":"true"}'), null]) {
    let retry = false;
    const store = createAdminSessionStore({ fetcher: (async () => {
      if (retry) return allowed();
      if (!response) throw new Error('network unavailable');
      return response;
    }) as typeof fetch });
    assert.equal(await store.setSession(session()), false);
    assert.equal(store.getSnapshot().isAdmin, false);
    retry = true;
    assert.equal(await store.setSession(session()), true);
    store.clear();
  }
});

test('a hung response/body times out and aborts instead of leaving a spinner forever', async () => {
  for (const hangInBody of [false, true]) {
    let signal: AbortSignal;
    const store = createAdminSessionStore({ timeoutMs: 10, fetcher: (async (_url, init) => {
      signal = init!.signal as AbortSignal;
      if (!hangInBody) return new Promise(() => {});
      return { ok: true, json: () => new Promise(() => {}) } as Response;
    }) as typeof fetch });
    assert.equal(await store.setSession(session()), false);
    assert.equal(signal!.aborted, true);
    assert.equal(store.getSnapshot().checking, false);
    assert.equal(store.getSnapshot().isAdmin, false);
    store.clear();
  }
});

test('expired tokens cannot authorize, and verified state expires even without an auth event', async () => {
  let requests = 0;
  const store = createAdminSessionStore({ fetcher: (async () => { requests++; return allowed(); }) as typeof fetch });
  assert.equal(await store.setSession({ ...session(), expires_at: 0 }), false);
  assert.equal(await store.setSession({ ...session(), expires_at: Date.now() / 1000 - 1 }), false);
  assert.equal(requests, 0);
  assert.equal(await store.setSession({ ...session(), expires_at: (Date.now() + 25) / 1000 }), true);
  await delay(40);
  assert.equal(store.getSnapshot().isAdmin, false);
  store.clear();
});

test('a stopped subscription cannot restore an interrupted login and can reconnect', async () => {
  const { calls, store } = transport();
  const source = authSource();
  const disconnect = connectAdminSession(store, source.auth);
  source.emit('SIGNED_IN', session());
  await nextTurn();
  disconnect();
  assert.equal(source.unsubscribed(), true);
  source.emit('SIGNED_IN', session());
  source.bootstrap.resolve({ data: { session: session() } });
  calls[0].response.resolve(allowed());
  await nextTurn();
  assert.equal(store.getSnapshot().isAdmin, false);
  const nextSource = authSource();
  const stop = connectAdminSession(store, nextSource.auth);
  nextSource.emit('INITIAL_SESSION', session());
  await nextTurn(); calls[1].response.resolve(allowed()); await nextTurn();
  assert.equal(store.getSnapshot().isAdmin, true);
  stop();
});

test('session bootstrap timeout settles safely and a later explicit sign-in still works', async () => {
  const { calls, store } = transport();
  const source = authSource();
  const disconnect = connectAdminSession(store, source.auth, 10);
  await delay(20);
  assert.equal(store.getSnapshot().checking, false);
  assert.equal(store.getSnapshot().isAdmin, false);
  source.bootstrap.resolve({ data: { session: session() } });
  await nextTurn();
  assert.equal(calls.length, 0);
  source.emit('SIGNED_IN', session());
  await nextTurn(); calls[0].response.resolve(allowed()); await nextTurn();
  assert.equal(store.getSnapshot().isAdmin, true);
  disconnect();
});
