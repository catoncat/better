# MES 权限审计报告

> 时间: 2026-01-20
> 范围: MES 核心页面与接口（work orders / runs / run detail / execution / readiness / FAI / OQC / trace / loading / routes）

---

## 1. 角色权限矩阵（摘要）

| 角色 | 权限列表（摘要） | 数据范围 |
| --- | --- | --- |
| admin | SYSTEM_USER_MANAGE, SYSTEM_ROLE_MANAGE, SYSTEM_CONFIG, SYSTEM_INTEGRATION, DATA_SPEC_CONFIG, WO_READ, RUN_READ, ROUTE_READ, TRACE_READ, EXEC_READ, READINESS_VIEW, LOADING_VIEW | ALL |
| planner | WO_READ, WO_RECEIVE, WO_RELEASE, WO_UPDATE, WO_CLOSE, RUN_READ, RUN_CREATE, ROUTE_READ, TRACE_READ, READINESS_VIEW | ALL |
| engineer | SYSTEM_INTEGRATION, ROUTE_READ, ROUTE_CONFIGURE, ROUTE_COMPILE, ROUTE_CREATE, DATA_SPEC_CONFIG, OPERATION_CONFIG, WO_READ, RUN_READ, TRACE_READ, READINESS_CONFIG, LOADING_CONFIG | ALL |
| quality | QUALITY_FAI, QUALITY_OQC, QUALITY_DISPOSITION, TRACE_READ, TRACE_EXPORT, WO_READ, RUN_READ, EXEC_READ, READINESS_VIEW, READINESS_CHECK, READINESS_OVERRIDE | ALL |
| leader | RUN_READ, RUN_CREATE, RUN_AUTHORIZE, RUN_REVOKE, RUN_CLOSE, EXEC_READ, EXEC_TRACK_IN, EXEC_TRACK_OUT, EXEC_DATA_COLLECT, WO_READ, WO_CLOSE, TRACE_READ, ROUTE_READ, READINESS_VIEW, READINESS_CHECK, READINESS_OVERRIDE, LOADING_VIEW, LOADING_VERIFY | ASSIGNED_LINES |
| operator | EXEC_TRACK_IN, EXEC_TRACK_OUT, TRACE_READ, READINESS_VIEW, LOADING_VIEW, LOADING_VERIFY | ASSIGNED_STATIONS |

> 权限完整定义见 `packages/db/src/permissions/permissions.ts`。

---

## 2. API-权限对照表（核心接口）

| 模块 | API Path | Method | 权限 |
| --- | --- | --- | --- |
| work-orders | `/api/work-orders` | GET | `wo:read` |
| work-orders | `/api/work-orders/:woNo/release` | POST | `wo:release` |
| work-orders | `/api/work-orders/:woNo/runs` | POST | `run:create` |
| work-orders | `/api/work-orders/:woNo/pick-status` | PATCH | `wo:update` |
| work-orders | `/api/work-orders/:woNo/close` | POST | `wo:close` |
| runs | `/api/runs` | GET | `run:read` |
| runs | `/api/runs/:runNo` | GET | `run:read` |
| runs | `/api/runs/:runNo/units` | GET | `run:read` |
| runs | `/api/runs/:runNo/authorize` | POST | `run:authorize` / `run:revoke` |
| runs | `/api/runs/:runNo/close` | POST | `run:close` |
| runs | `/api/runs/:runNo/generate-units` | POST | `run:authorize` |
| runs | `/api/runs/:runNo/units` | DELETE | `run:authorize` |
| readiness | `/api/runs/:runNo/readiness/latest` | GET | `readiness:view` |
| readiness | `/api/runs/:runNo/readiness/precheck` | POST | `readiness:check` |
| readiness | `/api/runs/:runNo/readiness/check` | POST | `readiness:check` |
| readiness | `/api/runs/:runNo/readiness/items/:itemId/waive` | POST | `readiness:override` |
| readiness | `/api/readiness/exceptions` | GET | `readiness:view` |
| fai | `/api/fai` / `/api/fai/:faiId` / `/api/fai/run/:runNo` | GET | `quality:fai` |
| fai | `/api/fai/run/:runNo/gate` | GET | `quality:fai` |
| fai | `/api/fai/run/:runNo` | POST | `quality:fai` |
| fai | `/api/fai/:faiId/start` | POST | `quality:fai` |
| oqc | `/api/oqc` / `/api/oqc/:oqcId` / `/api/oqc/run/:runNo` | GET | `quality:oqc` |
| oqc | `/api/oqc/:oqcId/start` | POST | `quality:oqc` |
| oqc | `/api/oqc/:oqcId/complete` | POST | `quality:oqc` |
| mrb | `/api/runs/:runNo/mrb-decision` | POST | `quality:disposition` |
| execution | `/api/stations/resolve-unit/:sn` | GET | `exec:track_in` + `exec:track_out` |
| execution | `/api/stations/:stationCode/unit/:sn/data-specs` | GET | `exec:track_out` |
| execution | `/api/stations/:stationCode/track-in` | POST | `exec:track_in` |
| execution | `/api/stations/:stationCode/track-out` | POST | `exec:track_out` |
| trace | `/api/trace/units/:sn` | GET | `trace:read` |

