import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedBody, checkRequest, escapeHtml, HttpError, validateEmailPayload, validateUpload } from '../functions/_lib/security';
import { onRequestPost as upload } from '../functions/api/upload';
import { onRequestPost as sendEmail } from '../functions/api/send-email';
import { onRequestGet as adminSession } from '../functions/api/admin-session';

const contact = { type: 'contact', data: { name: '<img src=x>', email: 'test@example.com', subject: 'Hello', message: '<a href="evil">bad</a>' } };
test('escape HTML text and attribute delimiters before templates', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
  const result = validateEmailPayload(contact);
  assert.equal(result.data.name, '&lt;img src=x&gt;');
  assert.equal(result.email, 'test@example.com');
  assert.ok(!result.data.message.includes('<a'));
});
test('reject unsupported payload, incorrect field types, oversized content and header injection', () => {
  for (const payload of [null, {}, { type: 'other', data: {} }, { ...contact, data: { ...contact.data, message: [] } }, { ...contact, data: { ...contact.data, email: 'x@example.com\r\nBcc:x@evil.com' } }, { ...contact, data: { ...contact.data, message: 'x'.repeat(10001) } }]) {
    assert.throws(() => validateEmailPayload(payload), HttpError);
  }
});
test('costume URLs must belong to the configured HTTPS orders asset path', () => {
  for (const costumeImageUrl of ['javascript:alert(1)', 'https://evil.test/orders/x.png', 'https://assets.test/profiles/x.pdf', 'https://assets.test/orders/../evil.png']) {
    assert.throws(() => validateEmailPayload({ ...contact, data: { ...contact.data, costumeImageUrl } }, 'https://assets.test'), HttpError);
  }
  assert.doesNotThrow(() => validateEmailPayload({ ...contact, data: { ...contact.data, costumeImageUrl: 'https://assets.test/orders/x.png' } }, 'https://assets.test'));
});
test('upload signatures, types, folder traversal and size are enforced', () => {
  const png = new Uint8Array([137,80,78,71,13,10,26,10]);
  assert.equal(validateUpload(png, 'image/png', 'orders'), 'png');
  assert.throws(() => validateUpload(png, 'image/svg+xml', 'orders'));
  assert.throws(() => validateUpload(png, 'image/jpeg', 'orders'));
  assert.throws(() => validateUpload(png, 'image/png', '../orders'));
  const pdf = new TextEncoder().encode('%PDF-1.7');
  assert.equal(validateUpload(pdf, 'application/pdf', 'profiles'), 'pdf');
  assert.throws(() => validateUpload(pdf, 'application/pdf', 'orders'));
  const large = new Uint8Array(5 * 1024 * 1024 + 1); large.set(png);
  assert.throws(() => validateUpload(large, 'image/png', 'orders'), { status: 413 });
});
test('body bound also works with missing or dishonest Content-Length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }]) {
    await assert.rejects(boundedBody(new Request('https://site.test', { method: 'POST', headers, body: '12345' }), 4), { status: 413 });
  }
});
test('cross-site calls and repeated requests are rejected', () => {
  assert.throws(() => checkRequest(new Request('https://site.test', { headers: { origin: 'https://evil.test' } }), 'test'), { status: 403 });
  const request = new Request('https://site.test', { headers: { 'cf-connecting-ip': 'test-ip' } });
  checkRequest(request, 'test', 1);
  assert.throws(() => checkRequest(request, 'test', 1), { status: 429 });
});
test('admin endpoint denies absent token and missing verifier config', async () => {
  assert.equal((await adminSession({ request: new Request('https://site.test'), env: {} })).status, 401);
  assert.equal((await adminSession({ request: new Request('https://site.test', { headers: { authorization: 'Bearer token' } }), env: {} })).status, 503);
});
test('editorial upload denied before bucket writes', async () => {
  let writes = 0;
  const form = new FormData();
  form.append('folder', 'settings');
  form.append('file', new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' }), 'x.png');
  const response = await upload({ request: new Request('https://site.test/api/upload', { method: 'POST', body: form }), env: { MY_BUCKET: { put: () => writes++ } } });
  assert.equal(response.status, 401);
  assert.equal(writes, 0);
});
test('public uploads use generated keys rather than user filenames', async () => {
  const keys: string[] = [];
  const form = new FormData();
  form.append('folder', 'orders');
  form.append('file', new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' }), '../../evil.html');
  const response = await upload({ request: new Request('https://site.test/api/upload', { method: 'POST', body: form }), env: { VITE_R2_PUBLIC_URL: 'https://assets.test', MY_BUCKET: { put: async (key: string) => keys.push(key) } } });
  assert.equal(response.status, 200);
  assert.match(keys[0], /^orders\/[a-f0-9-]+\.png$/);
});
test('invalid email request fails before provider call; private errors not exposed', async () => {
  const response = await sendEmail({ request: new Request('https://site.test/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'invalid' }) }), env: {} });
  assert.equal(response.status, 400);
  const missing = await sendEmail({ request: new Request('https://site.test/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) }), env: {} });
  assert.equal(missing.status, 500);
  assert.ok(!(await missing.text()).includes('RESEND_API_KEY'));
});
test('only verified server-managed admin metadata or configured IDs authorize', async () => {
  const originalFetch = globalThis.fetch;
  let user: any = { id: 'existing-admin', app_metadata: {}, user_metadata: { role: 'admin' } };
  globalThis.fetch = async () => new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key' };
  const request = new Request('https://site.test/api/admin-session', { headers: { authorization: 'Bearer token' } });
  try {
    assert.equal((await adminSession({ request, env })).status, 403);
    user = { ...user, app_metadata: { role: 'admin' } };
    assert.equal((await adminSession({ request, env })).status, 200);
    user = { ...user, app_metadata: {} };
    assert.equal((await adminSession({ request, env: { ...env, ADMIN_USER_IDS: 'existing-admin' } })).status, 200);
    assert.equal((await adminSession({ request, env: { ...env, ADMIN_USER_IDS: 'another-admin' } })).status, 403);
  } finally { globalThis.fetch = originalFetch; }
});
test('provider receives escaped admin content and a generic non-phishing receipt', async () => {
  const originalFetch = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_input, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: 'mock-only' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const response = await sendEmail({ request: new Request('https://site.test/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': 'provider-test' }, body: JSON.stringify(contact) }), env: { RESEND_API_KEY: 're_mock' } });
    assert.equal(response.status, 200);
    assert.equal(sent.length, 2);
    assert.ok(sent[0].html.includes('&lt;img src=x&gt;'));
    assert.ok(!sent[0].html.includes('<img src=x>'));
    assert.ok(!sent[1].html.includes('evil'));
    assert.ok(!sent[1].html.includes('img src=x'));
  } finally { globalThis.fetch = originalFetch; }
});
