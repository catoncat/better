---
type: worktree_note
createdAt: "2026-01-19T05:01:31.667Z"
branch: "fix/mes-loading-ux"
baseRef: "origin/main"
task:
  title: "Fix MES loading issues from tasks.md 5.1"
  planPath: "domain_docs/mes/plan/tasks.md"
  planItem: "5.1 Loading UX fixes (P0+P1)"
  triageNote: "P0 5.1.8 + P1 5.1.1/5.1.7"
---

# fix/mes-loading-ux - Fix MES loading issues from tasks.md 5.1

## Scope
- Goal: complete remaining loading + FAI issues in `domain_docs/mes/plan/tasks.md` (5.1.2/5.1.4/5.1.5/5.1.6/5.2.1/5.2.3/5.2.4).
- Non-goals: none for this pass.
- Risks: API contract changes for loading expectations/verify response; ensure UI aligns with schema updates.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: server readiness fix for LOADING when slot expectations missing (5.1.8).
- [x] Slice 2: run detail entry to loading after readiness passes (5.1.1).
- [x] Slice 3: loading error surface for validation failures (5.1.7).
- [x] Slice 4: update plan status + MES emoji check.
- [x] Slice 5: FAI completion guard requires trial TrackIn/TrackOut (5.2.2).
- [x] Slice 6: loading run selector uses searchable list of PREP runs (5.1.3).
- [x] Slice 7: update plan status + verification.
- [x] Slice 8: loading expectations/verify response add `isLocked` + `isIdempotent`, update audit behavior (5.1.2/5.1.5/5.1.6).
- [x] Slice 9: loading scan panel barcode hint + unlock button gating (5.1.2/5.1.4).
- [x] Slice 10: FAI list run filter combobox (5.2.1).
- [x] Slice 11: FAI start/create unit guards (5.2.3/5.2.4).
- [x] Slice 12: update plan status + emoji scan + verification.

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-19T05:01:31.667Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Scope: 5.1.8 + 5.1.1 + 5.1.7.
- Scope extension: 5.2.2 + 5.1.3 for this round.
- Scope extension: finish remaining 5.1 + 5.2 items per `tasks.md`.

