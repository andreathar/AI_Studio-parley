"""Local-session contracts over synthetic files and disposable loopback."""

import http.client
import json
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock

from scripts import movies_local


class LocalSessionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.assets = {"/": ("text/html", b"synthetic shell")}
        self.calls = []

        def collect():
            self.calls.append(True)
            return {"synthetic": len(self.calls)}

        self.clock = [0.0]
        self.cache = movies_local.SnapshotCache(
            collect, now=lambda: self.clock[0]
        )
        self.server = movies_local.LocalServer(self.assets, self.cache, port=0)
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

    def request(self, path, method="GET", headers=None):
        c = http.client.HTTPConnection(
            "127.0.0.1", self.server.server_port, timeout=2
        )
        try:
            c.request(method, path, headers=headers or {})
            r = c.getresponse()
            return r.status, dict(r.headers), r.read()
        finally:
            c.close()

    def test_refresh_is_read_only_cached_and_not_a_timed_preview(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        first = self.request("/snapshot.json")
        self.assertEqual(first[0], 200)
        self.assertEqual(json.loads(first[2]), {"synthetic": 1})
        self.request("/snapshot.json")
        self.assertEqual(len(self.calls), 1)
        self.clock[0] = 11
        self.assertEqual(
            json.loads(self.request("/snapshot.json")[2]), {"synthetic": 2}
        )
        self.assertEqual(first[1]["Cache-Control"], "private, no-store")
        self.assertEqual(self.request("/__local/movies-session")[0], 200)

    def test_foreign_requests_and_all_mutations_are_refused_before_collect(
        self,
    ):
        self.assertEqual(
            self.request(
                "/snapshot.json", headers={"Origin": "https://evil.invalid"}
            )[0],
            403,
        )
        self.assertEqual(
            self.request("/snapshot.json", headers={"Host": "evil.invalid"})[0],
            403,
        )
        self.assertEqual(self.calls, [])
        for path in ["/api/mcp", "/api/cli", "/.env", "/../../etc/passwd"]:
            self.assertEqual(self.request(path)[0], 404)
        self.assertEqual(self.request("/snapshot.json", method="POST")[0], 405)
        self.assertEqual(
            self.request("/snapshot.json", method="OPTIONS")[0], 405
        )

    def test_failed_refresh_does_not_return_old_data_as_current_or_log_private_input(
        self,
    ):
        self.cache.collect = lambda: (_ for _ in ()).throw(
            ValueError("PRIVATE_SENTINEL")
        )
        response = self.request("/snapshot.json")
        self.assertEqual(response[0], 503)
        self.assertNotIn(b"PRIVATE_SENTINEL", response[2])

    def test_stop_refuses_foreign_pid_before_any_signal(self):
        foreign = {
            "pid": 99999999,
            "startTicks": "foreign",
            "appRoot": str(self.root),
            "port": 5184,
        }
        with mock.patch(
            "os.killpg", side_effect=AssertionError("must not signal")
        ):
            self.assertFalse(movies_local.owned_process(foreign, self.root))

    def test_launcher_reuses_owned_process_and_stops_only_that_session(self):
        source = pathlib.Path(movies_local.__file__).resolve().parents[1]
        app = self.root / "isolated-app"
        for name in [
            "scripts/movies_local.py",
            "scripts/movies_preview.py",
            "scripts/movies_publish.py",
            "scripts/movies_snapshot.py",
            "src/local-movies-view.mjs",
            "src/local-movies.css",
            "src/shared/moviesObservation.mjs",
        ]:
            target = app / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / name, target)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        args = [sys.executable, "-B", "-m", "scripts.movies_local"]
        options = [
            "--movies-root",
            str(self.root),
            "--state-home",
            str(self.root / "native"),
            "--port",
            str(port),
        ]

        def run(action):
            p = subprocess.run(
                args + [action] + options,
                cwd=app,
                capture_output=True,
                text=True,
                timeout=8,
            )
            self.assertEqual(p.returncode, 0, p.stdout)
            return json.loads(p.stdout)

        try:
            self.assertTrue(run("start")["ready"])
            first = json.loads((app / ".movies-local/session.json").read_text())
            self.assertTrue(run("start")["reused"])
            self.assertEqual(
                json.loads((app / ".movies-local/session.json").read_text())[
                    "pid"
                ],
                first["pid"],
            )
            self.assertTrue(run("status")["running"])
            self.assertTrue(run("stop")["stopped"])
            self.assertFalse(run("status")["running"])
        finally:
            subprocess.run(
                args + ["stop"] + options,
                cwd=app,
                capture_output=True,
                timeout=5,
            )


if __name__ == "__main__":
    unittest.main()
