# permission audit

## Context
- User requested a permission audit and fixes in a new worktree.
- Scope focused on MES core pages and related API permissions.

## Decisions
- Add `readiness:view` to planner role.
- Gate readiness/FAI/OQC sections and related queries on `/mes/runs/:runNo` by permission.
- Improve global 401/403 handling and disable React Query retries for 401/403.

## Plan
- Inventory roles/permissions and core API permission mapping.
- Map core pages to permissions and compile role/page matrix.
- Implement fixes (roles/UI gating/403 handling).
- Document results in `user_docs/demo/permission_audit_report.md`.

## Findings
- Run detail page fetched readiness/FAI/OQC without permission gating; waiver action was gated by the wrong permission.
- Readiness view requires `readiness:view`, waive requires `readiness:override`.
- FAI/OQC endpoints require `quality:fai` / `quality:oqc`, MRB requires `quality:disposition`.

## Progress
- Updated preset roles to add `readiness:view` for planner.
- Added permission-aware query enables and UI gating in `/mes/runs/:runNo`.
- Updated API error handling for 401/403 and React Query retry policy.
- Drafted audit report at `user_docs/demo/permission_audit_report.md`.

## Errors
- Initial attempt to write this note failed due to `zsh: file exists` when using `cat >`; resolved by patching file content.

## Open Questions
- Whether additional roles should gain `quality:fai` / `quality:oqc` vs. hiding those sections.
- Whether to expand audit coverage for remaining MES pages (data-collection, integration, materials, boms, etc.).

## References
- `packages/db/src/permissions/preset-roles.ts`
- `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
- `apps/web/src/lib/api-error.ts`
- `apps/web/src/lib/query-client.ts`
- `user_docs/demo/permission_audit_report.md`
