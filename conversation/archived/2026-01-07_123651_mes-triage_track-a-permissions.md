# MES Triage: Track A 权限收尾

> 时间: 2026-01-07 12:36
> 状态: 已选定

## Context

M2 阶段接近收尾，根据 `phase2_tasks.md` 第 4 节 Review Notes/Gaps，剩余收尾项：
- G1: Readiness 权限纳入默认角色
- G2: Readiness 配置页 + 配置 API
- G3: FAI/TrackOut 读取检测结果（SPI/AOI 集成）

## Triage Output

当前进度快照:
- M1 系列 (M1 ~ M1.8) 已全部完成
- M2 (Quality Control) 几乎全部完成
- M3/M4 尚未启动

待选任务分析 (phase2_tasks.md 第 4 节 Review Notes/Gaps):

| #  | 任务                                      | 依赖      | 主要触点                              |
|----|-------------------------------------------|-----------|---------------------------------------|
| G1 | Readiness 权限纳入默认角色                | 无        | permissions.ts, preset-roles.ts       |
| G2 | Readiness 配置页 + 配置 API               | G1 可并行 | readiness/routes.ts, Web UI           |
| G3 | FAI/TrackOut 读取检测结果（SPI/AOI 集成） | 无        | execution/service.ts, integration/*   |

并行 Track 划分:

Track A: M2 收尾 - 权限 + 配置
- G1 Readiness 权限加入默认角色
  - 为何现在: 缺失会导致新建用户无法使用就绪检查
  - 依赖: 无
  - 触点: permissions.ts, preset-roles.ts
- G2 Readiness 配置页 + API
  - 为何现在: 产线实操需要可调检查项开关
  - 依赖: 无 (与 G1 可并行)
  - 触点: readiness/routes.ts, Web UI

Track B: M2 收尾 - 检测结果集成
- G3 FAI/TrackOut 读取 SPI/AOI 检测结果
  - 为何现在: 当前 FAI 与 TrackOut 仅做空壳读取，集成未闭环
  - 依赖: 无
  - 触点: execution/service.ts, integration/service.ts

Track C: M3 启动 - Data Collection
- M3-Prep 确定数据采集点、设计 Schema
  - 为何现在: M2 功能接近收尾，可并行规划
  - 依赖: 无 (规划阶段)
  - 触点: plan/, spec/data_collection/, 新 Prisma 模型设计

Conflicts (不可并行):

| 冲突组       | 原因                                    |
|--------------|-----------------------------------------|
| G3 ↔ Track A | 无冲突                                  |
| G3 ↔ M3-Prep | 无冲突 (G3 改现有代码，M3-Prep 做规划) |
| G1 ↔ G2      | 无冲突 (同模块但不同文件层)            |

选择提示:
1. Track A - M2 收尾 (权限 + 配置)
2. Track B - M2 收尾 (检测结果集成)
3. Track C - M3 规划 (Data Collection)
4. 单独任务 (G1 / G2 / G3 / M3-Prep)

## Decisions

用户选择 **Track A**，包含：
1. **G1** Readiness 权限加入默认角色 (`permissions.ts`, `preset-roles.ts`)
2. **G2** Readiness 配置页 + API (`readiness/routes.ts`, Web UI)

## Plan

1. G1: 权限常量检查 + 默认角色补齐
   - 确认 `readiness:view/check/override/config` 已在权限字典
   - 将权限加入 `preset-roles.ts` 中的运行/质量相关角色
2. G2: 配置 API + UI
   - 设计配置数据结构（检查项开关、规则参数）
   - 实现配置 CRUD API
   - 实现配置管理 UI

## Open Questions

- 配置项粒度：按产线/工单/全局？
- 是否需要配置版本控制？

## References

- `domain_docs/mes/plan/phase2_tasks.md` 第 4 节
- `packages/db/src/permissions/permissions.ts`
- `packages/db/src/permissions/preset-roles.ts`
