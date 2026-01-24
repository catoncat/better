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
## Progress (2026-01-19 slice1)
- Implemented track-in guards for `OUT_FAILED`/`SCRAPPED`, rework step validation, and auto-close of open rework tasks on successful rework track-out.
- Marked 5.4.1/5.5.1/5.5.3 as completed in `domain_docs/mes/plan/tasks.md`.

## Findings (2026-01-19 slice1)
- `trackIn` in `apps/server/src/modules/mes/execution/service.ts` currently blocks only `IN_STATION` and `DONE` statuses; missing `OUT_FAILED`/`SCRAPPED` guards (5.4.1).
- `assignDisposition` in `apps/server/src/modules/mes/defect/service.ts` creates rework tasks without validating `toStepNo` against unit failure step; unit is moved directly to requested step (5.5.1).
- Rework completion is only explicit via `completeRework`; no auto-close path tied to execution completion (5.5.3).
- `trackOut` sets failed units to `OUT_FAILED` without changing `currentStepNo`; this is the failure step to bound rework range.
- `assignDispositionSchema` only validates `toStepNo >= 1`; no upper-bound check in service.
- `ReworkTask` model has `doneBy`/`doneAt` fields and status string; can auto-close in execution flow.
- `trackOut` flow has no rework-task checks; needs a pass-path hook to close open tasks when the unit reworks past the failed step.
- Current working changes focus on 5.2.14/5.2.15 with edits in `apps/server/src/modules/mes/fai/service.ts` and `apps/web/src/routes/_authenticated/mes/fai.tsx`; `domain_docs/mes/plan/tasks.md` still pending for those items.
- `domain_docs/mes/plan/tasks.md` includes 5.2.14/5.2.15 in the P2 issue table; both are still unchecked and need status updates when changes land.
- Added `buildFaiTrialSummary` in `apps/server/src/modules/mes/fai/service.ts` to surface trial unit TrackOut data and SPI/AOI inspection records in `getFai`; need to confirm payload aligns with UI formatting and date serialization.
- FAI record dialog now pulls `DataCollectionSpec` list by first routing step, auto-fills itemName/itemSpec, and adapts actualValue input by dataType; verify record payload types and `formatDateTime` usage for trial summary tables.
- `recordFaiItemSchema` expects `actualValue` as string; UI still posts strings for boolean/number/json inputs, so no server schema change needed. `useRunDetail` is gated by `enabled: Boolean(runNo)`, so empty runNo in FAI page should not trigger requests.
- `getFai` route does not declare an explicit response schema in `apps/server/src/modules/mes/fai/routes.ts`, so adding `trialSummary` in service should not break schema validation, but web types still need confirmation.
- `FaiDetail` is inferred from Eden response in `apps/web/src/hooks/use-fai.ts`; FAI page currently casts `trialSummary` from the response, so no type export changes are required unless we want stricter typing.
- `formatDateTime` accepts string or Date, so server Date serialization is safe for trial summary tables; `DataCollectionSpec` type exposes dataType/spec fields used by the new record dialog.
- `listFai` already includes `run: { runNo }`, so using `selectedFai?.run?.runNo` in the FAI page to fetch route steps and specs is safe.
- `domain_docs/mes/spec/impl_align/01_e2e_align.md` lists FAI create/start/record endpoints but does not mention `GET /api/fai/:faiId`; consider adding a row for FAI detail evidence view.
- Biome lint failures addressed by moving FAI helper formatters out of component scope and adjusting Map type formatting in `apps/server/src/modules/mes/fai/service.ts`.
- Combobox props require `options`; updated new FAI record dialog combobox to match `apps/web/src/components/ui/combobox.tsx`.
## Findings (2026-01-19 slice2)
- `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` controls the "试产执行" CTA and FAI card; will be the primary surface for 5.2.17/5.2.18/5.2.21/5.2.22 and 5.1.9.
- Current CTA shows "试产执行" for all PREP runs regardless of FAI status; needs gating by FAI status (INSPECTING only).
- Run detail already has FAI creation dialog and a generate-units dialog; trial flow can reuse these dialogs plus a new guided entry action.
- `handleCreateFai` currently only creates FAI and closes dialog; no auto-start or trial guidance.
- `useStartFai` hook exists in `apps/web/src/hooks/use-fai.ts` for starting inspection; can be chained after create.
## Progress (2026-01-19 slice2)
- Implemented trial-flow guidance in run detail: gated CTA, auto create+start FAI, generate-units gating, and process-stage progress card.
- Updated tasks.md status for 5.1.9/5.2.17/5.2.18/5.2.21/5.2.22.

## Findings (2026-01-19 slice3)
- Defect list/detail UI (`apps/web/src/routes/_authenticated/mes/defects.tsx`) currently shows code/location/qty/status only; no failure step/operation/station details (5.5.2).
- Defect API returns `unit` and `track` but no step/operation metadata; need to enrich list/detail responses with failure step + station info.
- Track model includes `stepNo` and `stationId` with `station` relation; can derive operation name via run route snapshot.