---

## 3. 页面-权限映射（重点页面）

### `/mes/work-orders`
- **页面加载 API**: `GET /api/work-orders` (`wo:read`)
- **主要操作**:
  - 发布工单: `wo:release`
  - 创建批次: `run:create`
  - 更新拣货状态: `wo:update`
  - 关闭工单: `wo:close`

### `/mes/runs`
- **页面加载 API**: `GET /api/runs` (`run:read`)
- **主要操作**:
  - 创建批次: `run:create`
  - 批量授权/撤销: `run:authorize`

### `/mes/runs/:runNo`
- **页面加载 API**:
  - `GET /api/runs/:runNo` (`run:read`)
  - `GET /api/runs/:runNo/units` (`run:read`)
  - `GET /api/runs/:runNo/readiness/latest` (`readiness:view`)
  - `GET /api/fai/run/:runNo` + `/gate` (`quality:fai`)
  - `GET /api/oqc/run/:runNo` (`quality:oqc`)
- **主要操作**:
  - 授权/撤销: `run:authorize`
  - 收尾: `run:close`
  - 生成单件: `run:authorize`
  - 执行预检/正式检查: `readiness:check`
  - 豁免检查项: `readiness:override`
  - 创建/开始 FAI: `quality:fai`
  - MRB 决策: `quality:disposition`

### `/mes/execution`
- **页面加载/操作 API**:
  - `resolve-unit`: `exec:track_in` + `exec:track_out`
  - `track-in`: `exec:track_in`
  - `track-out`: `exec:track_out`

### `/mes/fai`
- **页面加载/操作 API**: `quality:fai`

### `/mes/oqc`
- **页面加载/操作 API**: `quality:oqc`（MRB: `quality:disposition`）

### `/mes/trace`
- **页面加载 API**: `trace:read`

### `/mes/loading`
- **页面加载/操作 API**: `loading:view` / `loading:verify` / `loading:config`

### `/mes/routes`
- **页面加载/操作 API**: `route:read` / `route:configure` / `route:compile` / `route:create`

---

## 4. 角色 × 页面可访问性矩阵（核心页面）

| 页面 | admin | planner | engineer | quality | leader | operator |
| --- | --- | --- | --- | --- | --- | --- |
| /mes/work-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs/:runNo | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ |
| /mes/execution | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| /mes/fai | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/oqc | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/trace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /mes/loading | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| /mes/routes | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

图例：✅ 完全可用；⚠️ 部分功能可用；❌ 无权限访问。

---

## 5. 问题汇总（本次发现）

| 问题 | 位置 | 影响 | 修复 |
| --- | --- | --- | --- |
| 运行详情页无权限仍请求 readiness/FAI/OQC | `/mes/runs/:runNo` | 403 + 无提示 | 已加权限 gating + 查询 enabled 控制 |
| readiness 豁免使用了错误权限 | `/mes/runs/:runNo` | 无权限用户可见按钮 | 改为 `readiness:override` gating |
| 403 错误提示不明确 + 自动重试 | 全局 | 用户看到“检查网络” | `getApiErrorMessage` + `queryClient` 全局修复 |
| planner 缺少 readiness:view | 角色配置 | 无法查看就绪结果 | 已在预设角色中补充 |

---

## 6. 修复方案（已落地）

1. **角色权限**：为 `planner` 增加 `readiness:view`。
2. **页面权限控制**：
   - `/mes/runs/:runNo`：按 `readiness:view / readiness:override / quality:fai / quality:oqc` 做 UI gating + 禁用无权限查询。
3. **全局错误处理**：
   - 403 显示“权限不足（缺少权限: ...）”
   - React Query 对 401/403 不再重试

---

## 7. 待扩展（后续补齐）

- 其余 MES 页面（data-collection-specs / readiness-config / integration / materials / boms 等）可继续补充页面-权限映射与矩阵细化。
