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

# Findings (continued)
- `LineSelect` builds combobox options with `value: item.code` (not id).
- `slot-config.tsx` treats `lineId` as the selected value and defaults to `lines?.items[0]?.id`, which conflicts with LineSelect using `code`.

# Findings (continued)
- `slot-mappings` API list accepts `query.lineId` and is wired through server loading routes.
- Backend `getFeederSlots` resolves `lineId` via `db.line.findUnique({ where: { id: lineId } })`, so line ID (not code) is required.

# Findings (continued)
- `listSlotMaterialMappings` filters via `slot.lineId = query.lineId`, confirming lineId is the DB id, not code.

# Progress
- Added `valueKey` support to `LineSelect` (default `code`).
- `slot-config.tsx` now normalizes `search.lineId` to a real line id and uses `valueKey="id"`.

## 2025-01-13
- Findings: slot-config labels appear in navigation (\"上料槽位配置\") and page header (\"站位表配置\") plus other UI strings under loading routes; need unify wording.

- Findings: repo-wide search shows only navigation uses \"上料槽位配置\"; other UI uses \"站位表\". Recommend align nav to \"站位表配置\".

# Errors (continued)
- `bun scripts/smart-verify.ts` failed due to existing lint/format errors in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` and `apps/server/src/modules/mes/fai/service.ts` (unrelated to this change). Next step: confirm whether to fix those or skip verification for this branch.

# Findings (continued)
- `git status` shows modified files: `apps/web/src/components/select/line-select.tsx`, `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`, plus pre-existing change in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.

# Findings (continued)
- `git diff --stat` unexpectedly shows only `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` and the note file; need to check staged changes for `line-select.tsx` and `slot-config.tsx`.

# Findings (continued)
- Confirmed `line-select.tsx` includes new `valueKey` prop and `slot-config.tsx` uses `useMemo` to resolve line id + `valueKey="id"`.

# Findings (continued)
- `git status` now shows only `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` and the note as modified; `line-select.tsx` and `slot-config.tsx` no longer show as modified despite containing the new logic. Need to compare against `HEAD` to confirm if changes already exist upstream.

# Findings (continued)
- `git diff HEAD -- apps/web/src/components/select/line-select.tsx` and `slot-config.tsx` show no differences; current content matches `HEAD`.
