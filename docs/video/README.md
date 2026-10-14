# Launch video composition

This directory holds the source of the Agent Parley launch video: a
HyperFrames composition (`index.html`) and the terminal frames it shows
(`frames.js`). The rendered MP4 is not checked in. It is attached to the
release, and the README first screen plays a copy uploaded through the GitHub
web editor, whose `user-attachments` URL GitHub renders as a video player.

PyPI renders that URL as plain text, so the package build rewrites it. The
`fancy-pypi-readme` hook in `pyproject.toml` replaces the bare URL in the
package description with `docs/assets/launch.webp`, a still frame that links
to the repository README. Keep `docs/assets/launch.webp`: the 0.15.1 package
description embeds it from `main` and cannot be republished. Keep
`docs/assets/demo-short.svg` for the same reason: the 0.15.0 description
embeds that file from `main`.

The project site has the same problem, and the attachment URL returns 404 to
anonymous requests, so a `<video>` element cannot point at it. The Pages
workflow downloads `launch.mp4` from the v0.15.1 release into
`docs/assets/`, and `scripts/pages_video.py` replaces the bare URL with a
`<video>` element that plays that copy. After a re-cut, attach the new MP4 to
a release and point the workflow's download at it.

## What is real and what is authored

Every terminal frame comes from `frames.js`, which the demo recorder writes
from a real run: `agent-parley` commands in a pseudo-terminal of 132 columns,
MCP tool calls through the same dispatch the served transport uses, and the
recorder's own clipping, colours and hold times. Do not edit `frames.js` by
hand; record it again.

The native clients are stand-ins. The recorder puts stub `claude` and `codex`
executables on `PATH` that run `exec sleep 900`, so the lanes and the
coordination path are real and no model runs. The terminal title bar says so
on every frame, and the opening card says so before the first one.

The composition authors everything outside the terminal: the opening problem
illustration, the opening and closing cards, the chapter card layout and
numbering, the captions band and the progress bar. The chapter card titles
and body lines, and the caption under each frame, are the recorder's own text
from `agent_parley/demo_scenario.py`.

## Re-cut

Run from the repository root. The recorder needs the development environment
(`uv sync`); the render needs Node.js with `npx`, and its first run downloads
HyperFrames, its headless browser, GSAP and the two web fonts.

```sh
uv run --locked python scripts/record_demo.py --video
npx --yes hyperframes@0.8.98 check docs/video
npx --yes hyperframes@0.8.98 render docs/video --quality delivery --crf 23 \
  --output /tmp/launch/launch.mp4
```

The first command records the short tour again, keeps the steps whose
captions are listed in `VIDEO` in `scripts/record_demo.py`, and rewrites
`frames.js`. It fails if a listed caption no longer exists, so a changed
story cannot silently drop a beat. To change the cut, edit `VIDEO` and record
again.

The video length is the opening (8.4 seconds), the recorder's hold times for
the chosen frames, and the closing card (5.5 seconds).
