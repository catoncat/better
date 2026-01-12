# mes-triage_next-work

## Context
- User asked “接下来做什么” for MES; run a plan-based triage using `domain_docs/mes/plan/phase3_tasks.md` (M3 is current) and current repo/worktree status.

## Decisions
- None yet; waiting for user to pick one track/candidate.

## Plan
- Worktree Scan
  - Current: `/Users/envvar/lzb/better (main)`
  - In-flight:
    - `/Users/envvar/lzb/better-wt-m3-e2e-seed-hardening (m3-e2e-seed-hardening)` `[dirty, behind 48]` touch: `server` (seed scripts)

- Track A: `Data Collection` end-to-end (P0)
  - Candidates:
    - `3.5.2 Web: 采集项管理页（列表 + 新增/编辑对话框）`: unblocks engineer self-serve config; depends on `3.5.1` API already done; touch points `domain_docs/mes/plan/phase3_tasks.md`, `apps/web/src/routes/_authenticated/mes/*` (new page), `apps/server/src/modules/mes/data-collection-spec/*` (API/types)
    - `3.5.3 Web: 路由配置绑定体验升级（替换 dataSpecIdsText 手填）`: removes manual IDs; depends on `3.5.2` (or at least a selector backed by `3.5.1`); touch points `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`, `apps/server/src/modules/mes/routing/service.ts`
    - `3.5.4 Execution: 手工数据采集入口补齐（TrackOut 时录入）`: makes bound specs actually collectible; depends on `3.5.3` snapshot/binding + server validation; touch points `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/server/src/modules/mes/execution/schema.ts`

- Track B: `Ops & Deployment` readiness (P0)
  - Candidates:
    - `3.3.1 单体部署清单化：构建、运行、TLS、端口、Web 模式、DB 路径`: required for go-live; depends on existing `bun run build:single`; touch points `agent_docs/05_ops/single_binary_deployment.md`, `README.md` (if needed)

- Conflicts
  - `Track A` internal overlap: `3.5.2/3.5.3/3.5.4` all touch `apps/web/src/routes/_authenticated/mes/*` and some touch routing/execution core; avoid doing them in parallel.
  - In-flight worktree overlap: avoid touching `apps/server/scripts/seed*.ts` in the same branch as `Track A/B` unless we intentionally merge seed-hardening work.

- Selection Prompt
  - Pick one track or one candidate; I will confirm scope and start plan-first implementation.
  - Also confirm whether you want a dedicated worktree for the chosen item.

## Open Questions
- Pick one: `3.5.2` / `3.5.3` / `3.5.4` / `3.3.1` (or pick Track A/Track B).
- Worktree: stay on `main` or create a dedicated worktree/branch for the chosen item?

## References
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/plan/phase3_tasks.md`
- `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
- `apps/web/src/routes/_authenticated/mes/execution.tsx`
- `apps/server/src/modules/mes/data-collection-spec/routes.ts`
- `apps/server/src/modules/mes/routing/service.ts`
