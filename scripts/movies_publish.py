"""Minimize local sources; publication requires explicit invocation and grant.

Dry-run is the default. No native token, prompt, path, title or message crosses
the wire boundary. No server response can become a local command.
"""

import argparse
import csv
import datetime
import hashlib
import hmac
import io
import json
import math
import os
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.request
from collections.abc import Callable

from scripts.movies_snapshot import _read

ENDPOINT = "https://agent-parley.ai.studio/api/movies-observer/snapshot"
FILM = "projects/andre-time-travel"
CLI = "/home/athar/.local/bin/agent-parley"
MAX_BYTES = 32768
STATES = {"completed", "in_progress", "blocked", "pending", "todo"}
PROVIDERS = {
    "claude",
    "codex",
    "gemini",
    "opencode",
    "copilot",
    "amp",
    "unknown",
}


def canonical(value: dict) -> bytes:
    """Encode the unsigned ASCII wire contract deterministically."""
    return json.dumps(
        {k: v for k, v in value.items() if k != "digest"},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def timestamp(now: float) -> str:
    """Return the contract's UTC millisecond timestamp."""
    return (
        datetime.datetime.fromtimestamp(now, datetime.UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def validate_wire(value: dict) -> None:
    """Refuse extra fields, cross-project data and inconsistent observations.

    Args:
        value: Proposed minimized observation.

    Raises:
        ValueError: With content-free diagnostics for any contract failure.
    """

    def exact(obj: dict, fields: str) -> bool:
        """Check a closed object shape."""
        return isinstance(obj, dict) and set(obj) == set(fields.split())

    def identifier(item: str) -> bool:
        """Check a bounded public structural identifier."""
        return isinstance(item, str) and bool(
            re.fullmatch(r"[a-z][a-z0-9_-]{0,38}", item)
        )

    def instant(item: str) -> bool:
        """Check normalized UTC without accepting private text."""
        return (
            isinstance(item, str)
            and bool(
                re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", item)
            )
            and (
                timestamp(datetime.datetime.fromisoformat(item).timestamp())
                == item
            )
        )

    try:
        if not exact(
            value,
            "schema project observedAt sequence coordinator "
            "participants filmRoles productionTasks counts digest",
        ):
            raise ValueError
        if (
            value["schema"] != "movies-online-observation/v1"
            or value["project"] != "Movies_Projects"
            or not instant(value["observedAt"])
        ):
            raise ValueError
        if (
            type(value["sequence"]) is not int
            or not 1 <= value["sequence"] <= 15
        ):
            raise ValueError
        c = value["coordinator"]
        if (
            not exact(c, "state version")
            or c["state"] not in {"ready", "not_running", "unknown"}
            or not (
                c["version"] is None
                or re.fullmatch(r"\d+\.\d+\.\d+", c["version"])
            )
        ):
            raise ValueError
        roles = value["filmRoles"]
        if (
            not isinstance(roles, list)
            or len(roles) > 32
            or not all(identifier(r) for r in roles)
            or len(set(roles)) != len(roles)
        ):
            raise ValueError
        participants = value["participants"]
        if not isinstance(participants, list) or len(participants) > 32:
            raise ValueError
        for p in participants:
            if (
                not exact(p, "id provider state observedAt filmRoleId")
                or not identifier(p["id"])
                or p["provider"] not in PROVIDERS
                or p["state"] not in {"working", "idle", "stopped", "unknown"}
                or not instant(p["observedAt"])
                or p["observedAt"] > value["observedAt"]
                or not (p["filmRoleId"] is None or p["filmRoleId"] in roles)
            ):
                raise ValueError
        if len({p["id"] for p in participants}) != len(participants):
            raise ValueError
        tasks = value["productionTasks"]
        if not isinstance(tasks, list) or len(tasks) > 100:
            raise ValueError
        task_ids = {t["id"] for t in tasks}
        if len(task_ids) != len(tasks):
            raise ValueError
        for t in tasks:
            if (
                not exact(t, "id status ownerRole dependsOn")
                or not re.fullmatch(r"T[0-9]{2,3}", t["id"])
                or t["status"] not in STATES
                or t["ownerRole"] not in roles
                or not isinstance(t["dependsOn"], list)
                or len(t["dependsOn"]) > 100
                or len(set(t["dependsOn"])) != len(t["dependsOn"])
                or any(
                    d == t["id"] or d not in task_ids for d in t["dependsOn"]
                )
            ):
                raise ValueError
        counts = value["counts"]
        if not exact(counts, "chapters assets") or any(
            type(counts[k]) is not int or not 0 <= counts[k] <= ceiling
            for k, ceiling in [("chapters", 100), ("assets", 1000000)]
        ):
            raise ValueError
        if (
            not isinstance(value["digest"], str)
            or not hmac.compare_digest(
                value["digest"], hashlib.sha256(canonical(value)).hexdigest()
            )
            or len(json.dumps(value).encode()) > MAX_BYTES
        ):
            raise ValueError
    except (ValueError, TypeError, KeyError, OverflowError):
        raise ValueError("Publication refused") from None


def collect(
    repo: pathlib.Path,
    *,
    sequence: int,
    now: float,
    native: dict | None = None,
    version: str | None = None,
) -> dict:
    """Project canonical source fields; never publish raw native CLI output.

    Args:
        repo: Canonical Movies root.
        sequence: Pilot-local observation sequence.
        now: Collection time.
        native: Optional installed CLI status envelope, already read locally.
        version: Optional verified installed CLI version.

    Returns:
        Closed minimized observation; absence of native state stays unknown.

    Raises:
        ValueError: If sources are unsafe, inconsistent or changed while read.
    """
    try:
        root = repo.resolve()
        paths = [
            "workspace.json",
            "agents/registry.json",
            FILM + "/manifest.json",
            FILM + "/tasks/board.json",
            FILM + "/asset-registry.csv",
        ]
        raw = {p: _read(root, p) for p in paths}
        workspace = json.loads(raw[paths[0]])
        active = [
            p for p in workspace["projects"] if p["id"] == "andre-time-travel"
        ]
        if (
            workspace["activeFilm"] != "andre-time-travel"
            or len(active) != 1
            or active[0]["root"] != FILM
        ):
            raise ValueError
        roles = [r["id"] for r in json.loads(raw[paths[1]])["roles"]]
        manifest = json.loads(raw[paths[2]])
        tasks = [
            {k: t[k] for k in ("id", "status", "ownerRole", "dependsOn")}
            for t in json.loads(raw[paths[3]])["tasks"]
        ]
        assets = list(csv.DictReader(io.StringIO(raw[paths[4]].decode())))
        if len({r["asset_id"] for r in assets}) != len(assets):
            raise ValueError
        stamp = timestamp(now)
        participants = []
        state = "unknown"
        if (
            native
            and native.get("schema") == "agent-parley/read/v1"
            and native.get("kind") == "status"
        ):
            projects = [
                p
                for p in native.get("projects", [])
                if p.get("root") == str(root)
            ]
            if len(projects) == 1:
                server = native.get("server", {})
                state = (
                    "ready"
                    if server.get("ready") is True
                    else "not_running"
                    if server.get("state") == "not running"
                    else "unknown"
                )
                for p in projects[0].get("participants", []):
                    availability = p.get("availability") or {}
                    observed = availability.get("state")
                    lane_state = (
                        observed
                        if state == "ready"
                        and availability.get("stale") is False
                        and observed in {"working", "idle", "stopped"}
                        else "unknown"
                    )
                    provider = (
                        p.get("provider")
                        if p.get("provider") in PROVIDERS
                        else "unknown"
                    )
                    participants.append(
                        {
                            "id": p["participant"],
                            "provider": provider,
                            "state": lane_state,
                            "observedAt": stamp,
                            "filmRoleId": None,
                        }
                    )
        value = {
            "schema": "movies-online-observation/v1",
            "project": "Movies_Projects",
            "observedAt": stamp,
            "sequence": sequence,
            "coordinator": {"state": state, "version": version},
            "participants": participants,
            "filmRoles": roles,
            "productionTasks": tasks,
            "counts": {
                "chapters": len(manifest["chapters"]),
                "assets": len(assets),
            },
        }
        value["digest"] = hashlib.sha256(canonical(value)).hexdigest()
        validate_wire(value)
        if any(_read(root, p) != source for p, source in raw.items()):
            raise ValueError
        return value
    except (
        ValueError,
        TypeError,
        KeyError,
        OSError,
        csv.Error,
        OverflowError,
        AttributeError,
        IndexError,
    ):
        raise ValueError("Source refused") from None


def read_native(
    repo: pathlib.Path, state_home: pathlib.Path
) -> tuple[dict | None, str | None]:
    """Read the installed status CLI with explicit home; never initialize it."""
    try:
        version = (
            subprocess.run(
                [CLI, "--version"], capture_output=True, timeout=5, check=False
            )
            .stdout.decode()
            .strip()
        )
        result = subprocess.run(
            [
                CLI,
                "--home",
                str(state_home),
                "status",
                "--repo",
                str(repo),
                "--json",
            ],
            capture_output=True,
            timeout=5,
            check=False,
        )
        if result.returncode or len(result.stdout) > 4 * 1024 * 1024:
            return None, None
        return json.loads(result.stdout), version if re.fullmatch(
            r"\d+\.\d+\.\d+", version
        ) else None
    except (OSError, ValueError, subprocess.SubprocessError):
        return None, None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse all redirects, including same-host redirects."""

    def redirect_request(self, *args: object, **kwargs: object) -> None:
        """Leave redirect status terminal rather than resending credentials."""
        return None


def send_https(endpoint: str, body: bytes, credential: str) -> int:
    """Make one TLS-verified PUT; never consume or execute the response body."""
    if endpoint != ENDPOINT or not re.fullmatch(
        r"[A-Za-z0-9_-]{32,128}", credential
    ):
        raise ValueError("Publication refused")
    opener = urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="PUT",
        headers={
            "Authorization": "Bearer " + credential,
            "Content-Type": "application/json",
        },
    )
    try:
        with opener.open(request, timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def publish_once(
    value: dict,
    endpoint: str,
    credential: str,
    *,
    transport: Callable = send_https,
) -> dict:
    """Enforce one endpoint and attempt once; uncertain results are terminal."""
    if endpoint != ENDPOINT or not re.fullmatch(
        r"[A-Za-z0-9_-]{32,128}", credential
    ):
        raise ValueError("Publication refused")
    validate_wire(value)
    body = json.dumps(value, separators=(",", ":"), sort_keys=True).encode()
    try:
        status = transport(endpoint, body, credential)
    except (OSError, ValueError, TimeoutError):
        return {"state": "uncertain", "sequence": value["sequence"]}
    return {
        "state": "published" if status == 204 else "stopped",
        "sequence": value["sequence"],
    }


def run_pilot(
    source: Callable,
    credential: str,
    *,
    expires_at: float,
    max_publishes: int = 15,
    interval: float = 60,
    now: Callable = time.time,
    wait: Callable = time.sleep,
    transport: Callable = send_https,
) -> list[dict]:
    """Run a finite foreground pilot; a refusal or uncertainty stops it."""
    started = now()
    if (
        not started < expires_at <= started + 900
        or type(max_publishes) is not int
        or not 1 <= max_publishes <= 15
        or not math.isfinite(interval)
        or interval < 60
    ):
        raise ValueError("Publication refused")
    results = []
    for sequence in range(1, max_publishes + 1):
        if now() >= expires_at:
            break
        value = source(sequence, now())
        if now() >= expires_at:
            break
        result = publish_once(value, ENDPOINT, credential, transport=transport)
        results.append(result)
        if result["state"] != "published" or sequence == max_publishes:
            break
        delay = min(interval, expires_at - now())
        if delay > 0:
            wait(delay)
    return results


def main() -> int:
    """Default to local dry-run; publication requires a descriptor and expiry."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=pathlib.Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--publish", action="store_true")
    parser.add_argument("--collect-runtime", action="store_true")
    parser.add_argument("--state-home", type=pathlib.Path)
    parser.add_argument("--credential-fd", type=int)
    parser.add_argument("--expires-at")
    parser.add_argument("--endpoint", default=ENDPOINT)
    args = parser.parse_args()
    try:
        if args.collect_runtime and args.state_home is None:
            raise ValueError

        def source(sequence: int, now: float) -> dict:
            """Collect only operator-selected sources for this invocation."""
            native, version = (
                read_native(args.repo, args.state_home)
                if args.collect_runtime
                else (None, None)
            )
            return collect(
                args.repo,
                sequence=sequence,
                now=now,
                native=native,
                version=version,
            )

        if not args.publish:
            print(json.dumps(source(1, time.time()), indent=2))
            return 0
        if (
            args.endpoint != ENDPOINT
            or args.credential_fd is None
            or args.expires_at is None
        ):
            raise ValueError
        expiry = datetime.datetime.fromisoformat(args.expires_at)
        if expiry.utcoffset() != datetime.timedelta(0):
            raise ValueError
        expires = expiry.timestamp()
        current_time = time.time()
        if not current_time < expires <= current_time + 900:
            raise ValueError
        with os.fdopen(os.dup(args.credential_fd), "rb") as stream:
            raw = stream.read(130)
        if len(raw) > 129:
            raise ValueError
        credential = raw.decode("ascii").removesuffix("\n")
        results = run_pilot(source, credential, expires_at=expires)
        print(json.dumps(results))
        return (
            0
            if results and all(r["state"] == "published" for r in results)
            else 2
        )
    except (ValueError, OSError, UnicodeError):
        print('{"state":"refused"}')
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
