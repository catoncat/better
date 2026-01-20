---
type: worktree_note
createdAt: "2026-01-20T05:53:12.456Z"
branch: "permission-audit"
baseRef: "origin/main"
task:
  title: "permission audit + fixes"
---

# permission-audit - permission audit + fixes

## Scope
- Goal: audit role/page/API permissions for MES pages and apply fixes for missing permissions, UI gating, and 403 handling.
- Non-goals: unrelated feature work outside the permission audit.
- Risks: wide touch surface across routes/modules; matrix can be large.

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: inventory roles + permissions + API permission map
- [x] Slice 2: page permission map + role/page access matrix
- [x] Slice 3: issues list + proposed fixes
- [x] Slice 4: implement fixes (roles/UI/403 handling) + update docs

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-20T05:53:12.456Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - bun.lock
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Work in dedicated worktree; treat MES routes/modules as primary scope.

## Findings
- Worktree created; `bun.lock` modified by `bun install`.
- Preset roles: planner lacks readiness/loading/quality permissions; engineer lacks run/create/authorize; operator only exec/trace/readiness/loading. Admin covers core view + system. See `packages/db/src/permissions/preset-roles.ts`.
- Permissions catalog covers WO/RUN/EXEC/ROUTE/QUALITY/READINESS/LOADING/TRACE/SYSTEM; no extra role-specific hints. See `packages/db/src/permissions/permissions.ts`.
- Server run routes: list/detail/units require `run:read`, close requires `run:close`, authorize/revoke + unit gen/delete require `run:authorize`. See `apps/server/src/modules/mes/run/routes.ts`.
- Run detail page loads run detail, units, readiness latest, FAI gate/records, OQC detail; imports `Permission`, `Can`, `useAbility`. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Run detail page UI gates: authorize/revoke (`run:authorize`), closeout (`run:close`), trial/start execution (`exec:track_in`); readiness action gating uses `hasPermission(READINESS_CHECK)`. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Run detail page renders readiness/FAI/OQC sections without `READINESS_VIEW`, `QUALITY_FAI`, or `QUALITY_OQC` gating; only MRB decision is gated by `quality:disposition`. This can trigger 403s for roles lacking view permissions. See `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Existing demo issue #6 documents missing UI permission gating and 403 handling for `/mes/runs/:runNo`. See `user_docs/demo/acceptance_issues.md`.
- Query client has no special retry/403 handling yet; default options only set staleTime/gcTime/refetchOnWindowFocus. See `apps/web/src/lib/query-client.ts`.
- API error handling (`apps/web/src/lib/api-error.ts`) maps known MES codes to messages but has no explicit 403/permission messaging.
- Eden `unwrap` throws `ApiError` with HTTP status when backend returns 403; no special handling for permission errors beyond status/message. See `apps/web/src/lib/eden.ts`.
- Runs list page uses `useRunList` (run:read) and gates batch authorize with `run:authorize`; run create button gated by `run:create`. See `apps/web/src/routes/_authenticated/mes/runs/index.tsx`.
- Readiness/FAI hooks only gate queries by runNo; no permission-aware `enabled` options, so callers always fetch unless they add guards. See `apps/web/src/hooks/use-readiness.ts` and `apps/web/src/hooks/use-fai.ts`.
- OQC hooks similarly fetch by runNo without permission-aware `enabled`; error toasts use `getApiErrorMessage` with generic fallback. See `apps/web/src/hooks/use-oqc.ts` and `apps/web/src/hooks/use-api-error.ts`.
- Readiness API permissions: latest/history/exceptions require `readiness:view`, precheck/formal require `readiness:check`, waive requires `readiness:override`. See `apps/server/src/modules/mes/readiness/routes.ts`.
- FAI/OQC API endpoints (list/detail/run/gate/start/complete) all require `quality:fai` / `quality:oqc`. See `apps/server/src/modules/mes/fai/routes.ts` and `apps/server/src/modules/mes/oqc/routes.ts`.
- Run detail page fixes in progress: add permission gating for readiness view/override and suppress FAI/OQC queries unless permitted.
- Work order APIs require `wo:read` for list, `wo:release` for release, `run:create` for create run, `wo:update` for pick status, `wo:close` for close. See `apps/server/src/modules/mes/work-order/routes.ts`.
- Execution APIs require `exec:track_in`/`exec:track_out` for resolve unit, track-in, track-out, and data-specs. See `apps/server/src/modules/mes/execution/routes.ts`.
- MRB decision/rework endpoints require `quality:disposition`. See `apps/server/src/modules/mes/oqc/mrb-routes.ts`.
- Audit report drafted at `user_docs/demo/permission_audit_report.md`.
- `bun install` updated `bun.lock` to include `@better-app/shared` workspace entries.
- Flow docs reviewed: E2E and SMT specify readiness → loading → FAI → authorize → execution → OQC/MRB; permission design should align per step and not per role. See `domain_docs/mes/spec/process/01_end_to_end_flows.md` and `domain_docs/mes/spec/process/03_smt_flows.md`.
- DIP flow adds prep/FAI gate, multi-stage IPQC-like checks, OQC/MRB; needs permission mapping per block rather than per role. See `domain_docs/mes/spec/process/04_dip_flows.md`.
- Added plan note at `conversation/2026-01-20_142730_permission_audit_plan.md`.

## Open Questions
-

## Errors
- Attempted to write conversation note with `cat >`, failed due to `zsh: file exists`; next approach: write via `cat >|` or `apply_patch` to overwrite.
- `git add` failed because `$runNo` expanded in path; next approach: quote or escape the path when adding.
- `bun scripts/smart-verify.ts` failed: Biome wants import sorting + formatting in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: run `bun run format` or apply suggested import order + formatting, then re-run verify.
- `bun scripts/smart-verify.ts` failed again after format; remaining issue is import ordering in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`; next approach: manually reorder imports to match Biome suggestion, then re-run verify.
