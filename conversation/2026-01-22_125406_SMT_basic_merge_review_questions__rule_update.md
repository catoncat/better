# SMT basic merge review questions + rule update

## Context
- User requested clearer decision-support context for open questions during smt-basic vs SMT gap review.
- Also asked to add a global rule to always provide context/options/impact/recommendation when asking decisions.

## Decisions
- Add global rule to AGENTS.md requiring context/options/impact/recommendation for decision questions.

## Plan
- Provide expanded explanations for the three review questions with recommendations.
- Update AGENTS.md.

## Findings
- smt-basic records allow null lineId (lineCode optional), no run/route linkage, and use readiness permissions for prep record CRUD.

## Progress
- Updated AGENTS.md with the new rule.

## Errors
- None.

## Open Questions
- None (awaiting user responses on the three clarified decisions).

## References
- `AGENTS.md`
- `packages/db/prisma/schema/schema.prisma`
- `apps/server/src/modules/mes/smt-basic/schema.ts`
- `apps/server/src/modules/mes/smt-basic/service.ts`
