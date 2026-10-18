"""Synthetic source and outbound-boundary tests; no Movies data or HTTP."""

import io
import json
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts import movies_publish

NOW = 1792299600.0


class PublisherTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        sources = {
            "workspace.json": {
                "activeFilm": "andre-time-travel",
                "projects": [
                    {
                        "id": "andre-time-travel",
                        "root": "projects/andre-time-travel",
                    }
                ],
            },
            "agents/registry.json": {"roles": [{"id": "editor"}, {"id": "qc"}]},
            "projects/andre-time-travel/manifest.json": {
                "chapters": [{"id": "G"}],
                "private": "PRIVATE_SENTINEL",
            },
            "projects/andre-time-travel/tasks/board.json": {
                "tasks": [
                    {
                        "id": "T01",
                        "title": "PRIVATE_SENTINEL",
                        "status": "completed",
                        "ownerRole": "editor",
                        "dependsOn": [],
                    },
                    {
                        "id": "T02",
                        "blocker": "PRIVATE_SENTINEL",
                        "status": "blocked",
                        "ownerRole": "qc",
                        "dependsOn": ["T01"],
                    },
                ]
            },
        }
        for path, value in sources.items():
            p = self.root / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(value))
        (
            self.root / "projects/andre-time-travel/asset-registry.csv"
        ).write_text(
            "asset_id,path_or_provider_id\na1,/private/PRIVATE_SENTINEL.mp4\n"
        )

    def value(self):
        native = {
            "schema": "agent-parley/read/v1",
            "kind": "status",
            "server": {"ready": False, "state": "not running"},
            "projects": [
                {
                    "root": str(self.root),
                    "participants": [
                        {
                            "participant": "codex",
                            "provider": "codex",
                            "availability": {
                                "state": "working",
                                "stale": False,
                            },
                            "credential": "PRIVATE_SENTINEL",
                            "branch": "/private/branch",
                        }
                    ],
                }
            ],
        }
        return movies_publish.collect(
            self.root, sequence=1, now=NOW, native=native, version="0.18.2"
        )

    def test_real_source_contract_is_minimized_without_seeds_or_private_fields(
        self,
    ):
        value = self.value()
        self.assertEqual(value["coordinator"]["state"], "not_running")
        self.assertEqual(value["participants"][0]["id"], "codex")
        self.assertIsNone(value["participants"][0]["filmRoleId"])
        self.assertEqual(value["productionTasks"][1]["status"], "blocked")
        self.assertEqual(value["counts"], {"chapters": 1, "assets": 1})
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(value))
        self.assertNotIn(str(self.root), json.dumps(value))
        self.assertNotIn("lane-frontend", json.dumps(value))

    def test_invalid_or_escaped_sources_fail_before_transport(self):
        p = self.root / "projects/andre-time-travel/tasks/board.json"
        p.unlink()
        p.symlink_to("/etc/passwd")
        with self.assertRaisesRegex(ValueError, "Source refused"):
            self.value()

    def test_unknown_and_foreign_native_state_never_create_fake_participants(
        self,
    ):
        value = movies_publish.collect(
            self.root,
            sequence=1,
            now=NOW,
            native={
                "schema": "agent-parley/read/v1",
                "kind": "status",
                "server": {"ready": True, "state": "ready"},
                "projects": [
                    {
                        "root": "/other/project",
                        "participants": [{"participant": "foreign"}],
                    }
                ],
            },
        )
        self.assertEqual(value["participants"], [])
        self.assertEqual(value["coordinator"]["state"], "unknown")

    def test_rejects_noncanonical_endpoint_and_excluded_fields_without_sending(
        self,
    ):
        calls = []

        def transport(*args):
            calls.append(args)
            return 204

        for endpoint in [
            "https://evil.invalid",
            "http://agent-parley.ai.studio/api/movies-observer/snapshot",
            "https://agent-parley.ai.studio/api/mcp",
            "https://agent-parley.ai.studio/api/movies-observer/snapshot?token=secret",
        ]:
            with self.assertRaisesRegex(ValueError, "Publication refused"):
                movies_publish.publish_once(
                    self.value(),
                    endpoint,
                    "synthetic-writer-credential-00000000",
                    transport=transport,
                )
        bad = self.value()
        bad["private"] = "PRIVATE_SENTINEL"
        with self.assertRaisesRegex(ValueError, "Publication refused"):
            movies_publish.publish_once(
                bad,
                movies_publish.ENDPOINT,
                "synthetic-writer-credential-00000000",
                transport=transport,
            )
        self.assertEqual(calls, [])

    def test_uncertain_failure_or_remote_reply_stops_without_retries_or_commands(
        self,
    ):
        calls = []

        def fail(*args):
            calls.append(args)
            raise OSError(
                "PRIVATE_SENTINEL synthetic-writer-credential-00000000"
            )

        result = movies_publish.publish_once(
            self.value(),
            movies_publish.ENDPOINT,
            "synthetic-writer-credential-00000000",
            transport=fail,
        )
        self.assertEqual(result, {"state": "uncertain", "sequence": 1})
        self.assertEqual(len(calls), 1)
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(result))
        for status in [302, 401, 403, 409, 429, 500]:
            result = movies_publish.publish_once(
                self.value(),
                movies_publish.ENDPOINT,
                "synthetic-writer-credential-00000000",
                transport=lambda *args: status,
            )
            self.assertEqual(result["state"], "stopped")

    def test_finite_pilot_caps_publications_and_stops_on_first_uncertainty(
        self,
    ):
        clock = [NOW]
        calls = []

        def source(sequence, now):
            value = movies_publish.collect(
                self.root, sequence=sequence, now=now
            )
            return value

        def send(endpoint, body, credential):
            calls.append(json.loads(body))
            return 204

        def wait(delay):
            clock[0] += delay

        results = movies_publish.run_pilot(
            source,
            "synthetic-writer-credential-00000000",
            expires_at=NOW + 900,
            now=lambda: clock[0],
            wait=wait,
            transport=send,
        )
        self.assertEqual(len(results), 15)
        self.assertEqual([r["sequence"] for r in calls], list(range(1, 16)))
        self.assertEqual(clock[0], NOW + 840)
        for invalid in [0, 16]:
            with self.assertRaisesRegex(ValueError, "Publication refused"):
                movies_publish.run_pilot(
                    source,
                    "synthetic-writer-credential-00000000",
                    expires_at=clock[0] + 900,
                    max_publishes=invalid,
                    now=lambda: clock[0],
                    wait=wait,
                    transport=send,
                )

    def test_source_size_and_schema_reject_private_nested_fields(self):
        value = self.value()
        value["participants"][0]["token"] = "PRIVATE_SENTINEL"
        with self.assertRaisesRegex(ValueError, "Publication refused"):
            movies_publish.validate_wire(value)
        p = self.root / "projects/andre-time-travel/tasks/board.json"
        p.write_bytes(b"x" * (4 * 1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, "Source refused"):
            self.value()

    def test_network_leaf_refuses_foreign_destination_and_never_follows_redirect(
        self,
    ):
        with mock.patch(
            "urllib.request.build_opener",
            side_effect=AssertionError("network must not open"),
        ):
            with self.assertRaisesRegex(ValueError, "Publication refused"):
                movies_publish.send_https(
                    "https://evil.invalid",
                    b"{}",
                    "synthetic-writer-credential-00000000",
                )
        self.assertIsNone(
            movies_publish.NoRedirect().redirect_request(
                None, None, 302, "redirect", {}, "https://evil.invalid"
            )
        )

    def test_cli_refuses_naive_deadline_before_reading_any_credential(self):
        args = [
            "movies_publish",
            "--repo",
            str(self.root),
            "--publish",
            "--expires-at",
            "2026-10-18T05:00:00",
            "--credential-fd",
            "99",
        ]
        with (
            mock.patch("sys.argv", args),
            mock.patch(
                "os.dup",
                side_effect=AssertionError("must not read credentials"),
            ),
        ):
            with mock.patch("sys.stdout", new=io.StringIO()):
                self.assertEqual(movies_publish.main(), 2)


if __name__ == "__main__":
    unittest.main()
