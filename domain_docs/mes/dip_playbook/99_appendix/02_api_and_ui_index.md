# API 与页面索引

## 1. 概述
本文档提供 DIP 产线相关 API 端点和前端页面的索引。

## 2. API 索引

### 2.1 批次管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 查询批次列表 | GET | `/api/runs` | 支持筛选和分页 |
| 创建批次 | POST | `/api/runs` | 从工单创建批次 |
| 查询批次详情 | GET | `/api/runs/:runNo` | 获取单个批次 |
| 授权批次 | POST | `/api/runs/:runNo/authorize` | FAI 通过后授权 |
| 取消授权 | POST | `/api/runs/:runNo/revoke` | 取消授权 |
| 就绪检查 | POST | `/api/runs/:runNo/readiness/check` | 执行就绪检查 |
| 查询就绪状态 | GET | `/api/runs/:runNo/readiness` | 查询检查结果 |
| MRB 决策 | POST | `/api/runs/:runNo/mrb-decision` | MRB 处置决策 |
| 创建返修批次 | POST | `/api/runs/:runNo/rework` | 从 MRB 创建返修批次 |

### 2.2 执行管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 进站 | POST | `/api/stations/:stationCode/track-in` | PCB 进站 |
| 出站 | POST | `/api/stations/:stationCode/track-out` | PCB 出站 |
| 查询执行记录 | GET | `/api/track-records` | 支持按单件/批次筛选 |

### 2.3 首件管理（FAI）

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建 FAI | POST | `/api/fai/run/:runNo` | 为批次创建首件任务 |
| 查询 FAI 列表 | GET | `/api/fai` | 支持筛选 |
| 查询 FAI 详情 | GET | `/api/fai/:faiId` | 获取单个 FAI |
| 开始 FAI | POST | `/api/fai/:faiId/start` | 开始首件检验 |
| 完成 FAI | POST | `/api/fai/:faiId/complete` | 完成首件检验 |

### 2.4 不良管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 登记不良 | POST | `/api/defects` | 登记不良记录 |
| 查询不良列表 | GET | `/api/defects` | 支持筛选 |
| 查询不良详情 | GET | `/api/defects/:defectId` | 获取单个不良 |
| 不良处置 | POST | `/api/defects/:defectId/disposition` | 处置不良 |

### 2.5 返修管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 查询返修任务 | GET | `/api/rework-tasks` | 支持筛选 |
| 接收返修任务 | POST | `/api/rework-tasks/:id/accept` | 接收任务 |
| 完成返修 | POST | `/api/rework-tasks/:id/complete` | 完成返修 |
| 复检提交 | POST | `/api/rework-tasks/:id/verify` | 提交复检 |

### 2.6 OQC 管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建 OQC | POST | `/api/oqc/run/:runNo` | 为批次创建 OQC |
| 查询 OQC 列表 | GET | `/api/oqc` | 支持筛选 |
| 查询 OQC 详情 | GET | `/api/oqc/:oqcId` | 获取单个 OQC |
| 完成 OQC | POST | `/api/oqc/:oqcId/complete` | 完成 OQC |

### 2.7 测试管理

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 记录测试结果 | POST | `/api/test-records` | 记录测试结果 |
| 查询测试记录 | GET | `/api/test-records` | 支持按单件/批次筛选 |
| 查询测试详情 | GET | `/api/test-records/:id` | 获取单个测试记录 |

### 2.8 夹具管理（规划中）

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 查询夹具列表 | GET | `/api/tooling` | 支持筛选 |
| 创建夹具 | POST | `/api/tooling` | 创建夹具 |
| 更新夹具 | PUT | `/api/tooling/:id` | 更新夹具信息 |
| 分配夹具 | POST | `/api/tooling/:id/assign` | 分配到批次 |
| 记录使用 | POST | `/api/tooling/:id/usage` | 记录使用次数 |
| 维护登记 | POST | `/api/tooling/:id/maintenance` | 登记维护记录 |
| 查询使用记录 | GET | `/api/tooling/:id/usage` | 查询使用历史 |
| 查询影响范围 | GET | `/api/tooling/:id/impact` | 查询影响的单件/批次 |

