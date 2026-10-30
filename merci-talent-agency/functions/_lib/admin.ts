import { createClient } from '@supabase/supabase-js';
import { HttpError } from './security';

export async function requireAdmin(request: Request, env: Record<string, any>) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new HttpError(401, 'Administrator sign-in required');
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new HttpError(503, 'Authentication is unavailable');
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new HttpError(401, 'Invalid or expired session');
  const ids = String(env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (user.app_metadata?.role !== 'admin' && !ids.includes(user.id)) throw new HttpError(403, 'Administrator permission required');
  return user;
}
