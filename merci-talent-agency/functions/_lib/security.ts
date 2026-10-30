export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function errorResponse(error: unknown) {
  return error instanceof HttpError ? json({ error: error.message }, error.status) : json({ error: 'Request could not be completed. Please try again later.' }, 500);
}
// Defense in depth, not a distributed quota: deploy a Cloudflare WAF rate-limit rule too.
const attempts = new Map<string, { count: number; until: number }>();
export function checkRequest(request: Request, scope: string, limit = 10) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Origin not allowed');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = `${scope}:${ip}`;
  const value = attempts.get(key) || { count: 0, until: now + 60_000 };
  if (++value.count > limit || attempts.size > 10_000) throw new HttpError(429, 'Too many requests. Please wait and try again.');
  attempts.set(key, value);
}
export async function boundedBody(request: Request, max: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > max) throw new HttpError(413, 'Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Request body required');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new HttpError(413, 'Request too large'); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
export function validateEmailPayload(payload: unknown, publicAssetUrl?: string) {
  if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Invalid request');
  const { type, data } = payload as any;
  if (!['contact', 'order'].includes(type) || !data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid request type or data');
  const clean: Record<string, any> = Object.create(null);
  for (const [key, value] of Object.entries(data)) {
    if (key === 'conditions') {
      if (!Array.isArray(value) || value.length > 20 || value.some(v => typeof v !== 'string' || v.length > 100)) throw new HttpError(400, 'Invalid conditions');
      clean[key] = value.map(escapeHtml);
    } else {
      if (typeof value !== 'string' || value.length > (['message', 'jobDescription'].includes(key) ? 10000 : 1000)) throw new HttpError(400, 'Invalid field');
      clean[key] = escapeHtml(value.trim());
    }
  }
  const required = type === 'contact' ? ['name', 'email', 'subject', 'message'] : ['companyName', 'contactPerson', 'email', 'projectName', 'jobDescription'];
  if (required.some(key => typeof data[key] !== 'string' || !data[key].trim())) throw new HttpError(400, 'Required fields missing');
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(data.email) || data.email.length > 254) throw new HttpError(400, 'Invalid email address');
  // Address used as a header/recipient must be raw, never the HTML-escaped version.
  const email = data.email;
  if (data.costumeImageUrl) {
    let url: URL, base: URL;
    try { url = new URL(data.costumeImageUrl); base = new URL(publicAssetUrl || ''); } catch { throw new HttpError(400, 'Invalid image URL'); }
    if (url.protocol !== 'https:' || url.origin !== base.origin || !url.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/orders/`) || url.username || url.password) throw new HttpError(400, 'Invalid image URL');
  }
  clean.conditions ??= [];
  return { type, data: clean, email };
}
export function validateUpload(bytes: Uint8Array, mime: string, folder: string) {
  const folders = ['uploads', 'profiles', 'news', 'works', 'settings', 'models/main', 'models/portfolio', 'models/main_model', 'models/portfolio_model', 'orders'];
  if (!folders.includes(folder)) throw new HttpError(400, 'Invalid upload folder');
  const prefix = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  let extension = '';
  if (mime === 'image/jpeg' && prefix(255, 216, 255)) extension = 'jpg';
  if (mime === 'image/png' && prefix(137, 80, 78, 71, 13, 10, 26, 10)) extension = 'png';
  if (mime === 'image/gif' && new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/)) extension = 'gif';
  if (mime === 'image/webp' && prefix(82, 73, 70, 70) && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') extension = 'webp';
  if (mime === 'application/pdf' && folder === 'profiles' && prefix(37, 80, 68, 70, 45)) extension = 'pdf';
  if (!extension) throw new HttpError(400, 'Only valid JPEG, PNG, GIF, WebP images or profile PDFs are accepted');
  if (!bytes.length || bytes.length > (extension === 'pdf' ? 10 : 5) * 1024 * 1024) throw new HttpError(413, 'File too large');
  return extension;
}
