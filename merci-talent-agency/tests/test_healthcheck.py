import base64
import importlib.util
import io
import json
from pathlib import Path
import unittest
import urllib.error


spec = importlib.util.spec_from_file_location("healthcheck", Path(__file__).parents[1] / "scripts/supabase_healthcheck.py")
healthcheck = importlib.util.module_from_spec(spec)
spec.loader.exec_module(healthcheck)


def jwt(role="anon", ref="mgmsqcveercjqbmlqnlt"):
    payload = base64.urlsafe_b64encode(json.dumps({"role": role, "ref": ref}).encode()).decode().rstrip("=")
    return "e30." + payload + ".test-signature"


class Response:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self, *_):
        raise AssertionError("A response body must never be read")


class Opener:
    def __init__(self, outcomes):
        self.outcomes = iter(outcomes)
        self.calls = []

    def open(self, request, *, timeout):
        self.calls.append((request, timeout))
        result = next(self.outcomes)
        if isinstance(result, Exception):
            raise result
        return result


class HealthcheckTests(unittest.TestCase):
    def test_only_public_get_with_bounded_row_and_timeout_no_body(self):
        opener = Opener([Response()])
        logs = []
        key = "sb_publishable_test-only"
        self.assertEqual(healthcheck.run_check(key, opener=opener, log=logs.append), 0)
        req, timeout = opener.calls[0]
        self.assertEqual(req.get_method(), "GET")
        self.assertEqual(req.full_url, healthcheck.ENDPOINT)
        self.assertEqual(timeout, 15)
        self.assertIsNone(req.data)
        self.assertIsNone(req.get_header("Authorization"))
        self.assertNotIn(key, " ".join(logs))

    def test_legacy_anon_supported_and_privileged_or_user_keys_rejected(self):
        self.assertIn("Authorization", healthcheck.public_headers(jwt()))
        for key in [jwt("service_role"), jwt("authenticated"), jwt(ref="another-project"), "sb_secret_do-not-log", "not-a-key", "", "sb_publishable_x\n"]:
            opener = Opener([])
            logs = []
            self.assertEqual(healthcheck.run_check(key, opener=opener, log=logs.append), 2)
            self.assertEqual(opener.calls, [])
            if key:
                self.assertNotIn(key, " ".join(logs))

    def test_transient_failure_retries_then_succeeds(self):
        error = urllib.error.HTTPError(healthcheck.ENDPOINT, 503, "private error", {}, io.BytesIO(b"private body"))
        opener = Opener([error, Response()])
        sleeps, logs = [], []
        self.assertEqual(healthcheck.run_check(jwt(), opener=opener, sleep=sleeps.append, log=logs.append), 0)
        self.assertEqual(sleeps, [2])
        self.assertNotIn("private", " ".join(logs))

    def test_network_failures_stop_after_three_attempts(self):
        opener = Opener([TimeoutError("sensitive detail")] * 3)
        sleeps, logs = [], []
        self.assertEqual(healthcheck.run_check(jwt(), opener=opener, sleep=sleeps.append, log=logs.append), 1)
        self.assertEqual(len(opener.calls), 3)
        self.assertEqual(sleeps, [2, 4])
        self.assertNotIn("sensitive", " ".join(logs))

    def test_auth_failure_and_redirect_do_not_retry(self):
        for status in [301, 401, 403, 404]:
            opener = Opener([urllib.error.HTTPError(healthcheck.ENDPOINT, status, "", {}, None)])
            self.assertEqual(healthcheck.run_check(jwt(), opener=opener, log=lambda _: None), 1)
            self.assertEqual(len(opener.calls), 1)

    def test_redirects_cannot_forward_key_to_another_host(self):
        self.assertIsNone(healthcheck.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.test"))


if __name__ == "__main__":
    unittest.main()
