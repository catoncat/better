# mes-triage_next-work

## Context
- User asked: “MES 接下来做什么”.
- Current phase is M3 “Go-Live Readiness”; progress tracker is `domain_docs/mes/plan/phase3_tasks.md`.
- Repo is not clean in current worktree; treat this checkout as unstable for implementation.
- Worktrees exist and some are in-flight; these are conflict signals for parallel tracks.

## Decisions
- No track selected yet (awaiting user choice).

## Plan
### Worktree Scan (conflict signals)

- Current: `/Users/envvar/lzb/better` (main) — **dirty**
- In-flight:
  - `/Users/envvar/lzb/better-3.5.2` (`feat/3.5.2-dc-spec-web`) — **dirty, ahead 2**; touch `db/server/web`
  - `/Users/envvar/lzb/better-wt-m3-e2e-seed-hardening` (`m3-e2e-seed-hardening`) — **dirty, behind 48**; touch `server`

### Tracks + Candidates

- Track C: `Ops & Deployment Readiness` (M3 P0)
  - Candidates:
    - `3.3.1 单体部署清单化`: unblock go-live install/run; depends on current build/runtime reality; touch points `agent_docs/05_ops/single_binary_deployment.md`, `README.md`
    - `3.3.2 SQLite 备份/恢复/升级 SOP`: unblock safe upgrades/rollback; depends on agreed data-dir + db deploy flow; touch points `agent_docs/05_ops/single_binary_deployment.md`, `agent_docs/00_onboarding/setup.md`

- Track E: `Data Collection 配置` (M3 P0)
  - Candidates:
    - `3.5.2 Web 采集项管理页`: unblock engineers to manage specs; depends on `3.5.1` API (done); touch points `apps/web/src/routes/_authenticated/mes/data-collection-specs/*`, `apps/web/src/hooks/use-data-collection-specs.ts`
    - `3.5.3 路由绑定体验升级`: unblock route config without manual IDs; depends on `3.5.2` (recommended) + compile support; touch points `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`, `apps/server/src/modules/mes/routing/service.ts`
    - `3.5.4 Execution TrackOut 采集入口`: unblock execution-side input + validation; depends on `3.5.3.2` snapshot binding; touch points `apps/web/src/routes/_authenticated/mes/execution.tsx`, `apps/server/src/modules/mes/execution/schema.ts`

### Conflicts

- `Track E` likely conflicts with in-flight `/Users/envvar/lzb/better-3.5.2`: both touch MES web routes/hooks (and possibly server module wiring).
- `Track C` is mostly doc-only; low code conflict with `Track E` (but may overlap `README.md` edits if Track E adds usage notes).

Selection prompt: Pick one track or one candidate; I will confirm scope and start plan-first implementation.

## Open Questions
- Pick one: `3.3.1` / `3.3.2` / `3.5.2` / `3.5.3` / `3.5.4`.
- For the chosen item: use existing worktree (e.g. `/Users/envvar/lzb/better-3.5.2`) or create a new dedicated worktree?
- Any hard go-live date / target environment constraints for the Ops docs (TLS, ports, data dir policy)?

## References
- `domain_docs/mes/CONTEXT.md`
- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/plan/phase3_tasks.md`
