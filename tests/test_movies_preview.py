"""Synthetic HTTP contract checks; no canonical workspace is served."""

import contextlib
import http.client
import io
import json
import pathlib
import tempfile
import threading
import time
import unittest

from scripts import movies_preview


class PreviewTest(unittest.TestCase):
    def setUp(self):
        self.assets = {
            "/": ("text/html", b"synthetic preview"),
            "/snapshot.json": ("application/json", b'{"synthetic":true}'),
        }
        self.server = movies_preview.PreviewServer(self.assets)
        self.thread = threading.Thread(
            target=self.server.serve_forever,
            kwargs={"poll_interval": 0.01},
            daemon=True,
        )
        self.thread.start()
        self.addCleanup(self.close)

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)

    def request(self, method="GET", path="/snapshot.json", headers=None):
        connection = http.client.HTTPConnection(
            "127.0.0.1", self.server.server_port, timeout=2
        )
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.headers), response.read()
        finally:
            connection.close()

    def test_read_only_snapshot_is_local_and_uncached(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        status, headers, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"synthetic": True})
        self.assertEqual(headers["Cache-Control"], "private, no-store")
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertIn("connect-src 'self'", headers["Content-Security-Policy"])

    def test_built_mode_allowlists_only_existing_browser_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            for rel, data in {
                "src/local-movies-view.mjs": "export const synthetic=true;",
                "src/local-movies.css": "body{}",
                "dist/index.html": "<html>synthetic build</html>",
                "dist/assets/index-test.js": "export const synthetic=true;",
                "dist/assets/ignored.env": "synthetic private sentinel",
            }.items():
                path = root / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(data)
            assets = movies_preview.resources(
                root, {"synthetic": True}, built=True
            )
            self.assertIn("/assets/index-test.js", assets)
            self.assertIn("/?movies-local&preview-snapshot", assets)
            self.assertNotIn("/assets/ignored.env", assets)

    def test_public_origin_host_and_cross_site_requests_are_refused(self):
        for headers in [
            {"Origin": "https://agent-parley.ai.studio"},
            {"Host": "example.test"},
            {"Sec-Fetch-Site": "cross-site"},
        ]:
            with self.subTest(headers=headers):
                self.assertEqual(self.request(headers=headers)[0], 403)

    def test_browser_navigation_opens_only_the_document_shell(self):
        headers = {
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Dest": "document",
        }
        self.assertEqual(self.request(path="/", headers=headers)[0], 200)
        self.assertEqual(self.request(headers=headers)[0], 403)

    def test_write_cors_and_arbitrary_file_requests_are_refused(self):
        self.assertEqual(self.request("POST")[0], 405)
        self.assertEqual(self.request("OPTIONS")[0], 405)
        for path in [
            "/.env",
            "/../../etc/passwd",
            "/api/status",
            "/src/App.tsx",
        ]:
            self.assertEqual(self.request(path=path)[0], 404)

    def test_lifetime_expires_and_non_temporary_lifetimes_are_refused(self):
        start = time.monotonic()
        with contextlib.redirect_stdout(io.StringIO()):
            movies_preview.serve(self.assets, minutes=0.001)
        self.assertLess(time.monotonic() - start, 1)
        for minutes in [0, -1, 61, float("nan")]:
            with self.assertRaises(ValueError):
                movies_preview.serve(self.assets, minutes=minutes)


if __name__ == "__main__":
    unittest.main()
