## Context
- `domain_docs/mes/plan/phase3_tasks.md` 3.2.4 required acceptance coverage for external integration “degraded path” (no external systems online).
- Existing acceptance script only waived LOADING; did not cover EQUIPMENT/STENCIL/SOLDER_PASTE.
- Trace output needed to surface waive attribution (source/actor/reason) for acceptance verification.

## Decisions
- Treat missing TPM equipment master data as a FAILED readiness item when EQUIPMENT gate is enabled, so the degraded-path scenario is deterministic without external sync.
- Extend Trace `readiness.waivedItems` to include `source=WAIVE`, `waivedAt`, `waivedBy`, `waiveReason`, plus `failReason` and `evidenceJson` for context.
- Acceptance scenario `readiness-waive` temporarily enables external readiness gates on the target line via API, waives failed items, verifies Trace, then restores the previous readiness config (best-effort).

## Plan
1) Adjust readiness check behavior for deterministic failures
2) Add waive attribution fields to Trace schema/service
3) Update acceptance script to waive external gates and verify Trace
4) Mark 3.2.4 tasks done and verify via bun

## Open Questions
- None.

## References
- `apps/server/src/modules/mes/readiness/service.ts`
- `apps/server/src/modules/mes/trace/service.ts`
- `apps/server/src/modules/mes/trace/schema.ts`
- `apps/server/scripts/test-mes-flow.ts`
- `domain_docs/mes/plan/phase3_tasks.md`
