import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables (Settings > Environment Variables).'
        );
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    const value = Reflect.get(_supabase, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(_supabase);
    }
    return value;
  }
});
