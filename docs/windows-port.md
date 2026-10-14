# Native Windows port: evaluation and plan

Status: evaluation only. Nothing here is implemented. The download
measurement from issue #450 is recorded in
[Download measurement](#download-measurement); it does not meet the decision
rule. Tracking issue: #449.

Today the supported Windows path is WSL2 with the repository in the Linux file
system ([Platforms](operations.md#platforms)). A native port would let a
Windows user run lanes against Windows-side native CLIs without WSL.

Citations are `file:line` against `4119237`.

## Summary

A native port is feasible with the standard library alone (`msvcrt`, `ctypes`,
`subprocess` creation flags, `signal.SIGBREAK`), and the runtime already
isolates most operating-system primitives behind a few functions. It is still
large work: the pseudo-terminal launcher has no standard-library Windows
equivalent and needs ConPTY through `ctypes`, and several places the port
would touch are not listed in #449 (the private-home permission check, the
Bash hook client, the directory `fsync`, the wake sockets and the loopback
port probe). The runtime cannot be imported on Windows today:
`agent_parley/state.py:4` imports `fcntl`, and
`platform_for()` at `agent_parley/process.py:557` raises `Unsupported
operating system` for any platform other than Linux and macOS. The installed
command therefore refuses native Windows before loading the runtime
(`agent_parley/entry.py:49`) and exits 2 with a pointer to WSL2; only
`--version` or `-V` answers there.

Overall estimate: L (several weeks of focused work plus a native CI job).
Recommendation: do not start until #450 meets the decision rule below.

## 1. Inventory of POSIX-only dependencies

Every entry below was found by walking the syntax tree of each module in
`agent_parley/`, then read at the cited line.

### Advisory locks (`fcntl.flock`)

| Site | Use |
| --- | --- |
| `agent_parley/state.py:4`, `:153`, `:168` | `lock()`: exclusive, non-blocking `flock` with a bounded retry loop. Every operation lock goes through it. |
| `agent_parley/checkpoints.py:7`, `:836-892` | `event_lock()`: shared (`LOCK_SH`) for readers and append writers, exclusive for maintenance, blocking or bounded. |
| `agent_parley/archive.py:129` | `_project_locks()`: nests `lock()` across project directories; inherits the layer. |

These are advisory coordination locks between cooperating processes of this
tool. They do not stop any other program from writing the files, and
reservations built on top of them stay advisory.

### Pseudo-terminal and terminal modes (`pty`, `termios`, `tty`, `fcntl.ioctl`)

| Site | Use |
| --- | --- |
| `agent_parley/terminal.py:4`, `:8`, `:16`, `:18` | Imports `fcntl`, `pty`, `termios`, `tty`. |
| `agent_parley/terminal.py:758` | `pty.fork()` for every launch, attached or detached. |
| `agent_parley/terminal.py:766`, `:768` | Child sets a fixed detached size with `TIOCSWINSZ`, then `os.execvpe`. |
| `agent_parley/terminal.py:744`, `:897`, `:1049` | Saves, sets raw (`tty.setraw`) and restores the operator terminal. |
| `agent_parley/terminal.py:857-865` | `SIGWINCH` handler copies `TIOCGWINSZ` to the child with `TIOCSWINSZ`. |
| `agent_parley/terminal.py:930`, `:1034` | `select.select` over the pty master, the operator's standard input and the wake listener. |
| `agent_parley/terminal.py:326` | `detached_terminal_replies()`: answers terminal probes because detached clients still own a real pseudo-terminal. |
| `agent_parley/watch.py:295-321` | `keys()` for `watch` and `top`: `tty.setcbreak` and `select.select` on standard input. |

### Process identity and termination (`/proc`, pidfd, `ps`, `sysctl`)

| Site | Use |
| --- | --- |
| `agent_parley/process.py:66-157` | Linux start ticks, liveness, foreground process group, parent and command line, all read from `/proc/<pid>/...`. |
| `agent_parley/process.py:34`, `:472-478` | Boot identity from `/proc/sys/kernel/random/boot_id`. |
| `agent_parley/process.py:160-208` | `libc_pidfd()` through `ctypes.CDLL(None)` and `pidfd_send_signal`. |
| `agent_parley/process.py:211-250` | `linux_terminate()`: `pidfd_open`, `SIGTERM`, `select` on the pidfd, `SIGKILL`, `waitpid(WNOHANG)`. |
| `agent_parley/process.py:39-63`, `:253-435` | macOS equivalents through `ps` and `kill`. |
| `agent_parley/process.py:481-498` | macOS boot identity through `sysctl -n kern.boottime`. |
| `agent_parley/process.py:541-560` | `platform_for()` accepts only `linux*` and `darwin`; `PLATFORM` is bound at import, so any other platform fails on import. |
| `agent_parley/process.py:562-664` | WSL detection from `/proc/sys/kernel/osrelease` and the `/mnt` refusal. |

### Signals

| Site | Use |
| --- | --- |
| `agent_parley/server.py:56`, `:1289-1318` | Service stops on `SIGTERM`, `SIGINT`, `SIGHUP`. |
| `agent_parley/terminal.py:38`, `:774-812` | Launcher records `SIGTERM` and `SIGHUP`, forwards the first one to the child with `os.kill`, then `os.waitpid`. |
| `agent_parley/terminal.py:857`, `:865`, `:1050` | `SIGWINCH` handler install and restore. |
| `agent_parley/terminal.py:812`, `:1030` | `os.waitstatus_to_exitcode`, `os.waitpid(..., WNOHANG)`. |

### Process groups and detaching (`start_new_session`)

| Site | Use |
| --- | --- |
| `agent_parley/core.py:214` | Detached service start. |
| `agent_parley/hook.py:394` | Hook relaunches a dead service. |
| `agent_parley/supervision.py:7826` | Supervisor starts a resume launcher. |
| `agent_parley/demo.py:380` | Demo starts a stub lane on a fresh pseudo-terminal in its own session. |
| `agent_parley/demo.py:539` | Demo runs a hook call (`subprocess.run`). |
| `agent_parley/demo.py:696` | Demo stops its sandbox service (`subprocess.run`). |

`start_new_session` is POSIX-only; on Windows `subprocess` ignores it, and the
child stays in the parent's console and process group.

### Sockets and IPC

| Site | Use |
| --- | --- |
| `agent_parley/terminal.py:168-225`, `:753-756` | Wake sockets are `AF_UNIX` files (`wake-*.sock`), created `0o600`, probed and swept. CPython on Windows does not expose `socket.AF_UNIX`. |
| `agent_parley/server.py:395`, `:778-797` | Mail server is loopback TCP (`ThreadingHTTPServer`) with a bearer token: portable. |
| `agent_parley/hook.py:296-326` | Hook client connects over loopback TCP: portable. |
| `agent_parley/core.py:190-199` | Port probe with `SO_REUSEADDR`. On Windows that option lets a second socket bind a port already in use, so the probe cannot detect an occupied port; `HTTPServer` also sets it through `allow_reuse_address`. |

### File modes, directory sync and shell assumptions

| Site | Use |
| --- | --- |
| `agent_parley/core.py:42-45` | `BridgeCore.__init__` refuses a home whose mode has any group or other bit. On Windows `st_mode` of a directory reports `0o777`, so every home would be refused. |
| `agent_parley/state.py:73-76`, `agent_parley/recovery.py:363-366` | `os.replace`, then `os.open(dir, O_RDONLY \| O_DIRECTORY)` and `fsync` of the directory. `os.O_DIRECTORY` does not exist on Windows, and `os.replace` fails while another process holds the target open. |
| `agent_parley/recovery.py:74-75`, `agent_parley/store.py:389`, `agent_parley/roster.py:954`, `agent_parley/opencode.py:216`, `agent_parley/terminal.py:756` | `0o600` and `0o700` modes for private state. Windows ignores all bits except read-only; privacy would come from the profile directory ACL. |
| `agent_parley/archive.py:314`, `:325`, `:553` | Modes stored inside archive members; harmless on Windows. |
| `agent_parley/hook.py:57`, `:163-221` | The native hook command is a generated `#!/usr/bin/env bash` client made executable with `os.chmod(..., 0o755)`. Windows has no Bash by default, and `claude` and `codex` run hook commands through different shells there. |
| `agent_parley/gemini.py:46-50` | System settings path chooses `darwin` or `/etc/gemini-cli/settings.json`; Windows uses `%ProgramData%`. |

### CI

`.github/workflows/check.yml:139-178`: the `wsl` job runs the suite inside
Ubuntu on WSL when package, launch or process code changes. It is a required
check, bounds every step with its own timeout and retries WSL setup once. No job runs Python natively on
Windows.

## 2. Per-layer plan

Every replacement uses the standard library only: `msvcrt`, `ctypes` with
`kernel32`, `subprocess` creation flags and `signal`. `_winapi` provides some
of the same calls but is private and undocumented, so it is not relied on.

| Layer | Windows replacement | Behind which existing interface | Effort | Risk |
| --- | --- | --- | --- | --- |
| Locks | `LockFileEx` and `UnlockFileEx` through `ctypes` on `msvcrt.get_osfhandle(stream.fileno())`, with `LOCKFILE_FAIL_IMMEDIATELY` for the non-blocking path. `msvcrt.locking` alone is not enough: it has no shared mode, which `event_lock()` needs. | `state.lock()` and `checkpoints.event_lock()`; callers unchanged. | S-M | Low. Windows byte-range locks are mandatory, not advisory, for the locked range, so lock one byte past end of file, where no reader reads. |
| Atomic writes | Skip the directory `fsync` on Windows; retry `os.replace` on `PermissionError` within a short bound, because readers can hold the target open. | `state.write_text()`, `recovery` bundle write. | S | Medium: a reader that holds a file open for long blocks the writer; the retry bound must be tested. |
| Private home | Replace the mode check with an ownership check of the profile directory ACL (`GetNamedSecurityInfoW` through `ctypes`), or accept `%LOCALAPPDATA%` as private by construction and state that. | `BridgeCore.__init__` in `core.py`. | M | Medium: getting the ACL check wrong either refuses every home or silently accepts a shared one. |
| Terminal, attached | ConPTY through `ctypes`: `CreatePipe`, `CreatePseudoConsole`, `STARTUPINFOEX` with `PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE`, `CreateProcessW`. `select` cannot wait on pipes on Windows, so reads move to one thread per stream feeding a queue. Operator input through `msvcrt.getwch` or `ReadConsoleInputW` with `SetConsoleMode`. | `terminal.run()` and `terminal._session()`; the output relay, title and probe handling stay as they are. | L | High: the largest module-level change, Windows 10 1809 or later only, and a new threading model in the launcher. |
| Terminal, detached | A detached-only first release does not avoid ConPTY: detached launches still use a pseudo-terminal (`terminal.py:326`, `:758`) because the native CLIs expect one. The only pty-free option runs clients in their non-interactive modes, which drops wake-by-typing and changes lane behaviour. | Same as above. | M-L | Medium: saves input and resize handling only. |
| Resize | No `SIGWINCH`: poll `os.get_terminal_size()` on the input thread, or read `WINDOW_BUFFER_SIZE_EVENT`, then `ResizePseudoConsole`. | `_session()` `resize()`. | S | Low. |
| `watch` and `top` keys | `msvcrt.kbhit()` and `msvcrt.getwch()` instead of `setcbreak` and `select`. | `watch.keys()`. | S | Low. |
| Process identity | `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION \| SYNCHRONIZE)` then `GetProcessTimes` creation time as start ticks. The open handle pins the process object, so it gives the same race freedom as a pidfd. Parent through `CreateToolhelp32Snapshot`. Boot identity from `time.time()` minus `GetTickCount64()`, rounded. Command-line match has no documented user-mode call; match on executable path (`QueryFullProcessImageNameW`) plus the recorded creation time instead. | A `windows_platform()` returning the existing `process.Platform` tuple, selected in `platform_for()` by `win32`. | M-L | Medium: `foreground_pid` has no equivalent (no terminal process groups), so hook-to-session identity must come from the parent walk alone. |
| Termination | `os.kill(pid, signal.CTRL_BREAK_EVENT)` to a child started with `CREATE_NEW_PROCESS_GROUP`, `WaitForSingleObject` on the handle with the existing timeouts, then `TerminateProcess`. | `Platform.terminate`. | M | Medium: `CTRL_BREAK_EVENT` reaches only processes sharing a console; detached children need `CREATE_NEW_CONSOLE` with a hidden window, or they can only be terminated hard. |
| Signals | `SIGINT` and `SIGBREAK` through `signal.signal`; `SetConsoleCtrlHandler` through `ctypes` for `CTRL_CLOSE_EVENT`, `CTRL_LOGOFF_EVENT` and `CTRL_SHUTDOWN_EVENT` as the `SIGHUP` analog. | `server.SIGNALS` and `terminal.STOP_SIGNALS` become per-platform tuples; handlers unchanged. | S-M | Medium: a close event allows only a few seconds before the process is killed, so cleanup must stay short. |
| Detaching | `creationflags=CREATE_NEW_PROCESS_GROUP \| DETACHED_PROCESS` (or `CREATE_NO_WINDOW`) in place of `start_new_session=True`. | The six `start_new_session` sites; one shared helper. | S | Low. |
| Wake IPC | Loopback TCP bound to `127.0.0.1:0` with the port and a random token written to the existing socket-path file, reusing the mail server's token pattern. Named pipes are the alternative but need `ctypes` overlapped I/O. | `terminal.socket_path()`, `request()`, `sweep_sockets()` and the listener in `run()`. | M | Medium: a TCP wake channel needs authentication that the `0o600` socket file gave for free. |
| Port probe | `SO_EXCLUSIVEADDRUSE` instead of `SO_REUSEADDR` on Windows, and `allow_reuse_address = False` on the service. | `BridgeCore.up()` in `core.py`, `server.Server`. | S | High if missed: two services could bind one port. |
| Hook client | Ship the hook as a Python entry point (`python -m agent_parley.hook`) or a `.cmd` wrapper; keep the Bash client on POSIX for its start-up cost. | `hook.write_client()` and the hook registration in `launch.py`. | M | Medium: hook start-up latency on every native tool call; must be measured. |
| Native CLI launch | npm installs `claude.cmd` and `codex.cmd` shims. Launching a `.cmd` passes arguments through `cmd.exe`, whose quoting differs from `CreateProcess`; resolve the underlying `node` script where possible and never pass untrusted text through `cmd.exe`. | `terminal.run()` command construction. | M | High: argument injection through batch quoting if handled naively. |
| CI | Add a native `windows-latest` job running `make check` equivalents (`make` is absent, so a PowerShell step or `uv run` commands), advisory at first, then required once green for a release cycle. Mark POSIX-only tests (`pty`, `fork`, signal delivery) with platform skips and add Windows counterparts. | `.github/workflows/check.yml`. | M | Medium: large parts of the suite drive a real pseudo-terminal and must be split, not skipped wholesale. |

## 3. Recommendation and decision rule

Do not start the port now. WSL2 is supported and covers Windows users who can
keep the repository in the Linux file system. The port is L-sized, and the
terminal layer carries the most risk; the demand is not measured.

### Download measurement

Measured on 2026-09-26 for issue #450 from the public ClickHouse copy of the
PyPI download log (`pypi.pypi` on `sql-clickhouse.clickhouse.com`, user
`demo`, no account needed). It carries the same installer and system fields
as `bigquery-public-data.pypi.file_downloads`, and covers every download of
`agent-parley` from 2026-09-09 to 2026-09-25: 5,471 in total.

```sql
SELECT installer, system, count() AS downloads
FROM pypi.pypi
WHERE project = 'agent-parley' AND date >= '2026-09-01'
GROUP BY installer, system
ORDER BY downloads DESC
```

| Installer | System | Downloads | Share |
| --- | --- | ---: | ---: |
| (none sent) | (none) | 2,624 | 48.0% |
| `bandersnatch` | (none) | 1,188 | 21.7% |
| `Browser` | (none) | 886 | 16.2% |
| `requests` | (none) | 539 | 9.9% |
| `Nexus` | (none) | 28 | 0.5% |
| `pip` | Linux | 122 | 2.2% |
| `pip` | Darwin | 68 | 1.2% |
| `uv` | Linux | 11 | 0.2% |
| `uv` | Darwin | 3 | 0.1% |
| `uv` | Windows | 2 | <0.1% |

Installer share of the unknown-system downloads: all 5,265 downloads with no
system came from clients that are not package installers. An empty user
agent is 49.8% of them, `bandersnatch` mirrors 22.6%, browser file
downloads 16.8%, scripts using `requests` 10.2% and Nexus proxies 0.5%. No
`pip` or `uv` download lacks a system, so the 88% pypistats reports as
unknown is mirror and scraper traffic, not hidden users. The dataset marks no
download as coming from CI.

Installs with a recorded system: 206. Linux 133 (64.6%), macOS 71 (34.5%),
native Windows 2 (1.0%).

WSL2 share of Linux downloads: not measurable from this dataset, which keeps
only the system name. BigQuery's `details.system.release` holds the WSL
kernel string. The decision does not depend on it yet: the sample is 206
installs over 17 days, below the 500 downloads and 30 days the rule needs.
Measure `details.system.release` with the BigQuery query in #450 at the next
minor release, when the sample meets the rule.

Result against the rule below: native Windows is 1.0% of installs with a
recorded system, under the 10% trigger, and the sample is too small. Do not
start the port; keep WSL2 as the Windows path and measure again at the next
minor release.

Decision rule, applied over at least 30 days and at least 500 downloads with
a recorded system:

- Start the port if native Windows is at least 10% of downloads with a
  recorded system, or WSL2 is at least 25% of Linux downloads.
- Otherwise keep WSL2 as the Windows path and measure again at the next
  minor release.

Native Windows downloads today cannot run the package, so any measurable
share is unmet demand rather than use. A high WSL2 share with a low native
share argues for improving the WSL2 path (for example Windows-side CLI
access) before a port.

If the rule is met, land the layers in the order of the breakdown below: the
package becomes importable and `status` and `top` work before any lane can
launch, and the ConPTY launcher lands last behind a native CI job.

## 4. Proposed follow-up issues

Titles only; none are created until the decision rule is met.

1. feat: make the package importable on Windows with a `win32` process platform
2. feat: implement the coordination lock layer with `LockFileEx` on Windows
3. fix: make atomic state writes and the private-home check work on Windows
4. feat: replace `start_new_session` with Windows creation flags at every detached start
5. fix: detect an occupied service port on Windows with `SO_EXCLUSIVEADDRUSE`
6. feat: carry lane wake requests over authenticated loopback TCP on Windows
7. feat: ship a Windows hook client for `claude` and `codex`
8. feat: map service and launcher stop signals to Windows console control events
9. feat: launch native clients through ConPTY on Windows
10. feat: read `watch` and `top` keys through `msvcrt` on Windows
11. ci: add an advisory native Windows test job
12. docs: document native Windows support and its limits
