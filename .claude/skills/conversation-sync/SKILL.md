---
name: conversation-sync
description: "Create and maintain timestamped discussion notes in conversation/ (讨论/对话记录/计划/决策/结论). Use when a response includes a plan, decision, architecture discussion, workflow agreement, or any non-trivial reasoning that should be saved for future agents."
---

# Conversation Sync

## Workflow

1. Create: `bun scripts/conversation-new.ts "<topic>"` (prints the new file path)
2. Fill: Context / Decisions / Plan / Open Questions / References
3. Paste structured output verbatim (tracks/tables/checklists) so another agent can resume without re-analysis
