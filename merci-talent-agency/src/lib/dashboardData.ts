import type { SupabaseClient } from '@supabase/supabase-js';
import { withDeadline } from './requestDeadline';

export const dashboardTabs = ['models', 'news', 'works', 'orders', 'settings'] as const;
export type DashboardTab = typeof dashboardTabs[number];
type TabState = { loaded: boolean; loading: boolean; error: string | null };

export async function fetchDashboardTab(client: SupabaseClient, tab: DashboardTab, signal: AbortSignal): Promise<unknown[]> {
  let query = client.from(tab === 'settings' ? 'site_settings' : tab).select('*');
  if (tab === 'models') query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  else if (tab === 'settings') query = query.limit(1);
  else query = query.order(tab === 'orders' ? 'created_at' : 'date', { ascending: false });
  const { data, error } = await query.abortSignal(signal);
  if (error) throw new Error('Data could not be loaded. Please retry.');
  return data || [];
}

/** Cache each visited tab for this dashboard mount; keep errors and requests independent. */
export function createDashboardLoader(
  load: (tab: DashboardTab, signal: AbortSignal) => Promise<unknown[]>,
  apply: (tab: DashboardTab, rows: unknown[]) => void,
  timeoutMs = 15_000,
) {
  let state = Object.fromEntries(dashboardTabs.map(tab => [tab, { loaded: false, loading: false, error: null }])) as Record<DashboardTab, TabState>;
  const pending = new Map<DashboardTab, { controller: AbortController; result: Promise<void> }>();
  const listeners = new Set<() => void>();
  const update = (tab: DashboardTab, patch: Partial<TabState>) => {
    state = { ...state, [tab]: { ...state[tab], ...patch } };
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    ensure(tab: DashboardTab, force = false): Promise<void> {
      const previous = pending.get(tab);
      if (!force && previous) return previous.result;
      if (!force && state[tab].loaded) return Promise.resolve();
      previous?.controller.abort();
      const controller = new AbortController();
      update(tab, { loading: true, error: null });
      const result = withDeadline(signal => load(tab, signal), timeoutMs, controller.signal).then(rows => {
        if (controller.signal.aborted) return;
        apply(tab, rows);
        update(tab, { loaded: true });
      }).catch(() => {
        if (!controller.signal.aborted) update(tab, { error: 'Data could not be loaded. Please retry.' });
      }).finally(() => {
        if (pending.get(tab)?.controller === controller) {
          pending.delete(tab);
          update(tab, { loading: false });
        }
      });
      pending.set(tab, { controller, result });
      return result;
    },
    cancel() {
      for (const [tab, request] of pending) {
        request.controller.abort();
        update(tab, { loading: false });
      }
      pending.clear();
    },
  };
}
