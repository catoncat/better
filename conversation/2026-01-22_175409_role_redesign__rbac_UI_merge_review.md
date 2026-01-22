# Context
- 用户要求对刚合并的 `role-redesign-v2` 与 `role-rbac-ui` 进行代码 review。

# Decisions
- Review 范围锁定在角色重构与角色/用户管理 UI 的提交区间。

# Plan
- 以 `f800839..02332fe` 范围查看变更（排除后续 FAI 相关提交）。
- 核查权限/角色映射、种子脚本、用户绑定校验、前端 UI gating。

# Findings
- main 目前比 origin/main ahead 40 commits；需从 role 相关提交中提取差异。
- 可见 role 相关提交区间：`cdef749..02332fe`。

# Progress
- 创建 review 记录文件。

# Errors
- 无。

# Open Questions
- Review 期间若发现角色/权限映射缺口需确认。

# References
- `git log --oneline origin/main..main`

## Findings (update 1)
- `packages/db/src/permissions/preset-roles.ts`: admin dropped `DATA_SPEC_CONFIG` + `LINE_CONFIG`; planner gains `RUN_AUTHORIZE/RUN_REVOKE/RUN_CLOSE`; leader removed; new roles `material` + `trace`; operator gains `EXEC_DATA_COLLECT`.
- Default role priority updated to include `material`/`trace`; role home pages now route `material` → `/mes/loading`, `trace` → `/mes/trace`.

## Findings (update 2)
- `apps/server/scripts/seed.ts`: test users updated to `material` and `trace`; line binding now targets `material` role.
- `apps/server/scripts/seed-demo.ts`: leader user lookup removed; need to verify no remaining references to `leaderUser` later in file.

## Findings (update 3)
- `apps/server/scripts/smt-demo-dataset.ts` and `apps/server/scripts/test-mes-flow.ts` reassign actions across new roles: loading → material, readiness/trace → quality, execution → operator, authorize/close → planner. Run creation moved to planner in test script.

## Findings (update 4)
- `apps/server/src/modules/users/service.ts`: new binding validation uses role `dataScope` to require line/station bindings on create/update.
- `apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx`: client-side validation only checks role codes `material` and `operator`. Potential mismatch: custom roles with `ASSIGNED_LINES/ASSIGNED_STATIONS` will be rejected server-side but won’t show inline client error.

## Findings (update 5)
- `apps/web/src/routes/_authenticated/system/role-management.tsx`: system roles now sorted by explicit order (admin→trace), then non-system by name.
- `apps/web/src/routes/_authenticated/system/user-management.tsx`: system presets expanded to include all new role codes (admin/planner/engineer/quality/material/operator/trace).

## Findings (update 6)
- `apps/web/src/lib/constants.ts` and `apps/web/src/components/login-form.tsx` updated to replace leader with material + trace roles and updated descriptions.

## Findings (update 7)
- `rg -n "leader"` found no remaining code references under `apps/` or `packages/`.

## Findings (update 8)
- `apps/server/scripts/seed-demo.ts`: no remaining `leaderUser` references; no `material` references either (script may only need quality/operator).

## Findings (update 9)
- Located loading permissions in `apps/server/src/modules/mes/loading/routes.ts`: verify/replace/load-table use `LOADING_VERIFY`; slot/slot-mapping admin + unlock use `LOADING_CONFIG`.

## Findings (update 10)
- `apps/server/scripts/smt-demo-dataset.ts`: feeder slot unlock is executed by `engineer`, not material; aligns with `LOADING_CONFIG` requirement.

## Findings (update 11)
- `packages/db/src/permissions/preset-roles.ts`: engineer role still includes `LOADING_CONFIG`, so unlock operations assigned to engineer align with permissions.

## Findings (update 12)
- `apps/server/src/modules/users/service.ts`: default role fallback is `operator`. With new binding validation, a create/update without station bindings will now fail if operator is assigned (including when roleIds omitted and fallback applies).

## Findings (update 13)
- `apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx`: client requires at least one role, so default-role fallback should not trigger via UI.
- `apps/server/src/modules/users/schema.ts`: API still allows optional `roleIds`, so non-UI callers can trigger default `operator` + station binding requirement.

## Findings (update 14)
- UI validation lines for role code checks: `apps/web/src/routes/_authenticated/system/-components/user-dialog.tsx:74-96`.
- Server binding validation/default role lines: `apps/server/src/modules/users/service.ts:109-159`.

## Findings (update 15)
- `packages/db/src/permissions/preset-roles.ts`: admin/planner permission sets at lines 13-52; material/operator/trace roles at lines 98-128; role priority/home pages at lines 136-156.
