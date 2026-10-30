import { requireAdmin } from '../_lib/admin';
import { boundedBody, checkRequest, errorResponse, HttpError, json, validateUpload } from '../_lib/security';

export async function onRequestPost({ request, env }) {
  try {
    checkRequest(request, 'upload', 10);
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data;')) throw new HttpError(415, 'Multipart form required');
    const bytes = await boundedBody(request, 11 * 1024 * 1024);
    let form: FormData;
    try { form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData(); }
    catch { throw new HttpError(400, 'Invalid upload form'); }
    const file = form.get('file');
    const folder = form.get('folder') || 'uploads';
    if (typeof folder !== 'string' || !file || typeof file === 'string') throw new HttpError(400, 'File and folder required');
    // Only the public costume flow is anonymous. All editorial assets require verified admin authority.
    if (folder !== 'orders') await requireAdmin(request, env);
    const body = new Uint8Array(await file.arrayBuffer());
    const extension = validateUpload(body, file.type, folder);
    const bucket = env.BUCKET || env.MY_BUCKET;
    if (!bucket || !env.VITE_R2_PUBLIC_URL) throw new HttpError(503, 'Uploads are unavailable');
    const base = new URL(env.VITE_R2_PUBLIC_URL);
    if (base.protocol !== 'https:') throw new HttpError(503, 'Uploads are unavailable');
    // Never incorporate a supplied filename or customName into a storage key.
    const key = `${folder}/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, body, { httpMetadata: { contentType: file.type, contentDisposition: extension === 'pdf' ? 'attachment' : 'inline' } });
    return json({ url: `${base.href.replace(/\/$/, '')}/${key}` });
  } catch (error) { return errorResponse(error); }
}
