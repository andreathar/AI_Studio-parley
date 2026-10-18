"""Owned local read-only Movies UI; no expiry, OS service or agent dispatch."""

import argparse
import fcntl
import http.client
import http.server
import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import time
from collections.abc import Callable

from scripts import movies_preview, movies_publish, movies_snapshot

PORT = 5184
BOOTSTRAP = b"""import {mountLocalMoviesView} from '/local-movies-view.mjs';
const refresh=async()=>{const r=await fetch('/snapshot.json',{cache:'no-store'});
 if(!r.ok)throw Error('local read unavailable');return await r.json();};
const root=document.getElementById('root');
try{mountLocalMoviesView(root,await refresh(),{refresh});}
catch{root.textContent=
 'Leitura local indisponivel. Recarregue apos verificar local:status.';}
"""


class SnapshotCache:
    """Throttle local reads without turning failed observations into success."""

    def __init__(
        self, collect: Callable, now: Callable = time.monotonic
    ) -> None:
        """Retain only one in-memory observation and its read outcome."""
        self.collect = collect
        self.now = now
        self.at = -float("inf")
        self.value = None
        self.failed = False

    def read(self) -> dict:
        """Read at most once per ten seconds; failure stays unavailable."""
        if self.now() - self.at >= 10:
            self.at = self.now()
            try:
                self.value = self.collect()
                self.failed = False
            except Exception:
                self.failed = True
        if self.failed or self.value is None:
            raise ValueError("Local read unavailable")
        return self.value


def local_snapshot(
    root: pathlib.Path, app: pathlib.Path, state_home: pathlib.Path
) -> dict:
    """Read canonical metadata and the existing coordinator, never its token."""
    value = movies_snapshot.compare(root, app)
    native, version = movies_publish.read_native(root, state_home)
    runtime = movies_publish.collect(
        root, sequence=1, now=time.time(), native=native, version=version
    )
    tasks = {
        t["id"]: (t["status"], t["ownerRole"]) for t in value["movies"]["tasks"]
    }
    if tasks != {
        t["id"]: (t["status"], t["ownerRole"])
        for t in runtime["productionTasks"]
    }:
        raise ValueError("Source changed during local reading")
    stale = []
    if native:
        projects = [
            p
            for p in native.get("projects", [])
            if p.get("root") == str(root.resolve())
        ]
        if len(projects) == 1:
            registered = {p["id"] for p in runtime["participants"]}
            stale = [
                p["participant"]
                for p in projects[0].get("participants", [])
                if p.get("participant") in registered
                and (p.get("availability") or {}).get("stale") is True
            ]
    value["schema"] = "movies-ai-studio/local-session/v1"
    value["mode"] = "local_read_only"
    value["runtimeCoordinator"] = runtime
    value["runtimeStaleIds"] = stale
    return value


class LocalServer(http.server.HTTPServer):
    """Loopback UI only; the existing native coordinator is not replaced."""

    def __init__(self, assets: dict, cache: SnapshotCache, port: int) -> None:
        """Bind one local port and retain allowlisted assets in memory."""
        self.assets = assets
        self.cache = cache
        super().__init__(("127.0.0.1", port), LocalHandler)
        self.timeout = 0.5

    def get_request(self) -> tuple[socket.socket, tuple]:
        """Bound incomplete local requests."""
        connection, address = super().get_request()
        connection.settimeout(1)
        return connection, address

    def handle_error(
        self, request: socket.socket, client_address: tuple
    ) -> None:
        """Keep source paths and request content out of the local log."""
        sys.stderr.write("Local request failed.\n")


