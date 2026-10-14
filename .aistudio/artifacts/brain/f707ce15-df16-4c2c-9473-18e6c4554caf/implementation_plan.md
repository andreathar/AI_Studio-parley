# Interactive Architecture & Deployment Guide: Self-Hosting, Multi-Model Execution & Asset Storage

Explains how Agent Parley is self-hosted on a local workstation or dedicated server, how local King.ai media assets are stored and served, how Claude, Codex, and OpenCode interact through MCP and Git worktrees, and adds an interactive **Architecture & Flow** tab to the application.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your preferences, this architecture covers:
> - **Self-Hosted Deployment**: Running Agent Parley on a local workstation or dedicated server on port 3000 with loopback MCP transport and isolated Git worktrees.
> - **King.ai Media Asset Storage**: Stored locally in the Git repository's static directory (`public/assets/king-ai/` or `assets/movies/`), served statically, and protected from overwrite by advisory leases.
> - **How Claude, Codex & OpenCode Work**: Each model runs in an isolated worktree branch with credentials injected via native CLIs/APIs, communicating via Model Context Protocol (MCP) tool dispatch to acquire claims and advisory leases.
> - **New Interactive Tab**: A dedicated **Architecture & Flow** tab in the navigation with visual flowcharts, sequence diagrams, and operational walkthroughs.

---

### 1. Overview & Core Concept

- **What It Does**: Adds an in-app visual architecture explorer and operations guide directly into the Agent Parley dashboard.
- **Key Modules Explained**:
  1. **Deployment Architecture**: Local server / workstation setup, port 3000 binding, background daemon lifecycle, and loopback communication.
  2. **Model Integration Engine**: How Claude (Anthropic), Codex (OpenAI), OpenCode (Local / Open Weights), and Gemini connect to Agent Parley via MCP tools (`claim_issues`, `file_reservation_paths`, `send_message`).
  3. **Asset Pipeline for King.ai**: Storage layout in local Git worktrees, static asset serving, and advisory lock protection against accidental overwrites.

---

### 2. User Experience & Visual Design

- **New "Architecture & Flow" Tab**:
  - Accessible directly in the top navigation bar with a dedicated icon (`Network` or `GitFork`).
  - **Interactive Diagram Switcher**:
    - **Diagram 1: Self-Hosted Infrastructure & Worktree Topology** (Visualizing workstation memory, port 3000 daemon, `.worktrees/`, and Git repository).
    - **Diagram 2: Multi-Model Orchestration (Claude + Codex + OpenCode)** (Visualizing how models execute tasks, make MCP tool calls, and exchange handoff mail).
    - **Diagram 3: King.ai Media & Asset Storage Pipeline** (Visualizing local asset directories, static serving, and advisory file leases).
    - **Diagram 4: Daily Operator Workflow** (Step-by-step from issue dispatch to unattended branch merge).
  - **Interactive Probe & Explanation Cards**: Clickable nodes that reveal technical details, file paths, and environment variable roles.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Interactive In-App Visuals vs. Static Markdown File**
  - *Chosen Approach*: Implement an interactive, rich diagram viewer directly inside the React dashboard.
  - *Why*: Allows operators and developers to understand system mechanics, worktree layouts, and provider bindings visually while actively using the tool.
- **Decision 2: Clear Boundary Between App Server & Model Execution**
  - *Chosen Approach*: Explain how Agent Parley acts as the authoritative coordination referee while models execute code inside isolated worktrees.
  - *Why*: Eliminates confusion about whether models run inside the web browser or in external CLI processes.

---

### 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│               Self-Hosted Workstation / Dedicated Server              │
│                           (http://0.0.0.0:3000)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  lane-frontend       │ │  lane-backend        │ │  lane-database       │
│  Claude (Anthropic)  │ │  Codex (OpenAI)      │ │  Gemini / OpenCode   │
│  .worktrees/frontend │ │  .worktrees/backend  │ │  .worktrees/database │
└──────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘
           │                        │                        │
           ▼                        ▼                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Agent Parley Local MCP Server & Referees             │
│  • Advisory Lease Engine: Guards public/assets/king-ai/ & source files │
│  • Atomic Issue Claims: Dispatches #201-#206 to exactly one model      │
│  • Inter-Agent Mailbox: Routes handoffs & wake signals                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│          Movies_Projects Git Repository (origin/main & Local)          │
│   • Code: src/, server/, prisma/                                       │
│   • King.ai Assets: public/assets/king-ai/ (posters, trailers, images) │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Additions**:
  - `src/components/ArchitectureView.tsx`: Full interactive diagram and explanation suite with tabbed visualizers for Deployment, Multi-Model mechanics, and Asset storage.
  - Updated `Header.tsx` and `App.tsx` navigation.
