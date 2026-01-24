# mes-triage_next-steps

## Context
- User asked “接下来做什么” for MES (M3 Go-Live Readiness).
- Triage source of truth: `domain_docs/mes/plan/phase3_tasks.md` pending items.
- Repo status: `main` was clean at triage time; user later confirmed the previous doc/worktree noise is resolved.

## Decisions
- Shortlist focuses on `[ ]` P0 go-live blockers in `phase3_tasks.md` (deployment + ops SOP + training/SOP).
- Grouped into parallel tracks to minimize shared touch points; call out conflict with the in-flight worktree.

## Plan
- Worktree Scan
  - Current: `/Users/envvar/lzb/better` (main)
  - In-flight:
    - `/Users/envvar/lzb/better-3.5.2` (`feat/3.5.2-dc-spec-web`) `[dirty, behind 29]`
      - last: `docs(mes): update phase3 progress for 3.5.3-3.5.5`

- Track A: Ops & Deployment Readiness (P0)
  - Candidates:
    - `3.3.1 单体部署清单化`: why now P0 上线阻断；depends on `bun run build:single`/实际运行验证；touch points `domain_docs/mes/plan/phase3_tasks.md`, `agent_docs/05_ops/single_binary_deployment.md`, build scripts/config
    - `3.3.2 SQLite 备份/恢复/升级 SOP`: why now 上线必备可回滚；depends on `3.3.1` 的 DB 路径/部署方式定稿；touch points `agent_docs/05_ops/single_binary_deployment.md`, `packages/db/*`(migrate), runbook
    - `3.3.3 日志与审计最低配置`: why now 上线可运维的最低保障；depends on 运行模式/部署参数确定；touch points `apps/server/*` logging, `apps/server/src/modules/*` audit usage, ops docs

- Track B: Training & Degraded-Mode SOP (P0)
  - Candidates:
    - `3.4.1 角色化操作手册`: why now 交付/培训与验收口径；depends on 现有 RBAC/页面入口盘点；touch points `user_docs/`, `apps/web/src/routes/_authenticated/mes/*`, `packages/db/src/permissions/*`
    - `3.4.4 外部集成降级 SOP`: why now 集成不稳定时仍可生产；depends on 现有“豁免/手动降级”能力核对；touch points `user_docs/`, `apps/server/src/modules/mes/integration/*`, `apps/web/src/routes/_authenticated/mes/*`

- Conflicts:
  - `Track B` blocks in-flight `/Users/envvar/lzb/better-3.5.2`: both likely touch `apps/web/src/routes/_authenticated/mes/*` (merge conflict risk).

- Selection Prompt
  - Pick one track (A/B) or one candidate (3.3.1/3.3.2/3.3.3/3.4.1/3.4.4).
  - If you want a dedicated worktree, I’ll propose: `bun scripts/worktree-new.ts <branch> <path>`.

## Open Questions
- Which track/candidate should we implement first?
- Do you want a new worktree for the chosen item?

## References
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/phase3_tasks.md`
- `domain_docs/mes/plan/01_milestones.md`
- `bun scripts/worktree-scan.ts`

## Selected
- User selected: Track A (Ops & Deployment Readiness)
- Worktree created for Track A:
  - branch: `feat/3.3-ops-deployment`
  - path: `/Users/envvar/lzb/better-3.3`

## Track A Notes (for parallel agents)
- `DATABASE_URL` should point to a SQLite file path (not a directory):
  - Runtime uses `new Database(<path>)` via `packages/db/src/bun-sqlite-adapter.ts` and a directory path fails.
  - Ops docs should standardize examples like `DATABASE_URL=file:/var/lib/better-app/db.db` (and local `file:./data/db.db`).
- Web serving modes:
  - `apps/server/src/web/config.ts` defaults to `embedded` in production or when running as a compiled binary.
  - If embedded assets are missing, `apps/server/src/web/serve-web.ts` throws with a clear message; `bun run build:single` must include `gen:web-embed`.
- TLS:
  - `apps/server/src/index.ts` requires both `APP_TLS_CERT_PATH` + `APP_TLS_KEY_PATH` set together; it reads PEM text from disk at startup.
- Audit logs:
  - API exists: `apps/server/src/modules/audit/routes.ts` (prefix `/api/audit-logs`).
  - Web UI route does not currently exist under `apps/web/src/routes/_authenticated/system/*` (candidate work for `3.3.3` if we want UI access).
