import { requireAdmin } from '../_lib/admin';
import { errorResponse, json } from '../_lib/security';
export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); return json({ admin: true }); }
  catch (error) { return errorResponse(error); }
}
