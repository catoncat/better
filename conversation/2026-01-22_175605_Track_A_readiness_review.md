# Track A readiness review

## Context
- Reviewing Track A (Readiness PREP_* items + waiver) implementation for correctness.

## Decisions
- Implement PREP_* checks directly in readiness `performCheck` (single gating + waiver).

## Plan
- Slice 1: Add PREP_* check execution for bake/paste/stencil usage/cleaning/scraper/fixture in readiness service.
- Slice 2: Enforce runNo validation for waive endpoint/service.
- Slice 3: Gate auto-precheck by permission and update MES impl align doc.

## Findings
- Prisma enum adds PREP_* readiness item types and WAIVED item status; readiness service counts WAIVED in summaries.
- Readiness service adds waiver flow: only FAILED items can be waived, updates item + readinessCheck status to PASSED if no failures remain.
- Prisma model for ReadinessCheckItem adds waiver fields (waivedAt/waivedBy/waiveReason); readiness routes add POST waive endpoint guarded by READINESS_OVERRIDE.
- Permission constant READINESS_OVERRIDE exists in packages/db (permissions + preset roles); route usage is consistent.
- Line readiness config schema includes PREP_* types, but readiness service currently only runs base checks (equipment/material/route/stencil/solder_paste/loading) in performCheck; need to confirm if PREP checks are implemented elsewhere.
- No server code references to PrepCheck model or prep check evaluation besides schema/config; PREP_* readiness item types appear unused in check execution.
- Run detail UI auto-triggers precheck on PREP status and uses waive dialog to call waive API; readiness action handler always runs precheck (not formal) and doesn’t show explicit error handling in the handler itself.
- Web hooks include usePerformFormalCheck but run detail page does not use it; readiness UI only triggers precheck and shows latest (any type) check.
- Exceptions list uses latest readiness check per run (any type) and includes runs where check.status is FAILED; counts failed vs waived from items.
- Run authorization gates on readiness canAuthorize (from readiness service) and explicitly allows waived items per error message.
- Readiness types and web constants include WAIVED and PREP_* labels; UI supports displaying waived status and prep item labels.
- Migrations directory has no entries for PREP_* or WAIVED updates; no migration appears to add new enum values/columns for readiness waiver fields.
- Readiness migration uses TEXT columns and already includes waiver fields; enum value changes likely don’t require DB changes (verify if non-SQLite targets need enum migrations).
- Web adds a readiness exceptions page labeled “准备异常看板” (likely the prep dashboard), backed by readiness exceptions API and filters.
- Waive endpoint accepts runNo in route params but does not validate it against the item’s check/run (service only uses itemId), so a mismatched runNo could be recorded/audited.
- Run detail auto-precheck runs for PREP status without checking readiness permissions, so users lacking READINESS_CHECK may trigger noisy 403 toasts on page load.
- Test script includes readiness-waive scenario for base checks; no coverage found for PREP_* readiness evaluation/waiver flows.

## Progress
- Implemented PREP_* readiness checks in readiness service (bake/paste/stencil usage/clean/ scraper + fixture placeholder).
- Enforced waive runNo validation and gated auto-precheck by READINESS_CHECK.
- Updated E2E align row and SMT gap plan references to readinessChecks meta.
- Ran `bun scripts/smart-verify.ts` successfully.
- Extended readiness-waive script to assert PREP_* items and waive all failed items.
- Re-ran `bun scripts/smart-verify.ts` successfully after test updates.

## Errors
-

## Open Questions
-

## References
-
