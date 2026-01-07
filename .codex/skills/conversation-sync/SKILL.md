---
name: conversation-sync
description: "Create and maintain timestamped discussion notes in conversation/ (讨论/对话记录/计划/决策/结论). Use when a response includes a plan, decision, architecture discussion, workflow agreement, or any non-trivial reasoning that should be saved for future agents."
---

# Conversation Sync

## Goal

After any discussion/plan/decision, save a short, searchable note under `conversation/` with a timestamped filename.

## Workflow

1. Create a new note file:
   - Run: `bun scripts/conversation-new.ts "<topic>"`
   - This prints the new file path.
2. Fill the template sections:
   - Context: what problem was being solved
   - Decisions: what was agreed and why (short)
   - Plan: next steps / checkpoints
   - Open Questions: what is unresolved
   - References: key file paths, issues, links
3. Keep the note minimal:
   - No emoji
   - Prefer bullets and concrete file paths
4. If a plan was produced in chat, copy the plan content into the note.

