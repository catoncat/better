---
type: worktree_note
createdAt: "2026-01-28T08:46:39.308Z"
branch: "fix/chat-scroll"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: pending  # pending | in_progress | completed
task:
  title: "fix chat messages scroll"
touchPoints:
  - "apps/web/src/components/chat/chat-messages.tsx"
---

# fix/chat-scroll - fix chat messages scroll

## Scope
- Goal:
- Non-goals:
- Risks:

## Slices
- [ ] Slice 0: worktree note context

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-28T08:46:39.308Z
- BaseRef: origin/main
- CommitsAheadOfBase: 1
- Dirty: true
- ChangedFiles:
  - apps/web/src/components/chat/chat-assistant.tsx
  - apps/web/src/components/chat/chat-messages.tsx
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
-

## Open Questions
-

## Findings
- Chat panel is a flex column; ChatMessages is a flex item sibling to suggestions/input without a min-h-0 wrapper.
- ChatMessages uses overflow-y-auto but parent flex item likely not shrinking, causing no vertical scroll.

## Progress
- Added min-h-0 to ChatMessages container and wrapped chat body with flex/min-h-0 to enable scrolling.