## Findings
- `domain_docs/mes/plan/tasks.md` section 5.1 lists loading-related issues; only P0 is 5.1.8.
- P1 items in scope: 5.1.1 (run detail -> loading entry) and 5.1.7 (surface backend error).
- `checkLoading` in `apps/server/src/modules/mes/readiness/service.ts` returns pass when `RunSlotExpectation` is empty, which is the bug case for 5.1.8.
- `apps/server/src/modules/mes/loading/service.ts` builds `RunSlotExpectation` from feeder slots + mappings; if none exist, readiness currently passes because expectations are empty.
- `performCheck` writes readiness items with `failReason` only (no explicit error code in the readiness result).
- Run detail readiness card in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` shows precheck/formal buttons in the header; no loading entry link exists yet.
- `useVerifyLoading` only shows generic error toast except SLOT_LOCKED; scan panel relies on toasts for feedback.
- Loading page uses `runNo` search param (`/mes/loading?runNo=...`) and already shows "加载站位表" card when expectations are empty.
- `unwrap` throws `ApiError` with `code`/`message`, so loading error toasts can surface these fields directly.
- Main worktree `domain_docs/mes/plan/tasks.md` includes new 5.1.8 + 5.2 FAI items; worktree copy needs those additions preserved when updating statuses.
- Emoji check found existing non-ASCII symbols in `domain_docs/mes/plan/tasks.md` and `domain_docs/mes/plan/phase4_tasks.md`; will replace to satisfy MES doc rule.
- `rg -nP "\\p{Extended_Pictographic}" domain_docs/mes` now returns no matches.
- `bun scripts/smart-verify.ts` passes after formatting fix.
- `fai/service.ts` lacks any guard to require trial TrackIn/TrackOut before recording items or completing FAI.
- `useRunList` can filter runs by status and search, suitable for a PREP-only run selector on the loading page.
- FAI completion now needs a server-side trial-unit count check to block skipping trial TrackIn/TrackOut.
- `bun scripts/smart-verify.ts` passes for the updated FAI + loading selector changes.
- `apps/web/src/routes/_authenticated/mes/fai.tsx` uses a plain input for runNo filter and has start/record/complete flows without unit prompts.
- `loading/-components/slot-list.tsx` always renders an unlock button but expectation data lacks `isLocked`, so UI cannot conditionally hide it.
- `loading/schema.ts` run slot expectation schema currently has no `isLocked` field.
- `verifyLoading` already detects idempotent re-scan (same material on LOADED slot) and returns the existing record without marking idempotent or skipping audit.
- In-progress (not committed): `apps/server/src/modules/mes/loading/service.ts` adds `isLocked` to expectation detail and `isIdempotent` to loading record mapping; include selects `slot.isLocked`.
- `domain_docs/mes/plan/tasks.md` 5.1.2/5.1.4/5.1.5/5.1.6 and 5.2.1/5.2.3/5.2.4 remain unchecked; 5.1.3/5.1.7/5.1.8 are already checked.
- `mapLoadingRecord` already supports `isIdempotent` option but the idempotent branch still returns `mapLoadingRecord(existingRecord)` without the flag.
- `/loading/verify` audit logging currently records SUCCESS for idempotent re-scan (no flag) and always writes an audit event.
- `createFai` and `startFai` have no guard on run unit count; unit availability checks need to be added for 5.2.3/5.2.4.
- `use-loading.ts` success toast has no idempotent branch and `LoadingExpectation` lacks `isLocked`.
- `slot-list.tsx` still renders unlock button unconditionally; `scan-panel.tsx` material barcode placeholder needs format hint.
- `fai.tsx` uses plain Input for runNo filter; Combobox usage exists in `loading/index.tsx` and `routes/$routingCode.tsx`.
- `useRunList` supports search + status filters, so FAI run filter can reuse it for a combobox.
- `generateUnits` in run service uses unit count check (`db.unit.count`) and allows PREP/AUTHORIZED; FAI guards can reuse a similar count.
- `useStartFai`/`useCreateFai` currently show generic error toasts; will need ApiError handling for new unit guard messages.
- `listFai` includes run relation (`run: { runNo }`), so UI can access runNo from list items for unit generation prompts.
- `useCreateFai` is used on run detail page; `useStartFai` only in FAI list, so hook error handling can be adjusted for unit prompts.
- `tasks.md` updated to mark 5.1.2/5.1.4/5.1.5/5.1.6 and 5.2.1/5.2.3/5.2.4 complete, and corrected the FAI list path.
- `rg -nP "\\p{Extended_Pictographic}" domain_docs/mes` returned no matches after updates.
- `bun scripts/smart-verify.ts` passed after formatting/type fixes.

## Open Questions
-

## Errors
- `rg` on `.../runs/$runNo.tsx` failed due to shell expansion; will retry with quoted path.
- Second `rg` still expanded `$runNo` due to double quotes; next try will escape `$` or use single quotes.
- `git add` failed for `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` due to shell expansion; will re-run with quoted path.
- `bun scripts/smart-verify.ts` failed on Biome format for `apps/web/src/routes/_authenticated/mes/-components/work-order-field-meta.tsx`; fixed formatting to retry.
- `bun scripts/smart-verify.ts` failed: Biome format error in `apps/server/src/modules/mes/loading/service.ts` (multi-line select). Fixed formatting and will re-run.
- `bun scripts/smart-verify.ts` failed: typecheck error in `apps/server/src/modules/mes/loading/service.ts` (`records.map(mapLoadingRecord)` passing index as options). Updated to arrow function and will re-run.