## Progress (2026-01-19 slice3)
- Added failure step metadata in defect service and surfaced step/station in defects UI; added rework flow guidance card; marked 5.5.2/5.5.4 complete in tasks.md.

## Findings (2026-01-19 slice4)
- Seed data uses a single SMT/DIP station group for all routing steps; needs per-step station groups and stations to simulate real flow (5.2.20).

## Progress (2026-01-19 slice4)
- Added per-step station groups/stations in `seed-mes.ts` and mapped SMT/DIP steps to distinct groups; marked 5.2.20 complete.

## Findings (2026-01-19 slice5)
- FAI record dialog uses manual text fields only; no DataCollectionSpec linkage (5.2.14).
- FAI detail API lacks trial-unit TrackOut data and SPI/AOI inspection records (5.2.15).

## Progress (2026-01-19 slice5)
- Implemented DataCollectionSpec-driven FAI record templates and surfaced trial TrackOut + SPI/AOI evidence in FAI detail; updated tasks + align docs.

## Findings (2026-01-19 next)
- 5.3 API error handling audit is still marked "待启动" in `domain_docs/mes/plan/tasks.md` and is the next cross-module workstream.
- Current working tree has user changes in `domain_docs/mes/spec/process/compair/`; avoid touching those files while addressing 5.3.
- Frontend `unwrap` helper in `apps/web/src/lib/eden.ts` already throws `ApiError` with `code/message/details/status` for both HTTP and business errors; audit can focus on ensuring hooks/routes catch and toast these errors consistently.
- Readiness routes already return structured `{ ok: false, error: { code, message } }` with status; gaps likely in frontend toast usage or error message text in services.
- Loading routes follow the same `{ ok: false, error: { code, message } }` pattern with status and audit logging; audit focus should be on service message clarity and frontend toast handling.
- `use-readiness.ts` uses generic toast messages for precheck/formal/waive and doesn't surface ApiError details; `use-loading.ts` handles verify errors well but lacks onError for load-table/replace/unlock mutations.
- Readiness/loading services already emit distinct error codes/messages (mostly English). Slice2 can focus on surfacing `ApiError.message` and code in toasts rather than changing backend text.
- `use-oqc.ts` lacks onError handling for start/record/complete/mrb mutations; `use-defects.ts` throws generic errors without unwrap/ApiError detail; trace page shows inline error but no toast.

## Progress (2026-01-19 slice6)
- Marked 5.3 audit status as in-progress in `domain_docs/mes/plan/tasks.md` (scaffold only).

## Progress (2026-01-19 slice7)
- Added shared `getApiErrorMessage` helper and wired readiness/loading mutations to surface ApiError details; marked readiness/loading audit rows as complete in `domain_docs/mes/plan/tasks.md`.

## Progress (2026-01-19 slice8)
- Switched run/FAI/execution mutations to use `getApiErrorMessage` and `unwrap` for consistent error codes in toasts.

## Progress (2026-01-19 slice9)
- Added ApiError-based toasts for OQC/MRB/defect workflows and surfaced trace query errors with code-aware messaging; marked OQC/MRB/trace audit rows as complete.

## Progress (2026-01-19 slice10)
- Applied ApiError-based toasts for work order actions and marked 5.3 audit as completed in `domain_docs/mes/plan/tasks.md`.

## Progress (2026-01-19 slice11)
- Added `@better-app/shared` package with `error-codes` registry and centralized `useApiError` hook; refactored MES hooks to use the new hook.

## Errors (2026-01-19 slice11)
- Vite oxc failed to resolve `@better-app/config/tsconfig.base.json` from `packages/shared/tsconfig.json`; fixed by switching to relative `../config/tsconfig.base.json`.

## Errors (2026-01-19 next)
- Failed to overwrite conversation note with `cat > file` due to `noclobber` shell setting; next attempt will use `tee` to write the plan.

## Findings (2026-01-19 validation)
- Emoji scan (`rg -nP "\\p{Extended_Pictographic}" domain_docs/mes`) reports matches in `domain_docs/mes/spec/process/compair/*` and existing test docs; these are user-owned files and remain untouched.

## Findings (2026-01-19 error-codes)
- No existing `packages/shared` package; new shared error-code registry will require adding a workspace package and dependencies in `apps/web`/`apps/server` if used.
- Many error codes already appear in `apps/server/src/modules/mes/execution/service.ts` spans; registry can start with a focused subset plus a generic fallback.
- `apps/web` uses Vite alias only for `@`, so workspace package imports need an alias or install step; updating `apps/web/tsconfig.json` + `apps/web/vite.config.ts` avoids requiring `bun install` for resolution.

## Errors (2026-01-19 slice2)
- `bun run format -- apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` failed due to `$runNo` path expansion; will rerun `bun run format` without path filtering.

## Errors (2026-01-19 slice3)
- `bun scripts/smart-verify.ts` failed: `defect/service.ts` returned `DefectWithFailureStep | null` in `getDefect`; fixed by providing fallback `{ ...defect, failureStep: null }`.
