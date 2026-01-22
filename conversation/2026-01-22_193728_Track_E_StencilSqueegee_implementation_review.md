# Track E (Stencil/Squeegee) implementation review

## Context
- Review branch `smt-gap-track-e-stencil-squeegee-readiness` implementation against Track E in `domain_docs/mes/plan/smt_gap_task_breakdown.md` (T2.7/T2.8).
- Worktree: `/Users/envvar/lzb/better-worktrees/smt-gap-track-e-stencil-squeegee-readiness` (clean).

## Decisions
- `PREP_STENCIL_CLEAN`: keep evidence-only gating (current bound stencil has at least 1 cleaning record => PASS). No maxAge/usage coupling for now.
- `PREP_SCRAPER`: treat missing check fields as FAIL; enforce required fields in API + UI to avoid “record exists but readiness FAIL” confusion.
- Stencil cleaning records remain stencil-scoped evidence; `lineCode` stays optional and readiness does not require record lineId === run.lineId.

## Plan
- Confirm Track E scope and intended acceptance (plan + align docs).
- Review server: DB schema/migrations, API routes, readiness evaluation logic.
- Review web: data hooks, linking/navigation, record entry pages.
- Run `bun scripts/smart-verify.ts` and note failures/regressions.
- Summarize gaps + recommended follow-ups.

## Findings
- Plan now marks Track E fully complete:
  - T2.7 Stencil cleaning record + API + readiness integration.
  - T2.8 Squeegee usage/check record + API + readiness integration.
- Key implementation commits (Track E-specific):
  - `6575060` feat(readiness): add `PREP_STENCIL_CLEAN` check
  - `c98336f` feat(readiness): add `PREP_SCRAPER` check
  - `51766f2` feat(web): link prep record pages from readiness
  - `6f43169` docs(mes): finish Track E readiness integration
- Server/API:
  - New endpoints: `GET/POST /api/stencil-cleaning-records`, `GET/POST /api/squeegee-usage-records` (`apps/server/src/modules/mes/smt-basic/routes.ts`).
  - Permissions: list requires `Permission.READINESS_VIEW`, create requires `Permission.READINESS_CHECK`; both create paths write audit events (`AuditEntityType.STENCIL_CLEANING` / `AuditEntityType.SQUEEGEE_USAGE`).
- DB:
  - New tables/models: `StencilCleaningRecord`, `SqueegeeUsageRecord` (migration `packages/db/prisma/schema/migrations/20260120190709_smt_basic_records/migration.sql`).
  - Both models keep `lineId` optional (FK to `Line`, `ON DELETE SET NULL`).
- Readiness integration:
  - `checkPrepStencilClean`: requires current `LineStencil` binding; passes if latest `StencilCleaningRecord` exists for bound stencilId.
  - `checkPrepScraper`: uses latest `SqueegeeUsageRecord` for the run line; fails when any check is missing/false, or when `totalPrintCount > lifeLimit`.
  - Enable/disable is driven by `Line.meta.readinessChecks.enabled` (not `Line.meta.smtPrepChecks.*` mentioned in plan).
- Potential drift/risk:
  - `Line.meta.smtPrepChecks` only appears in docs; code uses `meta.readinessChecks.enabled` → consider syncing the plan doc.
  - Stencil cleaning `lineCode` is optional; a record without line binding still satisfies readiness (since readiness uses stencilId only).
  - After enforcing “missing => FAIL”, old squeegee usage records with `null` check fields may cause readiness FAIL until a new complete record is created.

## Progress
- Read plan Track E section and scanned branch diffstat/log.
- Created this review note.
- Applied agreed adjustments (scraper required fields + missing=>FAIL + doc update).
- Ran `bun scripts/smart-verify.ts` (biome + typecheck): PASS.

## Errors
- None yet.

## Open Questions
- If a periodic gate is needed later for `PREP_STENCIL_CLEAN`, prefer configurable `maxAgeHours` over usage-count coupling.

## References
- `domain_docs/mes/plan/smt_gap_task_breakdown.md`
- Branch: `smt-gap-track-e-stencil-squeegee-readiness`
