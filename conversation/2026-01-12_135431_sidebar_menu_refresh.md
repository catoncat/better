# Context

Sidebar 菜单由 `apps/web/src/config/navigation.ts` 的 `navMain` 手动维护；近期新增了若干页面/路由，但未同步到菜单，导致入口缺失且分组过长。

# Decisions

- 将 MES 菜单拆分为 5 个折叠分组：生产执行 / 准备与防错 / 质量管理 / 工艺与主数据 / 集成与运维，降低单组长度并贴合业务使用路径。
- 补齐缺失页面入口：准备检查配置、上料槽位配置、集成状态监控、耗材状态录入。
- 修正「系统管理」分组的顶层权限集合，使仅拥有 `SYSTEM_CONFIG` 或 `SYSTEM_INTEGRATION` 的用户也能看到该分组。
- 优化侧边栏激活态：子项使用“最长前缀命中”策略，详情页（如 `/mes/runs/$runNo`）也能正确高亮所属菜单；折叠状态下分组同样高亮。

# Plan

1. 对照现有路由盘点缺失菜单项
2. 重构 `navMain` 并设计分组
3. 校正菜单激活态匹配逻辑
4. 运行 `bun run lint` / `bun run check-types`

# Open Questions

- `/system/test-upload` 属于测试页：是否需要在侧边栏提供入口，还是保留为“仅直达 URL”的内部页？
- 后续是否要引入“路由元数据 -> 自动生成导航”的机制，避免再次漏配？

# References

- `apps/web/src/config/navigation.ts`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/routes/_authenticated/mes/readiness-config.tsx`
- `apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx`
- `apps/web/src/routes/_authenticated/mes/integration/status.tsx`
- `apps/web/src/routes/_authenticated/mes/integration/manual-entry.tsx`
