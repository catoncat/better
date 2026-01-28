---
type: worktree_note
createdAt: "2026-01-28T10:39:00.800Z"
branch: "feat/mes-routing-fai-template"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT 路由管理 + FAI 模板绑定"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  triageNote: "SMT 路由自建 + FAI 模板绑定 + ERP 工单路由绑定"
---

# feat/mes-routing-fai-template - SMT 路由管理 + FAI 模板绑定

## Scope
- Goal: 支持 MES 自建 SMT 路由、FAI 模板绑定与门禁一致；ERP 工单同步可稳定绑定路由并允许覆盖。
- Non-goals: 不引入分支路由/条件跳过，不实现 IPQC。
- Risks: DB 迁移与路由快照字段变更涉及多模块，需小步提交。

## Slices
- [x] Slice 0: worktree note context
- [x] Slice 1: 规格与计划对齐（routing/inspection/plan）
- [x] Slice 2: DB Schema + Migration（FAI 模板 + 路由绑定）
- [x] Slice 3: Server 路由/模板/门禁（API + 快照 + FAI items）
- [x] Slice 4: ERP 工单路由解析与覆盖
- [x] Slice 5: Web 管理与执行（模板管理/路由绑定/FAI 录入）
- [x] Slice 6: 测试 + Align 文档

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-29T05:17:34+08:00
- BaseRef: origin/main
- CommitsAheadOfBase: 18
- Dirty: false
- ChangedFiles: (none)
- Next:
  - Verify: bun scripts/smart-verify.ts --force
  - Push: git push -u origin feat/mes-routing-fai-template
<!-- AUTO:END status -->

## Decisions
- 路由来源：SMT 使用 MES 自建路由；ERP 路由只读保留。
- FAI 形态：结构化模板。
- 绑定范围：路由级单一 FAI 模板（Run 级门禁）。

## Findings
- UI 规范：仅使用语义色变量（bg-background/bg-card/text-foreground 等），表单控件需 `w-full`，列表页走 FilterToolbar + QueryPresetBar 模式。
- 现有 FAI 页面使用“记录检验项”弹窗新增 item（`apps/web/src/routes/_authenticated/mes/fai.tsx`），无模板项编辑逻辑；需新增更新接口调用。
- 路由详情页 `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx` 已有步骤列表（含 `requiresFAI`），可在路由信息卡附近加入模板绑定 UI。
- `apps/web/src/routes/_authenticated/mes/data-collection-specs/index.tsx` 是 DataListLayout 标准范例，可复用其过滤/预设/卡片结构做 FAI 模板管理页。

## Open Questions
-

## Errors
- 2026-01-28: apply_patch failed on `domain_docs/mes/spec/routing/03_route_execution_config.md` due to context mismatch when inserting FAI template binding section. Next approach: use scripted insert to add a new section after the FAI gate block.
- 2026-01-28: python not found when running insert script. Next approach: use python3.
- 2026-01-28: failed to write `apps/server/src/modules/mes/fai-template/schema.ts` because directory did not exist. Next approach: create folder then write file.
