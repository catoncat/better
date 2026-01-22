# API 与页面索引

## 1. API 路径对照表

> **验证日期**: 2025-01-21
> **验证方式**: 对照 `apps/server/src/modules/mes/` 路由实现

### 1.1 上料防错 (Loading)

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `POST /api/runs/:runNo/loading/load-table` | `POST /runs/:runNo/loading/load-table` | OK 一致 | 加载站位表 |
| `POST /api/loading/verify` | `POST /loading/verify` | OK 一致 | 扫码验证 |
| `POST /api/loading/replace` | `POST /loading/replace` | OK 一致 | 换料 |
| `GET /api/runs/:runNo/loading` | `GET /runs/:runNo/loading` | OK 一致 | 获取上料记录 |
| `GET /api/runs/:runNo/loading/expectations` | `GET /runs/:runNo/loading/expectations` | OK 一致 | 获取期望清单 |
| `POST /api/feeder-slots/:slotId/unlock` | `POST /feeder-slots/:slotId/unlock` | OK 一致 | 解锁站位 |

### 1.2 Run 与就绪检查 (Run & Readiness)

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `POST /api/work-orders/:woNo/runs` | `POST /work-orders/:woNo/runs` | OK 一致 | 创建批次 |
| `POST /api/runs/:runNo/generate-units` | `POST /runs/:runNo/generate-units` | OK 一致 | 生成 Unit |
| `POST /api/runs/:runNo/readiness/check` | `POST /runs/:runNo/readiness/check` | OK 一致 | Formal 就绪检查 |
| `POST /api/runs/:runNo/readiness/precheck` | `POST /runs/:runNo/readiness/precheck` | OK 一致 | Precheck（文档未提及） |
| `GET /api/runs/:runNo/readiness/latest` | `GET /runs/:runNo/readiness/latest` | OK 一致 | 获取最新检查 |
| `POST /api/runs/:runNo/authorize` | `POST /runs/:runNo/authorize` | OK 一致 | 授权批次 |

### 1.3 FAI 首件

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `POST /api/fai/run/:runNo` | `POST /fai/run/:runNo` | OK 一致 | 创建 FAI |
| `GET /api/fai/run/:runNo` | `GET /fai/run/:runNo` | OK 一致 | 获取 Run 的 FAI |
| `GET /api/fai/run/:runNo/gate` | `GET /fai/run/:runNo/gate` | OK 一致 | 检查 FAI Gate |
| `POST /api/fai/:faiId/start` | `POST /fai/:faiId/start` | OK 一致 | 启动 FAI |
| `POST /api/fai/:faiId/items` | `POST /fai/:faiId/items` | OK 一致 | 记录检验项 |
| `POST /api/fai/:faiId/complete` | `POST /fai/:faiId/complete` | OK 一致 | 完成 FAI |

### 1.4 执行 (Execution)

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `POST /api/stations/:stationCode/track-in` | `POST /stations/:stationCode/track-in` | OK 一致 | TrackIn |
| `POST /api/stations/:stationCode/track-out` | `POST /stations/:stationCode/track-out` | OK 一致 | TrackOut |

### 1.5 OQC 抽检

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `POST /api/oqc/sampling-rules` | `POST /oqc/sampling-rules` | OK 一致 | 创建抽检规则 |
| `GET /api/oqc/run/:runNo` | `GET /oqc/run/:runNo` | OK 一致 | 获取 Run 的 OQC |
| `POST /api/oqc/:oqcId/start` | `POST /oqc/:oqcId/start` | OK 一致 | 启动 OQC |
| `POST /api/oqc/:oqcId/items` | `POST /oqc/:oqcId/items` | OK 一致 | 记录检验项 |
| `POST /api/oqc/:oqcId/complete` | `POST /oqc/:oqcId/complete` | OK 一致 | 完成 OQC |

### 1.6 追溯 (Trace)

| 文档中的路径 | 实际实现路径 | 状态 | 说明 |
|-------------|-------------|------|------|
| `GET /api/trace/units/{sn}` | `GET /trace/units/:sn` | OK 一致 | 单件追溯 |
| `GET /api/trace/material-lots/{materialCode}/{lotNo}/units` | PARTIAL 未实现 | 待补充 | 料批反查 |

---

## 2. 文档路径修正说明

所有 API 路径在文档中使用了 `/api/` 前缀，实际实现中 MES 模块挂载在 `/api/` 或 `/` 下（取决于 app 配置）。

**建议**：
- 文档中的 `/api/runs/...` 等路径是正确的（假设 API 基础路径为 `/api/`）
- 若实际部署时无 `/api/` 前缀，调用时需去掉

---

## 3. 页面路由索引

| 功能 | 前端路径 | 说明 |
|------|---------|------|
| 站位配置 | `/mes/loading/slot-config` | 站位与映射管理 |
| 上料操作 | `/mes/loading` | 扫码上料界面 |
| 批次管理 | `/mes/runs` | Run 列表与详情 |
| FAI 管理 | `/mes/fai` | 首件检验 |
| OQC 管理 | `/mes/oqc` | 出货抽检 |
| 追溯查询 | `/mes/trace` | 单件/料批追溯 |
| 执行界面 | `/mes/execution` | TrackIn/TrackOut |
| 路由管理 | `/mes/routes` | 路由配置 |

---

## 4. 待补充 API

| 功能 | 建议路径 | 说明 |
|------|---------|------|
| 料批反查 | `GET /trace/material-lots/:materialCode/:lotNo/units` | 返回使用该料批的 SN 列表 |
