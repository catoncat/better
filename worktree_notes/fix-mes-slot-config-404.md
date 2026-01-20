# Context
- Task: Fix 404 when loading feeder slots in `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx` for selected line (likely code vs id mismatch).

# Plan
- Inspect web route + hooks for line selector value (code/id) and API call.
- Inspect server route expectations for `lineId` and how it resolves.
- Update UI/selector or API call to send correct identifier; adjust types/tests/docs if needed.

# Findings
- `rg` shows feeder slot hooks in `apps/web/src/hooks/use-feeder-slots.ts` using `client.api.lines({ lineId })["feeder-slots"].get()`.
- Server routes include `/:lineId/feeder-slots` in `apps/server/src/modules/mes/loading/routes.ts`.

# Progress
- Created note and captured initial grep results.

# Errors
- None.

# Open Questions
- Is the line selector using `line.code` while API expects `line.id`?

# References
- `apps/web/src/hooks/use-feeder-slots.ts`
- `apps/server/src/modules/mes/loading/routes.ts`

# Findings (continued)
- `slot-config.tsx` uses `useLines()` and sets `selectedLineId = search.lineId || lines?.items[0]?.id` then passes that to `useFeederSlots` and `LineSelect`.
- `useFeederSlots` calls `client.api.lines({ lineId })["feeder-slots"].get()`.
