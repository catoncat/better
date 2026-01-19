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
- Goal: fix loading readiness false pass and improve loading UX feedback/entry.
- Non-goals: 5.1.2/5.1.3/5.1.4/5.1.5/5.1.6 stay out of scope this pass.
- Risks: readiness change may affect existing passes; ensure explicit error code/message.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: server readiness fix for LOADING when slot expectations missing (5.1.8).
- [x] Slice 2: run detail entry to loading after readiness passes (5.1.1).
- [x] Slice 3: loading error surface for validation failures (5.1.7).
- [x] Slice 4: update plan status + MES emoji check.
- [x] Slice 5: FAI completion guard requires trial TrackIn/TrackOut (5.2.2).
- [x] Slice 6: loading run selector uses searchable list of PREP runs (5.1.3).
- [x] Slice 7: update plan status + verification.

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

## Open Questions
-

## Errors
- `rg` on `.../runs/$runNo.tsx` failed due to shell expansion; will retry with quoted path.
- Second `rg` still expanded `$runNo` due to double quotes; next try will escape `$` or use single quotes.
- `git add` failed for `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` due to shell expansion; will re-run with quoted path.
- `bun scripts/smart-verify.ts` failed on Biome format for `apps/web/src/routes/_authenticated/mes/-components/work-order-field-meta.tsx`; fixed formatting to retry.