### 2.9 追溯查询

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 单件追溯 | GET | `/api/trace/unit/:serialNo` | 单件完整追溯 |
| 批次追溯 | GET | `/api/trace/run/:runNo` | 批次追溯 |
| 夹具追溯 | GET | `/api/trace/tooling/:toolingCode` | 夹具追溯 |

## 3. 页面索引

### 3.1 配置管理页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 产线管理 | `/mes/lines` | 产线配置 |
| 工位管理 | `/mes/stations` | 工位配置 |
| 路由管理 | `/mes/routes` | 路由配置 |
| 产品管理 | `/mes/products` | 产品配置 |
| 夹具管理 | `/mes/tooling` | 夹具配置（规划中） |
| 测试程序 | `/mes/test-programs` | 测试程序配置（规划中） |

### 3.2 生产执行页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 批次管理 | `/mes/runs` | 批次列表和管理 |
| 批次详情 | `/mes/runs/:runNo` | 批次详情和操作 |
| 执行作业 | `/mes/execution` | 工位执行页面 |

### 3.3 质量管理页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 首件管理 | `/mes/fai` | FAI 任务管理 |
| 不良管理 | `/mes/defects` | 不良记录管理 |
| 返修任务 | `/mes/rework-tasks` | 返修任务管理（规划中） |
| OQC 管理 | `/mes/oqc` | OQC 任务管理 |
| IPQC 管理 | `/mes/ipqc` | IPQC 巡检管理（规划中） |

### 3.4 追溯查询页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 追溯查询 | `/mes/trace` | 追溯查询入口 |
| 单件追溯 | `/mes/trace/unit/:serialNo` | 单件追溯详情 |
| 批次追溯 | `/mes/trace/run/:runNo` | 批次追溯详情 |

### 3.5 报表页面（规划中）

| 页面 | 路径 | 说明 |
|------|------|------|
| 生产报表 | `/mes/reports/production` | 生产统计报表 |
| 质量报表 | `/mes/reports/quality` | 质量统计报表 |
| 测试报表 | `/mes/reports/testing` | 测试统计报表 |
| 夹具报表 | `/mes/reports/tooling` | 夹具使用报表 |

## 4. API 响应格式

### 4.1 成功响应
```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 4.2 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "验证失败",
    "details": [
      { "field": "serialNo", "message": "序列号不能为空" }
    ]
  }
}
```

## 5. 服务端代码位置

| 模块 | 路径 |
|------|------|
| 批次服务 | `apps/server/src/modules/mes/run/service.ts` |
| 执行服务 | `apps/server/src/modules/mes/execution/service.ts` |
| 首件服务 | `apps/server/src/modules/mes/fai/service.ts` |
| 不良服务 | `apps/server/src/modules/mes/defect/service.ts` |
| OQC 服务 | `apps/server/src/modules/mes/oqc/service.ts` |
| MRB 服务 | `apps/server/src/modules/mes/oqc/mrb-service.ts` |
| 就绪服务 | `apps/server/src/modules/mes/readiness/service.ts` |

## 6. 前端代码位置

| 页面 | 路径 |
|------|------|
| 批次页面 | `apps/web/src/routes/_authenticated/mes/runs/` |
| 执行页面 | `apps/web/src/routes/_authenticated/mes/execution.tsx` |
| 首件页面 | `apps/web/src/routes/_authenticated/mes/fai.tsx` |
| 不良页面 | `apps/web/src/routes/_authenticated/mes/defects.tsx` |
| OQC 页面 | `apps/web/src/routes/_authenticated/mes/oqc.tsx` |
| MRB 对话框 | `apps/web/src/routes/_authenticated/mes/-components/mrb-decision-dialog.tsx` |
