window.PARLEY_CUT = {
 "columns": 132,
 "rows": 24,
 "seconds": 72.116,
 "items": [
  {
   "start": 0.0,
   "seconds": 3.6,
   "kind": "card",
   "kicker": "CHAPTER 1",
   "title": "Parallel lanes",
   "lines": [
    "One coordination server. Each agent gets its own worktree,",
    "identity and inbox; the base checkout is never edited."
   ]
  },
  {
   "start": 3.6,
   "seconds": 4.91,
   "kind": "step",
   "typing": 0.56,
   "prompt": "$",
   "command": "agent-parley run ada",
   "caption": "ada runs on claude, in a worktree of its own.",
   "rows": [
    [
     "ada is a claude lane the coordination service resumes unattended, and no bridge tool approval is recorded for it, so a service",
     "#c9d1d9"
    ],
    [
     "resume would stop at a permission prompt nobody sees; the service reports that lane instead of resuming it. To opt in, record",
     "#c9d1d9"
    ],
    [
     "\"approve_bridge_tools\": true or \"auto_mode\": true under \"supervision\" in the project manifest or on this lane, or resume the lane in",
     "#c9d1d9"
    ],
    [
     "your own terminal.",
     "#c9d1d9"
    ],
    [
     "ada (claude, default account): /home/dev/.local/state/agent-parley/projects/0204ab80f76f5cbe/ada",
     "#c9d1d9"
    ],
    [
     "Shared project: /home/dev/payments-api",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 8.51,
   "seconds": 4.326,
   "kind": "step",
   "typing": 0.616,
   "prompt": "$",
   "command": "agent-parley run grace",
   "caption": "grace runs on codex, right beside it.",
   "rows": [
    [
     "grace (codex, default account): /home/dev/.local/state/agent-parley/projects/0204ab80f76f5cbe/grace",
     "#c9d1d9"
    ],
    [
     "Shared project: /home/dev/payments-api",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 12.836,
   "seconds": 5.292,
   "kind": "step",
   "typing": 0.532,
   "prompt": "$",
   "command": "agent-parley status",
   "caption": "Two providers, two lanes, one shared view.",
   "rows": [
    [
     "Server: ready",
     "#79c0ff"
    ],
    [
     "Notify: outbound off: No notification transport is configured; run `agent-parley notify setup`, or set AGENT_PARLEY_NOTIFY.; inbound",
     "#c9d1d9"
    ],
    [
     "off: AGENT_PARLEY_INBOUND is not set",
     "#c9d1d9"
    ],
    [
     "State: /home/dev/.local/state/agent-parley",
     "#79c0ff"
    ],
    [
     "",
     "#c9d1d9"
    ],
    [
     "Project: /home/dev/payments-api",
     "#79c0ff"
    ],
    [
     "Forge: open issues unavailable (no GitHub); claims on closed issues are not hidden",
     "#c9d1d9"
    ],
    [
     "No open claims.",
     "#c9d1d9"
    ],
    [
     "LANE   STATE     CLAIMS  TASK",
     "#c9d1d9"
    ],
    [
     "ada    working   0       Check shared coordination state and await my task.",
     "#c9d1d9"
    ],
    [
     "grace  starting  0       Check shared coordination state and await my task.",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 18.128,
   "seconds": 3.6,
   "kind": "card",
   "kicker": "CHAPTER 3",
   "title": "Claims and advisory reservations",
   "lines": [
    "An agent claims an issue and reserves what it will touch.",
    "A second agent is told, not silently overwritten."
   ]
  },
  {
   "start": 21.728,
   "seconds": 5.436,
   "kind": "step",
   "typing": 0.756,
   "prompt": "$",
   "command": "agent-parley issue claim 41",
   "caption": "ada claims #41 from inside its lane.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"owner\": \"ada\",",
     "#c9d1d9"
    ],
    [
     "  \"offer\": null,",
     "#c9d1d9"
    ],
    [
     "  \"request\": null,",
     "#c9d1d9"
    ],
    [
     "  \"blocked_by\": [],",
     "#ff7b72"
    ],
    [
     "  \"history\": [",
     "#c9d1d9"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "[26 lines not shown]",
     "#c9d1d9"
    ],
    [
     "    \"progress\": null,",
     "#c9d1d9"
    ],
    [
     "    \"backlog\": null",
     "#c9d1d9"
    ],
    [
     "  }",
     "#c9d1d9"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 27.164,
   "seconds": 5.714,
   "kind": "step",
   "typing": 1.484,
   "prompt": "ada",
   "command": "file_reservation_paths {\"paths\": [\"src/payments/**\"]}",
   "caption": "ada reserves the refund module.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"granted\": [",
     "#c9d1d9"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "      \"id\": 1,",
     "#c9d1d9"
    ],
    [
     "      \"path\": \"src/payments/**\"",
     "#c9d1d9"
    ],
    [
     "    }",
     "#c9d1d9"
    ],
    [
     "  ],",
     "#c9d1d9"
    ],
    [
     "  \"conflicts\": []",
     "#ff7b72"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 32.878,
   "seconds": 6.354,
   "kind": "step",
   "typing": 1.484,
   "prompt": "grace",
   "command": "file_reservation_paths {\"paths\": [\"src/payments/**\"]}",
   "caption": "grace asks for the same paths: a named collision.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"granted\": [],",
     "#c9d1d9"
    ],
    [
     "  \"conflicts\": [",
     "#ff7b72"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "      \"path\": \"src/payments/**\",",
     "#c9d1d9"
    ],
    [
     "      \"owner\": \"ada\"",
     "#c9d1d9"
    ],
    [
     "    }",
     "#c9d1d9"
    ],
    [
     "  ],",
     "#c9d1d9"
    ],
    [
     "  \"has_more\": false",
     "#c9d1d9"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 39.232,
   "seconds": 7.16,
   "kind": "step",
   "typing": 1.4,
   "prompt": "grace",
   "command": "request_reservation {\"paths\": [\"src/payments/**\"]}",
   "caption": "So grace queues behind ada instead of waiting blind.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"granted\": [],",
     "#c9d1d9"
    ],
    [
     "  \"conflicts\": [",
     "#ff7b72"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "      \"path\": \"src/payments/**\",",
     "#c9d1d9"
    ],
    [
     "      \"owner\": \"ada\"",
     "#c9d1d9"
    ],
    [
     "    }",
     "#c9d1d9"
    ],
    [
     "  ],",
     "#c9d1d9"
    ],
    [
     "  \"has_more\": false,",
     "#c9d1d9"
    ],
    [
     "  \"queued\": [",
     "#ff7b72"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "      \"id\": 1,",
     "#c9d1d9"
    ],
    [
     "      \"path\": \"src/payments/**\",",
     "#c9d1d9"
    ],
    [
     "      \"owner\": \"ada\",",
     "#c9d1d9"
    ],
    [
     "      \"position\": 1",
     "#c9d1d9"
    ],
    [
     "    }",
     "#c9d1d9"
    ],
    [
     "  ]",
     "#c9d1d9"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 46.392,
   "seconds": 3.6,
   "kind": "card",
   "kicker": "CHAPTER 5",
   "title": "Handoffs",
   "lines": [
    "Work moves between agents explicitly,",
    "with a summary, and only when the recipient accepts."
   ]
  },
  {
   "start": 49.992,
   "seconds": 6.37,
   "kind": "step",
   "typing": 1.6,
   "prompt": "$",
   "command": "agent-parley issue offer 41 --to grace --summary 'Rounding traced to refund(); fix and tests remain.'",
   "caption": "ada offers #41 to grace with a summary.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"owner\": \"ada\",",
     "#c9d1d9"
    ],
    [
     "  \"offer\": {",
     "#c9d1d9"
    ],
    [
     "    \"id\": \"7ee4a6b9480745149ebfdc68d4f341b9\",",
     "#c9d1d9"
    ],
    [
     "    \"to\": \"grace\",",
     "#c9d1d9"
    ],
    [
     "    \"summary\": \"Rounding traced to refund(); fix and tests remain.\",",
     "#c9d1d9"
    ],
    [
     "    \"created\": 1790828460.9125574,",
     "#c9d1d9"
    ],
    [
     "[58 lines not shown]",
     "#c9d1d9"
    ],
    [
     "    \"progress\": null,",
     "#c9d1d9"
    ],
    [
     "    \"backlog\": null",
     "#c9d1d9"
    ],
    [
     "  }",
     "#c9d1d9"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 56.362,
   "seconds": 6.55,
   "kind": "step",
   "typing": 1.6,
   "prompt": "$",
   "command": "agent-parley issue accept 41 --offer-id 7ee4a6b9480745149ebfdc68d4f341b9",
   "caption": "grace accepts; only then does ownership move.",
   "rows": [
    [
     "{",
     "#c9d1d9"
    ],
    [
     "  \"owner\": \"grace\",",
     "#c9d1d9"
    ],
    [
     "  \"offer\": null,",
     "#c9d1d9"
    ],
    [
     "  \"request\": null,",
     "#c9d1d9"
    ],
    [
     "  \"blocked_by\": [],",
     "#ff7b72"
    ],
    [
     "  \"history\": [",
     "#c9d1d9"
    ],
    [
     "    {",
     "#c9d1d9"
    ],
    [
     "[71 lines not shown]",
     "#c9d1d9"
    ],
    [
     "  \"reservations_moved\": [",
     "#c9d1d9"
    ],
    [
     "    \"src/payments/**\"",
     "#c9d1d9"
    ],
    [
     "  ]",
     "#c9d1d9"
    ],
    [
     "}",
     "#c9d1d9"
    ]
   ]
  },
  {
   "start": 62.912,
   "seconds": 3.6,
   "kind": "card",
   "kicker": "CHAPTER 9",
   "title": "One pane for the operator",
   "lines": [
    "Live state of every lane, and only the problems",
    "that need a human."
   ]
  },
  {
   "start": 66.512,
   "seconds": 5.604,
   "kind": "step",
   "typing": 0.644,
   "prompt": "$",
   "command": "agent-parley top --once",
   "caption": "The dashboard: state, issues, mail, leases, denials.",
   "rows": [
    [
     "agent-parley top - 08:21:01  server running  projects 1  read 0.08s",
     "#79c0ff"
    ],
    [
     "Lanes: 2 total, 1 starting, 1 working   Issues: 1 held",
     "#79c0ff"
    ],
    [
     "Mail: 0 unread   Leases: 1 held   Hooks (all retained): 3 events, 1 denied (33%)   Context: 955B",
     "#79c0ff"
    ],
    [
     "Hidden columns: BRANCH",
     "#c9d1d9"
    ],
    [
     "",
     "#c9d1d9"
    ],
    [
     "project /home/dev/payments-api",
     "#79c0ff"
    ],
    [
     "PARTICIPANT     STATE                              ISSUES      MAIL       LEASES     DENIALS    TOKENS     IDLE      TASK",
     "#79c0ff"
    ],
    [
     "ada             working 17s; inferred by liveness  -           0/0        0          1/2                   0s        Check shared c\u2026",
     "#c9d1d9"
    ],
    [
     "grace           starting 9s                        #41         0/0        1 0s       0/1                   0s        Check shared c\u2026",
     "#c9d1d9"
    ],
    [
     "Live view: top without --once; ? explains each column.",
     "#c9d1d9"
    ]
   ]
  }
 ]
};
