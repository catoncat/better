---
type: worktree_note
createdAt: "2026-01-19T14:36:30.000Z"
branch: "main"
baseRef: "origin/main"
task:
  title: "MES execution + FAI follow-ups (5.2.5+ and 5.3)"
  planPath: "domain_docs/mes/plan/tasks.md"
  planItem: "5.2.5-5.2.13 + 5.3 audit"
  triageNote: "User wants order 1 -> 2 -> 3"
---

# main - MES execution + FAI follow-ups

## Scope
- Goal: implement slice order 1 -> 2 -> 3 for new items in tasks.md.
- Non-goals: 5.2.14/5.2.15 data model integrations and 5.3 audit (track separately unless requested).
- Risks: execution UX changes touch operator flows; ensure error codes + toasts are consistent.

## Slices
- [x] Slice 1: execution correctness + error surfacing (5.2.9/5.2.16/5.2.10).
- [x] Slice 2: execution visibility (5.2.5/5.2.11/5.2.12).
- [x] Slice 3: UX polish (5.2.6/5.2.7/5.2.8/5.2.13 + 5.2.19).
- [x] Slice 4: update tasks.md status + verification.

## Decisions
- Follow user order: 1 -> 2 -> 3.

## Findings
- `apps/web/src/routes/_authenticated/mes/execution.tsx` uses plain inputs for run/wo selection and directly submits TrackOut FAIL without defect detail dialog (5.2.9/5.2.6).
- TrackOut PASS opens a data-collection dialog; FAIL path bypasses any defect metadata capture.
- `apps/server/src/modules/mes/execution/service.ts` gates PREP track-in via `resolveFaiTrialGate` and returns `FAI_TRIAL_NOT_READY` when no active FAI is INSPECTING (ties to 5.2.16).
- Execution page currently relies on hook error handling; needs toast coverage for API errors (5.2.10).
- `use-station-execution` throws generic errors (stringified JSON) and does not parse `error.code`/`error.message`, so toasts are missing or unfriendly (5.2.10).
- TrackOut API already supports `defectCode` and `defectLocation` in schema, but UI doesn't collect them for FAIL (5.2.9).
- TrackOut FAIL auto-creates a defect with fallback code `STATION_FAIL` if no defect metadata is provided; this hides missing defect details (5.2.9).
- `resolveFaiTrialGate` returns `FAI_TRIAL_NOT_READY` when no active INSPECTING FAI, which also triggers for PREP + FAI PASS, leading to 5.2.16 mis-message.
- OQC record dialog already includes a defectCode input pattern we can reuse for TrackOut FAIL capture.
- `TrackOutDialog` already handles PASS/FAIL and data collection, but does not collect defect fields for FAIL; it always submits `result` + `data` only.
- Execution page has an NG confirmation dialog (no fields) and the main TrackOut form directly submits FAIL without defect metadata.
- Queue table actions include a separate “报不良” button that only opens a confirm dialog; no defect inputs are captured.
- Defect service supports `location` and `remark` (stored in meta) for createDefect; track-out helper currently only accepts code/location.
- `unwrap` throws structured `ApiError` with code/message/status; use-station-execution can switch to `unwrap` to surface errors via toast.
- TrackOut form on the execution page submits FAIL directly; NG dialog path is separate from TrackOut dialog.
- API patterns doc mandates envelope responses and ServiceResult for new endpoints; new run-units API should follow this.
- `stations/:stationCode/queue` returns IN_STATION units only (no QUEUED list or next-step info); likely need new API for run-queued units.
- `/runs/:runNo` exists but there is no run-units list/route-steps endpoint surfaced in routes; likely need to extend run detail or add a new route.
- `getRunDetail` only returns unitStats + recentUnits (20), with routeVersion metadata but no routing steps or per-unit progress.
- `getSnapshotSteps` helpers already exist in `execution/service.ts` and `trace/service.ts`; can reuse to surface routing steps/next-step info.
- Run detail UI relies on `useRunDetail` data (unitStats + recentUnits) and has no routing steps/progress section yet.
- Run detail UI shows recent units with `currentStepNo` only; no next-step or route progress display.
- `runDetailResponseSchema` is not wrapped in an `{ ok, data }` envelope, unlike API pattern doc.
- `unwrap` in `apps/web/src/lib/eden.ts` supports legacy non-enveloped endpoints; `useRunDetail` uses `unwrap`.
- Execution page “当前队列” uses station queue (IN_STATION only) and has no queued-unit list or next-step info.
- `trackIn` uses `getSnapshotSteps` + `isValidStationForStep` (stationType + allowedStationIds + stationGroupId) to gate which station can process a unit.
- Station queue schema/hook exposes only sn/status/currentStepNo/woNo/runNo/inAt; any next-step or queued-unit view needs API + schema + hook updates.
- Execution page pulls run list (AUTHORIZED/PREP/IN_PROGRESS) and station queue only; no FAI progress or queued-unit list yet.
- Run routes already define DELETE `/:runNo/units`; can add GET `/:runNo/units` for unit listings/queued filtering.
- Run service has generate/delete units only; no list/progress helper yet. Units are created QUEUED with `currentStepNo` from first routing step.
- Prisma schema provides StationGroup(code/name) and Operation(code/name) for labeling steps and stations in UI.
- Execution page has no selectedRun state; `handleSelectRun` only populates in/out form values (runNo/woNo).
- Other MES dialogs use `useStore(form.store, selector)` from TanStack Form to read reactive values; can use this for selected run/wo.
- UI has a `Progress` component (Radix) we can reuse for route step completion display.
- FAI hooks include `useFaiByRun` and `useFaiGate`; execution page can reuse these for trial progress display.
- `getFaiByRun` returns an Inspection record with items only; no explicit trial-unit progress counts provided.
- Align updated: execution step now references `GET /api/runs/:runNo/units` and station queue API in `domain_docs/mes/spec/impl_align/01_e2e_align.md`.
- Repo scripts: `bun run format` uses `biome format --write .`; lint uses `biome check .` (import ordering must be fixed explicitly).

