## Context
- `mes/oqc/rules` 页面访问时显示成了 `mes/oqc` 的内容。
- 仓库使用 TanStack Router file-based routing，并提交生成文件 `apps/web/src/routeTree.gen.ts`。

## Decisions
- 根因：`apps/web/src/routes/_authenticated/mes/oqc.tsx` 作为父路由存在，但页面组件不渲染 `<Outlet />`，导致子路由 `mes/oqc/rules` 只能显示父页面。
- 方案：对齐 repo 内类似 `mes/loading/*` 的路由结构，移除 segment 父文件路由，改为目录 index 路由，让 `mes/oqc` 与 `mes/oqc/rules` 成为同级路由（仍保持 URL 不变）。

## Plan
1. 检查 `oqc` 路由结构与生成的 `routeTree.gen.ts`
2. 将 `mes/oqc` 列表页移动到 `mes/oqc/index.tsx`
3. 重新生成路由树并通过 `bun run lint` / `bun run check-types`

## Open Questions
- 无

## References
- `apps/web/src/routes/_authenticated/mes/oqc/index.tsx`
- `apps/web/src/routes/_authenticated/mes/oqc/rules.tsx`
- `apps/web/src/routeTree.gen.ts`
