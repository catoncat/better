# SMT WP-2 BakeRecord implementation

## Context
- Implement Track F WP-2 (BakeRecord) per `domain_docs/mes/plan/phase4_tasks.md`.
- BakeRecord model + migration already created in schema; API + UI still missing.
- User requested work on main branch and to ignore unrelated edits.

## Decisions
- API prefix: `/api/bake-records` with new module `apps/server/src/modules/mes/bake`.
- Permissions: list uses `READINESS_VIEW`, create uses `READINESS_CHECK`.
- Create input allows optional `runNo` and optional `materialCode + lotNo` to link to Run/MaterialLot (no raw IDs in UI).
- Web route: `/mes/bake-records` under navigation group "Prepare & Error Proof" (readiness).
- List page uses DataListLayout server mode with shared field meta for table/card views.

## Plan
1. Commit DB schema + migration for BakeRecord.
2. Implement server module (schema/service/routes) + register in `mes/routes.ts`.
3. Implement web hooks + list page + create dialog + navigation entry.
4. Update SMT align + phase4 plan; run `bun scripts/smart-verify.ts`.

## Findings
- BakeRecord form fields: itemCode, process, qty, temperature, duration, in/out timestamps + operators, confirmer.
- MaterialLot relation exists (materialCode + lotNo unique); can upsert when both provided.
- No bake-specific permission exists; readiness permissions are closest fit.

## Progress
- BakeRecord model added; migration `20260120011200_add_bake_record` generated (not yet committed).

## Errors
- None during current session.

## Open Questions
- None.

## References
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/spec/impl_align/03_smt_align.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`
- `domain_docs/mes/spec/process/compair/smt_forms/` (QR-Pro-057)