class LocalHandler(http.server.BaseHTTPRequestHandler):
    """Serve fixed UI/reading paths; reject public origins and every write."""

    def log_message(self, format: str, *args: object) -> None:
        """Do not print request metadata or private source content."""

    def do_GET(self) -> None:
        """Validate locality before triggering any canonical or CLI reading."""
        authority = f"127.0.0.1:{self.server.server_port}"
        origin = f"http://{authority}"
        document = (
            self.path == "/"
            and self.headers.get("Sec-Fetch-Mode") == "navigate"
            and self.headers.get("Sec-Fetch-Dest") == "document"
            and "Origin" not in self.headers
        )
        if (
            self.client_address[0] != "127.0.0.1"
            or self.headers.get("Host") != authority
            or self.headers.get("Origin", origin) != origin
            or (
                self.headers.get("Sec-Fetch-Site", "none")
                not in ("same-origin", "none")
                and not document
            )
        ):
            self.send_error(403)
            return
        if self.path == "/__local/movies-session":
            mime, body = (
                "application/json",
                json.dumps(
                    {
                        "application": "movies-local-session",
                        "mode": "read_only",
                        "pid": os.getpid(),
                        "ready": True,
                    }
                ).encode(),
            )
        elif self.path == "/snapshot.json":
            try:
                mime, body = (
                    "application/json",
                    json.dumps(self.server.cache.read()).encode(),
                )
            except Exception:
                self.send_response(503)
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(b'{"state":"local_read_unavailable"}')
                return
        elif self.path in self.server.assets:
            mime, body = self.server.assets[self.path]
        else:
            self.send_error(404)
            return
        self.send_response(200)
        for key, val in {
            "Content-Type": mime,
            "Content-Length": str(len(body)),
            "Cache-Control": "private, no-store",
            "Content-Security-Policy": movies_preview.CSP,
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Referrer-Policy": "no-referrer",
        }.items():
            self.send_header(key, val)
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        """No mutation or dispatch API exists in this process."""
        self.send_error(405)

    def do_PUT(self) -> None:
        """No ingest API or credential grant exists here."""
        self.send_error(405)

    def do_DELETE(self) -> None:
        """Refuse web stop requests; only the owned local CLI may stop."""
        self.send_error(405)

    def do_OPTIONS(self) -> None:
        """Never grant cross-origin access."""
        self.send_error(405)


def process_ticks(pid: int) -> str | None:
    """Read Linux process identity without trusting PID reuse."""
    try:
        fields = (
            pathlib.Path(f"/proc/{pid}/stat")
            .read_text()
            .rsplit(") ", 1)[1]
            .split()
        )
        return None if fields[0] == "Z" else fields[19]
    except (OSError, IndexError):
        return None


def owned_process(record: dict, app: pathlib.Path) -> bool:
    """Confirm start identity, user, cwd and this exact launcher module."""
    try:
        pid = record["pid"]
        if type(pid) is not int or pid <= 1 or record["appRoot"] != str(app):
            return False
        proc = pathlib.Path(f"/proc/{pid}")
        command = (proc / "cmdline").read_bytes().split(b"\0")
        return (
            proc.stat().st_uid == os.getuid()
            and process_ticks(pid) == record["startTicks"]
            and (proc / "cwd").resolve() == app
            and b"scripts.movies_local" in command
            and b"serve" in command
            and os.getpgid(pid) == pid
            and os.getsid(pid) == pid
        )
    except (OSError, KeyError, TypeError):
        return False


def ready(port: int, pid: int) -> bool:
    """Confirm that the expected local child owns the known UI endpoint."""
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
    try:
        connection.request("GET", "/__local/movies-session")
        response = connection.getresponse()
        value = json.loads(response.read(4096))
        return response.status == 200 and value == {
            "application": "movies-local-session",
            "mode": "read_only",
            "pid": pid,
            "ready": True,
        }
    except (OSError, ValueError):
        return False
    finally:
        connection.close()


def serve(
    app: pathlib.Path, movies: pathlib.Path, home: pathlib.Path, port: int
) -> None:
    """Run until stopped; no timer, boot registration or native service start."""
    assets = {
        "/": ("text/html; charset=utf-8", movies_preview.HTML),
        "/bootstrap.mjs": ("text/javascript", BOOTSTRAP),
    }
    for url, rel, mime in [
        (
            "/local-movies-view.mjs",
            "src/local-movies-view.mjs",
            "text/javascript",
        ),
        ("/local-movies.css", "src/local-movies.css", "text/css"),
        (
            "/shared/moviesObservation.mjs",
            "src/shared/moviesObservation.mjs",
            "text/javascript",
        ),
    ]:
        assets[url] = (mime, movies_snapshot._read(app, rel))
    cache = SnapshotCache(lambda: local_snapshot(movies, app, home))
    with LocalServer(assets, cache, port) as server:
        try:
            server.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:
            pass


