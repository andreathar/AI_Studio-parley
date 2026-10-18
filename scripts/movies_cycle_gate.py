"""Evaluate pinned legacy gate helpers without running hooks or writing logs."""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from typing import Any


def load_module(name: str, path: Path) -> Any:
    """Load one already hash-verified local helper without invoking main."""
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ValueError("Helper unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def evaluate(payload: dict[str, Any]) -> dict[str, Any]:
    """Evaluate exactly one receipt projection through unchanged legacy helpers."""
    contracts = payload["contracts"]
    root = Path(contracts["root"]).resolve(strict=True)
    for relative, expected in contracts["hashes"].items():
        source = root / relative
        if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise ValueError("Contract changed")
    common = load_module("_common", root / ".claude/hooks/_common.py")
    face = load_module("movies_cycle_zero_face", root / ".claude/hooks/zero-face-gate.py")
    packet = payload["packet"]
    document = packet["document"]
    evidence = Path(payload["evidenceRoot"]).resolve(strict=True)
    gate = payload["gate"]
    problems: list[str] = []
    if gate == "handoff-check.py":
        problems.extend(common.handoff_problems(evidence, evidence, document))
    elif gate == "successor-check.py":
        if not common.has_successor(document):
            problems.append("Explicit successor or stage closure required")
    elif gate == "zero-face-gate.py":
        if document["agentRole"] in face.REVIEW_ROLES:
            logs = [evidence / item["log"] for item in document["zeroFaceLogs"]]
            for claim in document["claims"]:
                for media in face.media_files(evidence / claim["evidence"]):
                    if not face.covered(evidence, evidence, media, logs):
                        problems.append("Zero-face evidence missing")
    else:
        raise ValueError("Unsupported gate")
    return {"decision": "deny" if problems else "allow", "problems": problems}


def main() -> int:
    """Read one bounded trusted-host packet and emit only a derived decision."""
    try:
        source = sys.stdin.read(65537)
        if len(source) > 65536:
            raise ValueError("Packet too large")
        result = evaluate(json.loads(source))
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError, TypeError, ImportError):
        print(json.dumps({"decision": "deny", "problems": ["Gate verification refused"]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
