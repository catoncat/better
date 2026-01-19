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
- [~] Slice 1: execution correctness + error surfacing (5.2.9/5.2.16/5.2.10).
- [ ] Slice 2: execution visibility (5.2.5/5.2.11/5.2.12).
- [ ] Slice 3: UX polish (5.2.6/5.2.7/5.2.8/5.2.13).
- [ ] Slice 4: update tasks.md status + verification.

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

## Progress
- Added TrackOut defect capture fields and routed FAIL flows to TrackOutDialog.
- Added ApiError-based toasts for track-in/out failures.
- Adjusted FAI trial gate messaging for PREP + FAI PASS.

## Open Questions
-

## Errors
-
