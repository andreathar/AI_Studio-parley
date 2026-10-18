"""Compare bounded Movies metadata with AI Studio demo source, offline.

This command neither contacts a coordinator nor imports the app server. Output
is a local read-only observation, never a production import or live status.
"""

import argparse
import collections
import csv
import datetime
import hashlib
import io
import json
import pathlib
import re
import sys

MAX_BYTES = 4 * 1024 * 1024
FILM = "projects/andre-time-travel"
MOVIES_FILES = (
    "workspace.json",
    FILM + "/manifest.json",
    FILM + "/tasks/board.json",
    FILM + "/asset-registry.csv",
    "agents/registry.json",
    "sites/movies-demandas/data/production.json",
)
APP_FILES = ("package.json", "src/data/moviesProjectData.ts")


def _read(root: pathlib.Path, rel: str) -> bytes:
    """Read a bounded regular source file, refusing root escape.

    Args:
        root: Explicit source root.
        rel: A fixed allowlisted relative source path.

    Returns:
        Source bytes, without interpreting paths contained in the source.

    Raises:
        ValueError: For unsafe, missing, oversized or unreadable sources.
    """
    try:
        path = (root / rel).resolve(strict=True)
        if not path.is_relative_to(root):
            raise ValueError("Source outside root")
        if not path.is_file():
            raise ValueError("Source must be a regular file")
        with path.open("rb") as stream:
            raw = stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Source exceeds size limit")
        return raw
    except OSError:
        raise ValueError("Missing or unreadable allowlisted source") from None


def _ids(rows: list[dict], key: str = "id") -> list[str]:
    """Validate structural identifiers and refuse ambiguous records.

    Args:
        rows: Records whose identifiers will be projected.
        key: Identifier field.

    Returns:
        Validated identifiers in source order.

    Raises:
        ValueError: For duplicate or invalid identifiers.
    """
    values = [row[key] for row in rows]
    if any(
        not isinstance(v, str)
        or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}", v)
        for v in values
    ):
        raise ValueError("Invalid structural identifier")
    if len(set(values)) != len(values):
        raise ValueError("Duplicate structural identifier")
    return values


