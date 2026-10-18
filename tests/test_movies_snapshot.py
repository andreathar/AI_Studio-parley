"""Synthetic contract tests; no production workspace or credentials."""

import collections
import hashlib
import json
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts import movies_snapshot


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.movies = self.root / "movies"
        self.app = self.root / "app"
        self.film = "projects/andre-time-travel"
        self.write(
            self.movies,
            "workspace.json",
            {
                "activeFilm": "andre-time-travel",
                "projects": [{"id": "andre-time-travel", "root": self.film}],
            },
        )
        self.write(
            self.movies,
            self.film + "/manifest.json",
            {
                "chapters": [{"id": "galileo"}],
                "finalMovieVerified": False,
                "privateNotes": "SYNTHETIC_PRIVATE_SENTINEL",
            },
        )
        self.board = {
            "tasks": [
                {"id": "T01", "status": "completed", "ownerRole": "editor"},
                {"id": "T02", "status": "blocked", "ownerRole": "qc"},
            ]
        }
        self.write(self.movies, self.film + "/tasks/board.json", self.board)
        self.write(
            self.movies,
            "agents/registry.json",
            {
                "roles": [{"id": "editor"}, {"id": "qc"}],
                "autostart": False,
            },
        )
        self.write(
            self.movies,
            "sites/movies-demandas/data/production.json",
            {
                "sources": [],
                "provenance": {"repositoryHead": "synthetic"},
            },
        )
        p = self.movies / self.film / "asset-registry.csv"
        p.write_text("asset_id,path_or_provider_id\na1,private/file.mp4\n")
        self.write(self.app, "package.json", {"version": "0.18.0"})
        demo = self.app / "src/data/moviesProjectData.ts"
        demo.parent.mkdir(parents=True)
        demo.write_text(
            "export const moviesProjectLanes = [\n"
            "{ id: 'lane-frontend' },\n];\n"
            "export const moviesProjectIssues = [\n"
            "{ id: '#201' },\n];\n"
        )

    def write(self, root, rel, value):
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(value))

    def snapshot(self):
        return movies_snapshot.compare(self.movies, self.app)

    def test_projects_only_metadata_without_writing_inputs(self):
        before = {
            p: hashlib.sha256(p.read_bytes()).hexdigest()
            for p in self.root.rglob("*")
            if p.is_file()
        }
        result = self.snapshot()
        self.assertEqual(
            result["movies"]["taskStates"], {"completed": 1, "blocked": 1}
        )
        self.assertEqual(result["movies"]["assetRecords"], 1)
        self.assertEqual(result["appSource"]["demoLaneIds"], ["lane-frontend"])
        self.assertEqual(result["comparison"]["commonTaskIds"], [])
        self.assertIsNone(result["runtimeCoordinator"])
        self.assertEqual(
            result["schema"], "movies-ai-studio/offline-comparison/v2"
        )
        self.assertEqual(
            result["movies"]["tasks"][0],
            {
                "id": "T01",
                "title": "T01",
                "status": "completed",
                "ownerRole": "editor",
            },
        )
        self.assertNotIn("SYNTHETIC_PRIVATE_SENTINEL", json.dumps(result))
        self.assertNotIn("private/file.mp4", json.dumps(result))
        self.assertEqual(
            before,
            {
                p: hashlib.sha256(p.read_bytes()).hexdigest()
                for p in self.root.rglob("*")
                if p.is_file()
            },
        )

    def test_symlink_escape_is_refused(self):
        source = self.movies / self.film / "manifest.json"
        outside = self.root / "outside.json"
        source.rename(outside)
        source.symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "outside root"):
            self.snapshot()

    def test_workspace_cannot_redirect_reads(self):
        self.write(
            self.movies,
            "workspace.json",
            {
                "activeFilm": "andre-time-travel",
                "projects": [
                    {"id": "andre-time-travel", "root": "../../outside"}
                ],
            },
        )
        with self.assertRaisesRegex(ValueError, "Unsupported workspace"):
            self.snapshot()

    def test_duplicate_task_ids_are_refused(self):
        self.board["tasks"].append(self.board["tasks"][0])
        self.write(self.movies, self.film + "/tasks/board.json", self.board)
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.snapshot()

    def test_invalid_task_status_is_refused(self):
        self.board["tasks"][0]["status"] = "SYNTHETIC_PRIVATE_SENTINEL"
        self.write(self.movies, self.film + "/tasks/board.json", self.board)
        with self.assertRaisesRegex(ValueError, "Invalid task status"):
            self.snapshot()

    def test_export_hash_comparison_does_not_follow_export_paths(self):
        rel = self.film + "/tasks/board.json"
        self.write(
            self.movies,
            "sites/movies-demandas/data/production.json",
            {
                "sources": [
                    {"path": rel, "sha256": "0" * 64},
                    {"path": "../../secret", "sha256": "0" * 64},
                ],
            },
        )
        result = self.snapshot()["comparison"]
        self.assertEqual(result["exportSourceMismatches"], [rel])
        self.assertEqual(result["unverifiedExportSources"], 1)

    def test_oversize_input_is_refused(self):
        p = self.movies / self.film / "manifest.json"
        p.write_bytes(b" " * (movies_snapshot.MAX_BYTES + 1))
        with self.assertRaisesRegex(ValueError, "size limit"):
            self.snapshot()

    def test_missing_source_error_does_not_expose_absolute_path(self):
        (self.movies / self.film / "manifest.json").unlink()
        with self.assertRaises(ValueError) as caught:
            self.snapshot()
        self.assertNotIn(str(self.root), str(caught.exception))

    def test_source_drift_is_refused(self):
        original_read = movies_snapshot._read
        calls = collections.Counter()

        def changing_read(root, rel):
            calls[root, rel] += 1
            raw = original_read(root, rel)
            return raw + b" " if calls[root, rel] > 1 else raw

        with mock.patch.object(movies_snapshot, "_read", changing_read):
            with self.assertRaisesRegex(ValueError, "changed during"):
                self.snapshot()

    def test_duplicate_asset_ids_are_refused(self):
        p = self.movies / self.film / "asset-registry.csv"
        p.write_text("asset_id,path_or_provider_id\na1,a.mp4\na1,b.mp4\n")
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.snapshot()

    def test_unknown_task_owner_does_not_become_a_lane(self):
        self.board["tasks"][0]["ownerRole"] = "lane-unassigned"
        self.write(self.movies, self.film + "/tasks/board.json", self.board)
        with self.assertRaisesRegex(ValueError, "Unknown task owner"):
            self.snapshot()


if __name__ == "__main__":
    unittest.main()
