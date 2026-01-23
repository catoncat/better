---
type: worktree_note
createdAt: "2026-01-23T13:26:20.000Z"
branch: "feat/mes-test-framework"
baseRef: "origin/main"
task:
  title: "MES 测试框架落地（bun:test + integration helpers + acceptance 入口）"
touchPoints:
  - "apps/server/src/index.ts"
  - "apps/server/src/plugins/prisma.ts"
  - "packages/db/src/index.ts"
  - "scripts/mes-acceptance.ts"
  - "package.json"
  - "domain_docs/mes/tests/*"
---

# feat/mes-test-framework - MES 测试框架落地（bun:test + integration helpers + acceptance 入口）

## Scope
- Goal:
  - 为 `apps/server` 增加可运行的 `Unit/Integration`（bun:test）骨架与 helper（测试 DB、server 启动、API client）。
  - 让现有 `mes:acceptance`（`scripts/mes-acceptance.ts` + `apps/server/scripts/test-mes-flow.ts`）成为标准 `test:acceptance` 入口，并支持 CI 产出 JSON/junit（可选）。
  - 将 playbook 的 validation 与自动化入口建立映射文件（Specs ↔ Tests map）。
- Non-goals:
  - 不在本次一次性补齐大规模用例覆盖；只提供框架与 1-2 个示例用例验证链路通。
  - 不引入 Husky pre-commit（团队已有本地工作流），质量门槛以 CI 为主。
- Risks:
  - `@better-app/db` 当前默认导出 singleton PrismaClient；需要确保 integration tests 运行时可隔离 DB 且不受并发影响。
  - server 入口当前模块加载即 listen；需要重构而不破坏 prod 启动与 build/compile。

## Slices
- [x] Slice 1: Server 入口重构（createApi/createApp/startServer）
- [x] Slice 2: Integration helpers（test DB + subprocess server + API client）
- [x] Slice 3: Unit/Integration 示例用例 + 根 scripts（test:*）
- [ ] Slice 4: Acceptance runner 输出增强（JSON/junit 已完成）+ 文档映射文件

<!-- AUTO:BEGIN status -->
## Status (auto)
- UpdatedAt: 2026-01-23T09:36:00Z
- BaseRef: main (rebased)
- CommitsAheadOfBase: 2
- Dirty: no
- ChangedFiles:
  - apps/server/src/app.ts (createApi/createApp/startServer)
  - apps/server/src/index.ts (thin wrapper)
  - apps/server/src/testing/** (helpers + tests)
  - apps/server/scripts/test-mes-flow.ts (junit output)
  - scripts/mes-acceptance.ts (junit passthrough)
  - domain_docs/mes/tests/01_acceptance_scenarios.md
  - package.json (test:* scripts)
- Next:
  - Add Specs ↔ Tests mapping file (02_playbook_to_tests_map.md)
  - Consider adding more integration tests for MES-specific scenarios
<!-- AUTO:END status -->