def compare(movies_root: pathlib.Path, app_root: pathlib.Path) -> dict:
    """Build a local metadata projection, refusing changed source reads.

    Args:
        movies_root: Canonical Movies root; media is never opened.
        app_root: AI Studio checkout root; app code is never executed.

    Returns:
        Versioned comparison with source hashes and explicit evidence limits.

    Raises:
        ValueError: For unsafe, inconsistent or unsupported source metadata.
    """
    roots = {"movies": movies_root.resolve(), "app": app_root.resolve()}
    sources = {"movies": MOVIES_FILES, "app": APP_FILES}
    raw = {
        (scope, rel): _read(roots[scope], rel)
        for scope, paths in sources.items()
        for rel in paths
    }
    try:
        workspace = json.loads(raw["movies", "workspace.json"])
        active = [
            p
            for p in workspace["projects"]
            if p["id"] == workspace["activeFilm"]
        ]
        if (
            workspace["activeFilm"] != "andre-time-travel"
            or len(active) != 1
            or active[0]["root"] != FILM
        ):
            raise ValueError("Unsupported workspace or project root")
        manifest = json.loads(raw["movies", FILM + "/manifest.json"])
        board = json.loads(raw["movies", FILM + "/tasks/board.json"])
        registry = json.loads(raw["movies", "agents/registry.json"])
        exported = json.loads(raw["movies", MOVIES_FILES[-1]])
        package = json.loads(raw["app", "package.json"])
        tasks = board["tasks"]
        task_ids = _ids(tasks)
        if any(not re.fullmatch(r"T[0-9]{2,}", t) for t in task_ids):
            raise ValueError("Invalid Movies task identifier")
        states = collections.Counter(task["status"] for task in tasks)
        if not set(states) <= {
            "completed",
            "blocked",
            "in_progress",
            "pending",
            "todo",
        }:
            raise ValueError("Invalid task status")
        role_ids = _ids(registry["roles"])
        if any(t["ownerRole"] not in role_ids for t in tasks):
            raise ValueError("Unknown task owner role")
        if any(
            not isinstance(t.get("title", t["id"]), str)
            or not 0 < len(t.get("title", t["id"])) <= 300
            for t in tasks
        ):
            raise ValueError("Invalid task title")
        task_rows = [
            {
                "id": t["id"],
                "title": t.get("title", t["id"]),
                "status": t["status"],
                "ownerRole": t["ownerRole"],
            }
            for t in tasks
        ]
        assets = list(
            csv.DictReader(
                io.StringIO(
                    raw["movies", FILM + "/asset-registry.csv"].decode("utf-8")
                )
            )
        )
        _ids(assets, "asset_id")
        chapter_ids = _ids(manifest["chapters"])
        demo = raw["app", "src/data/moviesProjectData.ts"].decode("utf-8")
        demo_lanes = re.findall(r"\bid:\s*['\"](lane-[\w-]+)['\"]", demo)
        demo_issues = sorted(
            set(re.findall(r"\bid:\s*['\"](#[0-9]+)['\"]", demo))
        )
        version = package["version"]
        if not isinstance(version, str) or not re.fullmatch(
            r"[0-9]+\.[0-9]+\.[0-9]+(?:[-+][\w.-]+)?", version
        ):
            raise ValueError("Invalid app version")
        hashes = {
            rel: hashlib.sha256(raw["movies", rel]).hexdigest()
            for rel in MOVIES_FILES
        }
        exported_sources = exported["sources"]
        mismatches = [
            s["path"]
            for s in exported_sources
            if s["path"] in hashes and s["sha256"] != hashes[s["path"]]
        ]
        checked = sum(s["path"] in hashes for s in exported_sources)
    except (KeyError, TypeError, UnicodeError, json.JSONDecodeError):
        raise ValueError("Invalid allowlisted metadata structure") from None
    for (scope, rel), original in raw.items():
        if _read(roots[scope], rel) != original:
            raise ValueError("Source changed during comparison; retry later")
    return {
        "schema": "movies-ai-studio/offline-comparison/v2",
        "mode": "offline_read_only",
        "observedAt": datetime.datetime.now(datetime.UTC).isoformat(),
        "runtimeCoordinator": None,
        "movies": {
            "projectId": "andre-time-travel",
            "chapterIds": chapter_ids,
            "taskIds": task_ids,
            "tasks": task_rows,
            "taskStates": dict(states),
            "roleIds": role_ids,
            "assetRecords": len(assets),
        },
        "appSource": {
            "packageVersion": version,
            "demoLaneIds": sorted(set(demo_lanes)),
            "demoIssueIds": demo_issues,
            "evidence": "static_checkout_source_not_deployed_runtime",
        },
        "comparison": {
            "commonTaskIds": sorted(set(task_ids) & set(demo_issues)),
            "exportSourceMismatches": sorted(mismatches),
            "checkedExportSources": checked,
            "unverifiedExportSources": len(exported_sources) - checked,
            "runtimeMapping": "unverified_no_coordinator_contact",
        },
        "sources": [
            {
                "scope": scope,
                "path": rel,
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            for (scope, rel), data in raw.items()
        ],
        "limitations": [
            "No deployment revision or coordinator liveness is inferred.",
            "Role definitions do not represent running lanes.",
            "Asset counts do not prove media hashes or approvals.",
            "No production approval, secret or media content is exported.",
            "Export freshness covers only explicitly checked sources.",
        ],
    }


def main() -> int:
    """Print a comparison to stdout with bounded, content-free errors.

    Returns:
        Zero on success, two for refused or invalid source metadata.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--movies-root", type=pathlib.Path, required=True)
    parser.add_argument("--app-root", type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = compare(args.movies_root, args.app_root)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
