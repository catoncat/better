## Context
- 发现路由详情页“新增执行配置”的作用域选择过度设计：ROUTE / OPERATION / STEP / SOURCE_STEP。
- STEP 与 SOURCE_STEP 实现上等效但 UI 分离；OPERATION 跨路由共享实际很少用，增加理解成本。

## Decisions
- UI 仅保留 2 种作用域：`全局默认(ROUTE)` 与 `按步骤覆盖(STEP)`。
- 后端编译/就绪检查逻辑仅使用 `STEP(含 sourceStepKey 匹配)` + `ROUTE`，不再引入 OPERATION 层覆盖。
- API 创建执行配置仅接受 `scopeType: ROUTE|STEP`，STEP 通过 `stepNo` 选择步骤并在服务端自动写入 `routingStepId` 与可用的 `sourceStepKey`。

## Plan
1. Inspect current scope behavior
2. Simplify UI scope options
3. Update server resolution logic
4. Run lint and typecheck
5. Update docs and conversation note

## Open Questions
- 是否需要提供独立的“跨路由（OPERATION）配置管理”入口（而不是在路由详情页创建/展示）？
- 现存的 OPERATION 级配置是否需要迁移/清理（当前已不再参与路由编译优先级）？

## References
- `apps/server/src/modules/mes/routing/service.ts`
- `apps/server/src/modules/mes/routing/schema.ts`
- `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
- `user_docs/demo/演示问题记录.md`
