# Security changes and pre-deployment gates

These are code-level safeguards, **not a verification of production security**. No production accounts, database policies, credentials, Cloudflare settings, or deployments were changed or tested.

## Implemented

- Editorial uploads and the admin route gate verify the bearer token with Supabase `auth.getUser`, then require **server-controlled** `app_metadata.role === 'admin'` or an exact user ID in the **server-only** comma-separated `ADMIN_USER_IDS` environment setting. Client-editable `user_metadata` and ordinary authenticated users are not admin authority. Missing authentication configuration fails closed. `/api/admin-session` does not grant database permissions.
- Public costume uploads remain available only under `orders/`. Uploads have a streamed 11 MiB multipart ceiling, a 5 MiB image / 10 MiB profile PDF ceiling, folder allowlists, MIME/signature matching, and random storage names. SVG/HTML and anonymous PDFs are rejected. Signature matching is not antivirus scanning or full image decoding.
- Email payloads have a streamed 32 KiB ceiling, shape/type/length/email validation, escaped HTML substitutions, trusted HTTPS costume asset URLs, static subject lines, and generic customer receipts without attacker-supplied content. Provider/configuration errors are not returned to callers.
- Public mutation endpoints reject cross-origin browser requests and apply a bounded, **per-process/per-isolate best-effort** request throttle (email: 5/minute/IP, upload: 10/minute/IP). This is not a durable or global rate limit; attackers can omit/spoof Origin, distribute IPs, or reach different isolates. Cloudflare supplies the IP in Pages; standalone Express ignores incoming Cloudflare IP headers and uses the peer address.
- Orders are inserted before notification mail. A mail failure after a successful insert shows a saved-order notice, not a retryable failed order. An immediate ref lock prevents simultaneous submit clicks. A lost DB response, tab reload, or deliberate replay still needs server-side durable idempotency/outbox design; this patch does not claim exactly-once delivery.
- Public model details query only active rows and clear previous model data during navigation. Database RLS must independently enforce this.
- Express development/standalone routes reuse the same Pages handlers instead of insecure duplicate implementations.

## Required owner review and separate authorization before deployment

1. **Preserve existing administrators:** inventory verified current administrator user IDs in Supabase before rollout. The repository did not define a role schema. After owner authorization, either assign their server-managed `app_metadata.role = admin` or configure `ADMIN_USER_IDS` on the server as a migration bridge. Do not use email matching, signup metadata, a `VITE_` allowlist, or an all-authenticated fallback. Until this mapping is explicitly configured, existing accounts lacking an admin role are intentionally denied. No mapping or role was changed by this patch.
2. **Audit Supabase RLS and grants:** enable/verify row-level security on all public tables. Public readers should only see active models/news/works and intended site settings; only verified administrators should create/update/delete editorial data or read customer orders. The `orders` table should permit only validated intended submissions and never public order reads/updates/deletes. A browser route guard cannot protect direct REST/database calls. Match server admin policy with RLS; a server-only ID allowlist does not automatically change RLS. Audit signup settings, service-role secret exposure, realtime, storage, and existing policies separately. No executable SQL was applied or offered as a blindly safe migration: actual schemas/policies are unverified.
3. **Durable abuse controls:** configure and verify Cloudflare WAF/rate-limit rules for `/api/send-email` and `/api/upload`, including anonymous order uploads. Consider an owner-approved Turnstile integration, server-side order insertion/outbox with idempotency keys, and verified-address receipts. The fixed generic auto-reply can still be spammed without upstream quotas/challenges. Apply storage quotas/retention for abandoned public costume uploads. These settings need production authorization.
4. **Asset hosting:** use a separate HTTPS asset origin with no application cookies, `X-Content-Type-Options: nosniff`, appropriate safe content disposition, and no active content execution. PDFs are served with attachment metadata; existing objects/headers were not audited. Public order image URLs are bearer-like public links, not private customer storage; assess privacy requirements before production.
5. **Environment and smoke tests:** confirm server `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public anon key, never service key), R2 binding/public HTTPS URL and Resend settings. Review all changes and obtain authorization for preview/deployment. Verify existing-admin login, non-admin rejection, RLS, controlled uploads, and notification delivery only in an authorized test environment. No live login, form submission, mail, upload, or data mutation was performed here.

## Offline regression checks

```sh
node --import tsx --test tests/security.test.ts
npm run lint
npm run build
```

Tests use local Requests and mocked provider/storage/auth calls; they make no live API requests. They cover validation, HTML/URL injection, bounds without trusting Content-Length, rate/origin rejection, file signature/folder restrictions, admin deny/default/allowlist decisions, anonymous editorial rejection, generated public asset keys, and generic customer receipts.

## Dependency audit (2026-10-30)

The initial production-dependency audit reported 25 advisories (including 2 critical and 14 high; an advisory does not itself establish exploitability of this application). Removed unused `@google/genai`, `@aws-sdk/s3-request-presigner`, `multer`, and `@types/multer`; updated vulnerable packages within existing compatible major ranges without `--force` or overrides. In particular Express remains 4.x, Vite remains 6.x, and tsx remains 4.x. The final full `npm audit --json` reports **zero known advisories** for the resulting lockfile at audit time. This is not a guarantee against unknown vulnerabilities; continue periodic audit and controlled updates.
