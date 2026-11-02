"""Opt-in, read-only availability check. Importing this module makes no requests."""

import base64
import json
import os
import time
import urllib.error
import urllib.request


PROJECT_URL = "https://mgmsqcveercjqbmlqnlt.supabase.co"
ENDPOINT = PROJECT_URL + "/rest/v1/news?select=id&active=eq.true&limit=1"
TIMEOUT_SECONDS = 15
ATTEMPTS = 3
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward even a public key to a different endpoint/origin.
        return None


def public_headers(key):
    if not key or any(ch.isspace() for ch in key):
        raise ValueError("A publishable or legacy anon key is required")
    headers = {"apikey": key, "Accept": "application/json"}
    if key.startswith("sb_publishable_") and len(key) > len("sb_publishable_"):
        return headers
    try:
        parts = key.split(".")
        if len(parts) != 3:
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
        # This is a misuse guard, not signature verification; Supabase verifies the key.
        if payload.get("role") != "anon" or payload.get("ref") != "mgmsqcveercjqbmlqnlt":
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Use only this project's publishable or legacy anon key") from None
    headers["Authorization"] = "Bearer " + key
    return headers


def run_check(key, *, opener=None, sleep=time.sleep, clock=time.monotonic, log=print):
    try:
        headers = public_headers(key)
    except ValueError:
        log("Configuration error: use this project's publishable or legacy anon key.")
        return 2

    opener = opener or urllib.request.build_opener(NoRedirect())
    for attempt in range(1, ATTEMPTS + 1):
        started = clock()
        status = None
        try:
            request = urllib.request.Request(ENDPOINT, headers=headers, method="GET")
            with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                status = response.status
                # Do not read, print, or persist response bodies, row IDs, or headers.
        except urllib.error.HTTPError as error:
            status = error.code
            if error.fp is not None:
                error.close()
        except (urllib.error.URLError, TimeoutError, OSError):
            pass

        elapsed_ms = round((clock() - started) * 1000)
        log(f"Attempt {attempt}/{ATTEMPTS}: status={status or 'network_error'} elapsed_ms={elapsed_ms}")
        if status == 200:
            return 0  # An empty public news table is a successful read too.
        if status is not None and status not in RETRYABLE_STATUSES:
            return 1  # No retries for auth/config failures or redirects.
        if attempt < ATTEMPTS:
            sleep(2 ** attempt)
    return 1


if __name__ == "__main__":
    raise SystemExit(run_check(os.environ.get("SUPABASE_PUBLIC_KEY", "")))
