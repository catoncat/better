# MES new issues review and next steps

## Context
- User asked to review newly added items in `domain_docs/mes/plan/tasks.md` and confirm what to do first.
- Focused on new items in 5.2.5+ and 5.3.

## Decisions
- Prioritize P1 bugs and operator-blocking issues first: 5.2.9, 5.2.16, 5.2.10.
- Treat execution-page UX blockers as the next slice (5.2.5/5.2.11/5.2.12), then lower-risk UX items.
- Keep 5.3 (API error handling audit) as a separate, cross-cutting track.

## Plan
1. Fix execution bug + incorrect error messages (5.2.9, 5.2.16) and add front-end toast handling (5.2.10).
2. Improve execution queue visibility and routing context (5.2.5, 5.2.11, 5.2.12).
3. Add FAI mode hints and filter UX polish (5.2.6, 5.2.7, 5.2.8, 5.2.13).
4. Tackle data model integrations (5.2.14, 5.2.15).
5. Run 5.3 error-handling audit as a dedicated effort.

## Findings
- Execution page currently misses critical defect metadata capture (5.2.9) and misleads operators post-FAI (5.2.16).
- Missing error toasts (5.2.10) will hide failures and block remediation.
- Operators lack queue and next-step visibility (5.2.5/5.2.11/5.2.12), which is a high UX friction for throughput.
- 5.2.14/5.2.15 imply new data contracts (FAI checklist + trackout integration) and should be scoped before coding.
- 5.3 is cross-module and needs shared error handling patterns before implementation.

## Progress
- Review of new issues complete; no code changes in this step.

## Errors
- None.

## Open Questions
- For 5.2.5/5.2.11/5.2.12, do we already have APIs to fetch queued units and next-step routing, or should new endpoints be added?
- For 5.2.14/5.2.15, should FAI checklist be derived from `DataCollectionSpec` or a new template entity?
- For 5.3, do we want a shared error-code registry in `packages/shared` now, or later once UX fixes land?

## References
- `domain_docs/mes/plan/tasks.md:338`
- `domain_docs/mes/plan/tasks.md:342`
- `domain_docs/mes/plan/tasks.md:349`
- `domain_docs/mes/plan/tasks.md:402`
