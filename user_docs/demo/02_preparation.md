# 演示环境准备

> 演示前的环境搭建和数据准备。

## 1. 环境准备

### 1.1 启动服务

```bash
# 重置数据库并创建基础数据
bun run db:seed

# （可选）添加演示数据以展示多状态场景
bun apps/server/scripts/seed-demo.ts

# 启动开发服务器
bun run dev
```

### 1.2 验证服务可用

- 前端：http://localhost:3001
- 后端健康检查：http://localhost:3000/api/health

---

## 2. 数据准备

### 2.1 数据集选择

| 方式 | 命令 | 说明 |
|------|------|------|
| A. 快速演示 | `bun run db:seed` | 基础种子数据，覆盖 SMT + DIP |
| B. 完整 SMT 演示 | `bun scripts/smt-demo-dataset.ts` | 详细 SMT 演示数据集 |

数据集详情：`domain_docs/mes/smt_playbook/04_demo_data/`

### 2.2 关键配置确认

在开始演示前，确认以下配置：

- [ ] `/mes/routes` 路由版本状态为 READY
- [ ] 产线与站位配置已存在（Line/FeederSlot）
- [ ] SlotMaterialMapping 已配置（缺失会导致加载站位表失败）
- [ ] OQC 抽检规则可按需准备（无规则则不会触发 OQC）

---

## 3. 建议提前打开的页面

| 页面 | 路径 | 用途 |
|------|------|------|
| 工单管理 | `/mes/work-orders` | 工单创建/下发 |
| 批次管理 | `/mes/runs` | Run 创建/授权 |
| 上料防错 | `/mes/loading` | 上料验证 |
| 工位执行 | `/mes/execution` | TrackIn/TrackOut |
| 首件检验 | `/mes/fai` | FAI 操作 |
| 缺陷管理 | `/mes/defects` | 缺陷处置 |
| 追溯查询 | `/mes/trace` | 追溯验证 |
| OQC | `/mes/oqc` | 出货检验 |
| 钢网清洗 | `/mes/stencil-cleaning` | 准备记录 |
| 刮刀点检 | `/mes/squeegee-usage` | 准备记录 |

---

## 4. 演示账号

| 角色 | 账号 | 密码 | 主要功能 |
|------|------|------|----------|
| 管理员 | admin@example.com | ChangeMe123! | 系统配置、用户管理 |
| 计划员 | planner@example.com | Test123! | 工单管理、批次创建/授权/收尾 |
| 工艺工程师 | engineer@example.com | Test123! | 路由配置、数据采集规格 |
| 质量员 | quality@example.com | Test123! | FAI/OQC/MRB、准备检查/豁免 |
| 物料员 | material@example.com | Test123! | 上料验证、物料装载 |
| 操作员 | operator@example.com | Test123! | 工位执行、进站/出站 |
| 追溯 | trace@example.com | Test123! | 追溯查询、报告导出 |

---

## 5. 推荐演示数据

### 5.1 SMT 演示数据

| 用途 | 工单号 | 批次号 | 路由编码 |
|------|--------|--------|----------|
| SMT 全流程起点 | WO-MGMT-SMT-QUEUE | （新建） | PCBA-SMT-V1 |
| 准备中批次 | WO-MGMT-SMT-PREP | RUN-MGMT-SMT-PREP | PCBA-SMT-V1 |
| 执行中批次 | WO-MGMT-SMT-EXEC | RUN-MGMT-SMT-EXEC | PCBA-SMT-V1 |
| 质量锁定批次 | WO-MGMT-SMT-HOLD | RUN-MGMT-SMT-HOLD | PCBA-SMT-V1 |
| 已完成追溯 | WO-MGMT-SMT-DONE | RUN-MGMT-SMT-DONE | PCBA-SMT-V1 |

### 5.2 DIP 演示数据

| 用途 | 工单号 | 批次号 | 路由编码 |
|------|--------|--------|----------|
| DIP 全流程起点 | WO-DEMO-DIP-{时间戳} | （新建） | PCBA-DIP-V1 |
| DIP 执行中 | WO-MGMT-DIP-EXEC | RUN-MGMT-DIP-EXEC | PCBA-DIP-V1 |
| DIP 已完成追溯 | WO-MGMT-DIP-DONE | RUN-MGMT-DIP-DONE | PCBA-DIP-V1 |

### 5.3 命名建议

- 产线：`SMT-A`, `SMT-B`, `LINE-DIP-A`
- 站位码：`2F-46`, `1R-14`
- 工单：`WO-YYYYMMDD-XXX`
- 批次：`RUN-WO-YYYYMMDD-XXX-01`
- 物料批次：`LOT-YYYYMMDD-XXX`
- Unit SN：`SN-${runNo}-0001`
