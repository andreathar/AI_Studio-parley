"""Exercise exact legacy read/gate helpers against SQLite-derived synthetic packets."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class LegacyContractTests(unittest.TestCase):
    """No production hook entrypoint, producer flag or canonical write is used."""

    @classmethod
    def setUpClass(cls):
        root_value = os.environ.get("MOVIES_CONTRACT_ROOT")
        if not root_value:
            raise RuntimeError("Explicit MOVIES_CONTRACT_ROOT required for contract tests")
        cls.legacy = Path(root_value).resolve(strict=True)
        cls.sources = [
            cls.legacy / "scripts/manage.py",
            cls.legacy / "scripts/shared_media.py",
            cls.legacy / ".claude/hooks/_common.py",
            cls.legacy / ".claude/hooks/zero-face-gate.py",
        ]
        cls.before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in cls.sources}
        cls.common = cls.load("_common", cls.sources[2])
        cls.manage = cls.load("workflow_legacy_manage", cls.sources[0])
        cls.face = cls.load("workflow_legacy_zero_face", cls.sources[3])

    @staticmethod
    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="movies-contract-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        result = subprocess.run(
            ["node", "--import", "tsx", "tests/workflow-legacy-fixture.mjs", str(self.root)],
            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True,
            check=True, timeout=15,
        )
        self.bundle = json.loads(result.stdout)
        self.document = self.bundle["packet"]["document"]

    def test_read_projection_uses_actual_legacy_states_and_dependency_validator(self):
        packet = self.bundle["read"]
        self.manage.check_dependencies(packet["tasks"])
        self.assertTrue(all(t["status"] in self.manage.TASK_STATES for t in packet["tasks"]))
        self.assertEqual(packet["tasks"][0]["id"], "C01")
        self.assertEqual(packet["authority"], "sqlite-cycle")
        self.assertEqual(packet["stateVersion"], self.bundle["snapshot"]["stateVersion"])
        self.assertFalse(packet["creativeApprovalsInherited"])

    def test_exact_handoff_successor_hash_and_zero_face_helpers_accept_complete_receipt(self):
        self.assertEqual(self.common.handoff_problems(self.root, self.root, self.document), [])
        self.assertEqual(self.manage.hash_findings(self.root, self.root, self.document, "sqlite"), [])
        self.assertTrue(self.common.has_successor(self.document))
        clip = self.root / "review/clip.mp4"
        self.assertEqual(self.face.media_files(clip), [clip])
        self.assertTrue(self.face.covered(self.root, self.root, clip, []))
        self.assertEqual(self.document["agentRole"], "qc")
        self.assertFalse((self.root / "agents/handoffs").exists())
        self.assertFalse((self.root / "logs").exists())

    def test_actual_legacy_helpers_refuse_insufficient_or_changed_evidence(self):
        document = {**self.document, "verification": [], "nextActions": []}
        self.assertTrue(self.common.handoff_problems(self.root, self.root, document))
        self.assertFalse(self.common.has_successor(document))
        (self.root / "review/clip.mp4").write_text("changed", encoding="utf-8")
        self.assertTrue(self.common.handoff_problems(self.root, self.root, self.document))
        self.assertTrue(self.manage.hash_findings(self.root, self.root, self.document, "sqlite"))
        (self.root / "review/zero-face-log.json").unlink()
        self.assertFalse(self.face.covered(self.root, self.root, self.root / "review/clip.mp4", []))

    @classmethod
    def tearDownClass(cls):
        after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in cls.sources}
        if after != cls.before:
            raise AssertionError("Legacy contract sources changed during read-only probe")


if __name__ == "__main__":
    unittest.main()
