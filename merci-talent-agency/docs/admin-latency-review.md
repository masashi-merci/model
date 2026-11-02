# Admin latency change — local review

Base: `masashi-merci/model` main `7a6c0aed57b8e9cd783484b7cdda5edcc8ac7b1f`.
Prepared on `codex/admin-latency-keepalive-draft`. No push, production deployment, permission/configuration change, or workflow activation is part of this preparation.

## Problem and behavior

The login form, auth bootstrap, and auth event listener could each call `/api/admin-session`. Every verification set the whole App to a loading screen, unmounting its router and dashboard. The dashboard then waited for models, news, works, settings, and orders together.

The auth subscriber now owns verification. Concurrent checks for the same token share one request. A late bootstrap result cannot restore a session after a newer auth event. A same-token recheck retains the previously verified route while the server responds; it does not grant access to an unverified token. Logout, a new token/account, expiration, denied/malformed responses, and request timeout invalidate the grant. Verification (including JSON body decoding) has a 15-second bound and cancellation. The router stays mounted; protected routes alone handle initial authorization.

The login form only signs in to Supabase; it redirects through the shared verified state. Failed administrator verification shows an error and blocks every admin route. It does **not automatically sign out the Supabase session**: automatic sign-out from a stale verification could interfere with a newer login. Explicit logout still uses the existing Supabase sign-out flow, whose SIGNED_OUT event immediately invalidates pending checks. The server's administrator check and database policies remain unchanged; client state is not an authorization boundary.

The dashboard loads only the selected tab. Visited tabs retain their data during that dashboard mount; unvisited tab counts are omitted until loaded. Requests and errors are scoped to each tab, concurrent requests for a tab are shared, retries replace stale requests, and unmount cancels outstanding reads. A slow Orders query cannot hold up Talent. Settings edits survive switching to another tab. Re-entering the dashboard reloads the cache. Each read has a 15-second bound with a Retry action.

## Verification and limits

Behavior tests cover auth bootstrap/event overlap, repeated sign-in events, same-session revalidation, logout during a pending check, token/account changes, out-of-order success, denial, malformed responses, expiration, network/body timeout, disconnect/reconnect, per-tab request isolation, caching, errors, retry and cancellation. Route markup checks verify that unverified state never renders protected content and verified revalidation retains the same content.

```sh
npm run lint
npm test
npm run build
python3 -m unittest discover -s tests -p 'test_healthcheck.py' -v
```

These tests use mock transports. They do not log in to production or measure a production speed improvement. After a separately approved release, validate a real login, reload, tab switch, focus return, logout, and expired session in a browser; compare actual request counts/timings. Token rotation deliberately requires verification again and may remount protected content. Same-token checks do not. Existing server/database latency can still dominate a request.

Observed before this patch: a single production reload contained at least three admin-session requests; DOMContentLoaded was 196 ms, Load 198 ms, and Network Finish 16.07 s. Two data reads took 4.73 s and 4.8 s. These observations do not establish cold-start or Supabase inactivity as the cause.

The separate [read-only healthcheck draft](../../automation-drafts/README.md) remains outside `.github/workflows/`. It has separate activation prerequisites and is not a guaranteed latency fix or pause-prevention mechanism.
