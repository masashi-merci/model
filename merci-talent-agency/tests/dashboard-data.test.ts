import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDashboardLoader, dashboardTabs, fetchDashboardTab } from '../src/lib/dashboardData';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test('opening Talent requests only models; repeated visits use its cache', async () => {
  const fetched: string[] = [], applied: string[] = [];
  const loader = createDashboardLoader(async tab => { fetched.push(tab); return []; }, tab => { applied.push(tab); });
  const first = loader.ensure('models');
  assert.equal(loader.ensure('models'), first);
  await first;
  await loader.ensure('models');
  assert.deepEqual(fetched, ['models']);
  assert.deepEqual(applied, ['models']);
  assert.equal(loader.getSnapshot().orders.loaded, false);
  await loader.ensure('news');
  assert.deepEqual(fetched, ['models', 'news']);
});

test('a slow Orders tab does not block Talent and errors stay scoped to their tab', async () => {
  const orders = deferred<unknown[]>();
  const applied: string[] = [];
  const loader = createDashboardLoader(async tab => {
    if (tab === 'orders') return orders.promise;
    if (tab === 'news') throw new Error('denied');
    return [];
  }, tab => { applied.push(tab); });
  const pending = loader.ensure('orders');
  await loader.ensure('models');
  await loader.ensure('news');
  assert.equal(loader.getSnapshot().models.loaded, true);
  assert.equal(loader.getSnapshot().models.error, null);
  assert.equal(loader.getSnapshot().orders.loading, true);
  assert.ok(loader.getSnapshot().news.error);
  orders.resolve([]); await pending;
  assert.deepEqual(applied, ['models', 'orders']);
});

test('timeout aborts the transport and retry recovers without overwriting other cached tabs', async () => {
  let retry = false;
  let signal: AbortSignal;
  const loader = createDashboardLoader(async (tab, requestSignal) => {
    if (tab === 'models' || retry) return [];
    signal = requestSignal;
    return new Promise(() => {});
  }, () => {}, 10);
  await loader.ensure('models');
  await loader.ensure('orders');
  assert.equal(signal!.aborted, true);
  assert.equal(loader.getSnapshot().orders.loading, false);
  assert.equal(loader.getSnapshot().orders.loaded, false);
  assert.ok(loader.getSnapshot().orders.error);
  retry = true;
  await loader.ensure('orders', true);
  assert.equal(loader.getSnapshot().orders.loaded, true);
  assert.equal(loader.getSnapshot().orders.error, null);
  assert.equal(loader.getSnapshot().models.loaded, true);
});

test('forced refresh ignores stale results; cancelling on logout prevents late state writes', async () => {
  const requests: ReturnType<typeof deferred<unknown[]>>[] = [];
  const rows: unknown[][] = [];
  const loader = createDashboardLoader(async () => {
    const request = deferred<unknown[]>(); requests.push(request); return request.promise;
  }, (_tab, data) => { rows.push(data); });
  const first = loader.ensure('models'); await nextTurn();
  const refresh = loader.ensure('models', true); await nextTurn();
  requests[1].resolve(['new']); await refresh;
  requests[0].resolve(['old']); await first;
  assert.deepEqual(rows, [['new']]);
  const beforeLogout = loader.ensure('orders'); await nextTurn();
  loader.cancel();
  requests[2].resolve(['private stale rows']); await beforeLogout;
  assert.deepEqual(rows, [['new']]);
  assert.equal(loader.getSnapshot().orders.loaded, false);
});

test('cancelled initial mount can reload and loaded settings are preserved on tab changes', async () => {
  const applied: string[] = [];
  const loader = createDashboardLoader(async () => [], tab => { applied.push(tab); });
  const cancelled = loader.ensure('models');
  loader.cancel();
  await cancelled;
  await loader.ensure('models');
  await loader.ensure('settings');
  await loader.ensure('news');
  await loader.ensure('settings');
  assert.deepEqual(applied, ['models', 'settings', 'news']);
});

test('the query adapter targets only the selected table, preserves ordering and passes cancellation', async () => {
  for (const tab of dashboardTabs) {
    const calls: unknown[] = [];
    const signal = new AbortController().signal;
    const builder = {
      select: (columns: string) => { calls.push(['select', columns]); return builder; },
      order: (column: string, options: unknown) => { calls.push(['order', column, options]); return builder; },
      limit: (value: number) => { calls.push(['limit', value]); return builder; },
      abortSignal: async (received: AbortSignal) => { assert.equal(received, signal); return { data: [], error: null }; },
    };
    const client = { from: (table: string) => { calls.push(['from', table]); return builder; } } as unknown as SupabaseClient;
    assert.deepEqual(await fetchDashboardTab(client, tab, signal), []);
    const expected: unknown[] = [['from', tab === 'settings' ? 'site_settings' : tab], ['select', '*']];
    if (tab === 'models') expected.push(['order', 'sort_order', { ascending: true }], ['order', 'created_at', { ascending: false }]);
    else if (tab === 'settings') expected.push(['limit', 1]);
    else expected.push(['order', tab === 'orders' ? 'created_at' : 'date', { ascending: false }]);
    assert.deepEqual(calls, expected);
  }
});