## Progress
- Added TrackOut defect capture fields and routed FAIL flows to TrackOutDialog.
- Added ApiError-based toasts for track-in/out failures.
- Adjusted FAI trial gate messaging for PREP + FAI PASS.
- Added run unit listing endpoint with step meta + station queue step info; execution page now shows queued units and next step labels.
- Added run detail route progress + unit list with next-step info and pagination controls.
- Updated tasks/align docs and ran smart-verify (lint + typecheck + prisma generate).
- Execution page now uses searchable run/WO comboboxes, shows current-step hints in TrackIn/Out, and truncates long SNs.
- Added FAI trial rule callouts in execution and FAI pages.

## Open Questions
-

## Errors
-

## Findings (2025-09-30)
- tasks.md新增: 5.2.17/5.2.18/5.2.19/5.2.20, 5.3 错误处理审查区块
- tasks.md仍标未完成: 5.2.9/5.2.10/5.2.16 (已实现, 待更新状态)
- 计划仍按 slice2(5.2.5/5.2.11/5.2.12) -> slice3(5.2.6/5.2.7/5.2.8/5.2.13 + 5.2.19 待定)

## Findings (2026-01-19)
- tasks.md新增: 5.2.21/5.2.22 (FAI 创建/开始流程联动需求)
- 5.2.6/5.2.7/5.2.8/5.2.13 仍待处理，5.2.19 仍待决定是否并入 slice3
- Combobox component is available at `apps/web/src/components/ui/combobox.tsx` and used in FAI filters.
- Execution page still uses plain Inputs for runNo/woNo in track-in/out forms; will switch to Combobox + step hints.
- FAI page has no trial-rule callout yet; add note card per 5.2.13.

## Findings (2026-01-19 later)
- tasks.md pending items now include 5.1.9, 5.2.14, 5.2.15, 5.2.17, 5.2.18, 5.2.20, 5.2.21, 5.2.22.
- tasks.md pending bug items: 5.4.1, 5.5.1, 5.5.2, 5.5.3, 5.5.4.
- tasks.md API coverage table (5.3) shows all endpoints still pending.

## Findings (2026-01-19 current)
- User wants to continue on main branch, no worktree; do not touch their uncommitted files.
- Plan: commit existing slice-3 UX changes, then start P0/P1 backend fixes (5.4.1, 5.5.1, 5.5.3).
## Progress (2026-01-19 current)
- Slice-3 UX changes ready to commit with tasks.md + conversation notes.
