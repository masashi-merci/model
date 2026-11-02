import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withDeadline } from './requestDeadline';

export type AdminSessionState = {
  user: Session['user'] | null;
  isAdmin: boolean;
  checking: boolean;
  error: string | null;
};

const verificationError = 'Administrator permission could not be verified. Please sign in again or retry.';

export function createAdminSessionStore({
  fetcher = fetch,
  timeoutMs = 15_000,
  now = Date.now,
} = {}) {
  let state: AdminSessionState = { user: null, isAdmin: false, checking: true, error: null };
  let token: string | undefined;
  let generation = 0;
  let pending: { controller: AbortController; result: Promise<boolean> } | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: AdminSessionState) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const invalidate = () => {
    generation++;
    pending?.controller.abort();
    pending = undefined;
    clearTimeout(expiryTimer);
  };

  const setSession = (session: Session | null): Promise<boolean> => {
    const nextToken = session?.access_token;
    if (nextToken && nextToken === token && pending) return pending.result;
    const wasVerified = !!nextToken && nextToken === token && state.isAdmin;
    invalidate();
    token = nextToken;
    if (!session || !nextToken) {
      publish({ user: null, isAdmin: false, checking: false, error: null });
      return Promise.resolve(false);
    }
    const expiresIn = typeof session.expires_at === 'number' ? session.expires_at * 1000 - now() : Infinity;
    if (expiresIn <= 0) {
      publish({ user: session.user, isAdmin: false, checking: false, error: verificationError });
      return Promise.resolve(false);
    }
    const current = generation;
    const controller = new AbortController();
    // Only a previously verified, unchanged token may retain its mounted screen.
    // Changed tokens/accounts are denied until the server verifies them.
    publish({ user: session.user, isAdmin: wasVerified, checking: true, error: null });
    if (Number.isFinite(expiresIn)) {
      expiryTimer = setTimeout(() => {
        invalidate();
        publish({ user: session.user, isAdmin: false, checking: false, error: verificationError });
      }, expiresIn);
    }
    const result = withDeadline(async signal => {
      const response = await fetcher('/api/admin-session', {
        headers: { Authorization: `Bearer ${nextToken}` },
        cache: 'no-store', signal,
      });
      return response.ok && (await response.json()).admin === true;
    }, timeoutMs, controller.signal).catch(() => false).then(authorized => {
      if (current !== generation) return false;
      pending = undefined;
      publish({ user: session.user, isAdmin: authorized, checking: false, error: authorized ? null : verificationError });
      return authorized;
    });
    pending = { controller, result };
    return result;
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setSession,
    clear: () => { void setSession(null); },
  };
}

export type AdminSessionStore = ReturnType<typeof createAdminSessionStore>;

/** Subscribe before bootstrap; never restore an old getSession result after an auth event. */
export function connectAdminSession(store: AdminSessionStore, auth: SupabaseClient['auth'], timeoutMs = 15_000) {
  let active = true;
  let receivedEvent = false;
  const timer = setTimeout(() => {
    if (active && !receivedEvent) {
      receivedEvent = true;
      store.clear();
    }
  }, timeoutMs);
  const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
    if (!active) return;
    receivedEvent = true;
    clearTimeout(timer);
    // No Supabase calls/await inside its auth callback (which holds an SDK lock).
    void store.setSession(session);
  });
  void auth.getSession().then(({ data: { session }, error }) => {
    if (active && !receivedEvent) {
      clearTimeout(timer);
      void store.setSession(error ? null : session);
    }
  }).catch(() => {
    if (active && !receivedEvent) store.clear();
  });
  return () => {
    active = false;
    clearTimeout(timer);
    subscription.unsubscribe();
    store.clear();
  };
}