def main() -> int:
    """Manage one owned, loopback-only session; never stop another frontend."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["start", "status", "stop", "serve"])
    parser.add_argument(
        "--movies-root",
        type=pathlib.Path,
        default=pathlib.Path("/mnt/data/Projects_SSD/Movies_Projects"),
    )
    parser.add_argument(
        "--state-home",
        type=pathlib.Path,
        default=pathlib.Path(
            os.environ.get(
                "AGENT_PARLEY_HOME",
                str(pathlib.Path.home() / ".local/state/agent-parley"),
            )
        ),
    )
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()
    app = pathlib.Path(__file__).resolve().parents[1]
    movies, home = args.movies_root.resolve(), args.state_home.resolve()
    try:
        if not 1 <= args.port <= 65535:
            raise ValueError
        if args.action == "serve":
            serve(app, movies, home, args.port)
            return 0
        runtime = app / ".movies-local"
        if runtime.is_symlink():
            raise ValueError
        runtime.mkdir(mode=0o700, exist_ok=True)
        record_path = runtime / "session.json"
        if record_path.is_symlink():
            raise ValueError
        descriptor = os.open(
            runtime / "session.lock",
            os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW,
            0o600,
        )
        with os.fdopen(descriptor, "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            record = (
                json.loads(record_path.read_text())
                if record_path.exists()
                else None
            )
            live = bool(record and owned_process(record, app))
            if args.action == "status":
                print(
                    json.dumps(
                        {
                            "running": live,
                            "ready": live
                            and ready(record["port"], record["pid"]),
                            "url": f"http://127.0.0.1:{record['port']}/"
                            if live
                            else None,
                        }
                    )
                )
                return 0
            if args.action == "stop":
                if not live:
                    print('{"running":false,"stopped":false}')
                    return 0
                os.killpg(record["pid"], signal.SIGTERM)
                for _ in range(60):
                    if not owned_process(record, app):
                        record_path.unlink()
                        print('{"running":false,"stopped":true}')
                        return 0
                    time.sleep(0.05)
                raise ValueError
            if live:
                if (
                    record.get("moviesRoot") != str(movies)
                    or record.get("stateHome") != str(home)
                    or record["port"] != args.port
                ):
                    raise ValueError
                if not ready(record["port"], record["pid"]):
                    raise ValueError
                print(
                    json.dumps(
                        {
                            "running": True,
                            "reused": True,
                            "url": f"http://127.0.0.1:{record['port']}/",
                        }
                    )
                )
                return 0
            if record and process_ticks(record.get("pid", -1)) is not None:
                raise ValueError
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", args.port))
            output = os.open(
                runtime / "session.log",
                os.O_CREAT | os.O_APPEND | os.O_WRONLY | os.O_NOFOLLOW,
                0o600,
            )
            try:
                child = subprocess.Popen(
                    [
                        sys.executable,
                        "-B",
                        "-m",
                        "scripts.movies_local",
                        "serve",
                        "--movies-root",
                        str(movies),
                        "--state-home",
                        str(home),
                        "--port",
                        str(args.port),
                    ],
                    cwd=app,
                    stdin=subprocess.DEVNULL,
                    stdout=output,
                    stderr=output,
                    start_new_session=True,
                )
            finally:
                os.close(output)
            record = {
                "pid": child.pid,
                "startTicks": process_ticks(child.pid),
                "appRoot": str(app),
                "port": args.port,
                "moviesRoot": str(movies),
                "stateHome": str(home),
            }
            descriptor = os.open(
                record_path,
                os.O_CREAT | os.O_TRUNC | os.O_WRONLY | os.O_NOFOLLOW,
                0o600,
            )
            with os.fdopen(descriptor, "w") as stream:
                json.dump(record, stream)
            for _ in range(40):
                if owned_process(record, app) and ready(args.port, child.pid):
                    print(
                        json.dumps(
                            {
                                "running": True,
                                "ready": True,
                                "url": f"http://127.0.0.1:{args.port}/",
                            }
                        )
                    )
                    return 0
                if child.poll() is not None:
                    raise ValueError
                time.sleep(0.05)
            raise ValueError
    except Exception:
        print('{"state":"local_session_refused"}')
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
