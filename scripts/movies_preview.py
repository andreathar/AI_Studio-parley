"""Serve the shared Movies view briefly on numeric loopback, without Express.

No credential, persistent service, CORS permission, upload or write API is
created. The snapshot and three frontend resources are held in memory.
"""

import argparse
import http.server
import json
import pathlib
import socket
import time
from typing import cast

from scripts import movies_snapshot

HTML = b"""<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Agent Parley - Movies local</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/local-movies.css"></head>
<body style="margin:0"><div id="root"></div>
<script type="module" src="/bootstrap.mjs"></script></body></html>"""
BOOTSTRAP = b"""import {mountLocalMoviesView} from '/local-movies-view.mjs';
const root = document.getElementById('root');
try {
 const response = await fetch('/snapshot.json', {cache:'no-store'});
 if (!response.ok) throw Error('snapshot');
 mountLocalMoviesView(root, await response.json());
} catch {root.textContent = 'Preview indisponivel; gere um novo snapshot.';}
"""
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "connect-src 'self'; img-src data:; base-uri 'none'; "
    "form-action 'none'; frame-ancestors 'none'"
)


def resources(
    app_root: pathlib.Path, snapshot: dict, *, built: bool = False
) -> dict:
    """Load only the shared frontend resources and provided snapshot.

    Args:
        app_root: Checkout containing the shared browser module and CSS.
        snapshot: Already projected metadata, without media or approvals.
        built: Serve the existing Vite build instead of the module shell.

    Returns:
        Fixed URL allowlist with content types and bytes.
    """
    assets = {
        "/": ("text/html; charset=utf-8", HTML),
        "/bootstrap.mjs": ("text/javascript", BOOTSTRAP),
        "/snapshot.json": (
            "application/json",
            json.dumps(snapshot).encode("utf-8"),
        ),
        "/local-movies-view.mjs": (
            "text/javascript",
            movies_snapshot._read(
                app_root.resolve(), "src/local-movies-view.mjs"
            ),
        ),
        "/local-movies.css": (
            "text/css",
            movies_snapshot._read(app_root.resolve(), "src/local-movies.css"),
        ),
    }
    if built:
        assets["/"] = (
            "text/html; charset=utf-8",
            movies_snapshot._read(app_root.resolve(), "dist/index.html"),
        )
        assets["/?movies-local&preview-snapshot"] = assets["/"]
        types = {
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
        }
        for file in (app_root / "dist/assets").iterdir():
            if file.suffix in types and file.is_file():
                relative = file.relative_to(app_root).as_posix()
                assets["/assets/" + file.name] = (
                    types[file.suffix],
                    movies_snapshot._read(app_root.resolve(), relative),
                )
    return assets


class PreviewServer(http.server.HTTPServer):
    """Single-process, bounded-lifetime, numeric-loopback resource server."""

    def __init__(self, assets: dict, port: int = 0) -> None:
        """Bind a free loopback port and retain an in-memory allowlist."""
        self.assets = assets
        super().__init__(("127.0.0.1", port), PreviewHandler)
        self.timeout = 0.25

    def get_request(self) -> tuple[socket.socket, tuple]:
        """Bound individual connection reads to preserve the expiry."""
        connection, address = super().get_request()
        connection.settimeout(1.0)
        return connection, address


class PreviewHandler(http.server.BaseHTTPRequestHandler):
    """Refuse nonlocal requests, writes and paths outside the allowlist."""

    def log_message(self, format: str, *args: object) -> None:
        """Avoid logging source content, request URLs or headers."""

    def do_GET(self) -> None:
        """Serve one exact path after same-origin and loopback checks."""
        server = cast(PreviewServer, self.server)
        authority = f"127.0.0.1:{server.server_port}"
        origin = f"http://{authority}"
        document_navigation = (
            self.path in ("/", "/?movies-local&preview-snapshot")
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
                and not document_navigation
            )
        ):
            self.send_error(403)
            return
        asset = server.assets.get(self.path)
        if asset is None:
            self.send_error(404)
            return
        mime, body = asset
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        """Refuse every write; this preview has no mutation handlers."""
        self.send_error(405)

    def do_OPTIONS(self) -> None:
        """Refuse CORS negotiation rather than granting cross-origin access."""
        self.send_error(405)


def serve(
    assets: dict,
    *,
    minutes: float = 10,
    port: int = 0,
    entry_path: str = "/",
) -> None:
    """Serve projected metadata until expiry or Ctrl-C, then close the socket.

    Args:
        assets: Fixed resource allowlist.
        minutes: Lifetime, between 0 and 60 minutes.
        port: Numeric loopback port; zero selects an available port.
        entry_path: Fixed module or compiled local-mode entry URL.

    Raises:
        ValueError: If lifetime is outside the temporary preview contract.
    """
    if not 0 < minutes <= 60:
        raise ValueError("Preview lifetime must be 0 < minutes <= 60")
    if entry_path not in ("/", "/?movies-local&preview-snapshot"):
        raise ValueError("Unsupported local preview entry")
    deadline = time.monotonic() + minutes * 60
    with PreviewServer(assets, port) as server:
        print(
            f"Movies local: http://127.0.0.1:{server.server_port}{entry_path}",
            flush=True,
        )
        print(
            f"Read-only; expires after {minutes:g} minutes; Ctrl-C closes.",
            flush=True,
        )
        try:
            while time.monotonic() < deadline:
                server.handle_request()
        except KeyboardInterrupt:
            pass


def main() -> None:
    """Project canonical metadata and start one temporary local preview."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--movies-root", required=True, type=pathlib.Path)
    parser.add_argument("--app-root", required=True, type=pathlib.Path)
    parser.add_argument("--minutes", type=float, default=10)
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--built", action="store_true")
    args = parser.parse_args()
    try:
        if not 0 < args.minutes <= 60:
            raise ValueError("Preview lifetime must be 0 < minutes <= 60")
        snapshot = movies_snapshot.compare(args.movies_root, args.app_root)
        serve(
            resources(args.app_root, snapshot, built=args.built),
            minutes=args.minutes,
            port=args.port,
            entry_path="/?movies-local&preview-snapshot" if args.built else "/",
        )
    except (OSError, ValueError) as error:
        parser.exit(2, f"Preview refused: {type(error).__name__}\n")


if __name__ == "__main__":
    main()
