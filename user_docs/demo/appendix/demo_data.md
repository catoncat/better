# 推荐演示数据

> 用于演示各种场景的推荐数据。

---

## SMT 演示数据

| 用途 | 工单号 | 批次号 | 路由编码 |
|------|--------|--------|----------|
| SMT 全流程起点 | WO-MGMT-SMT-QUEUE | （新建） | PCBA-SMT-V1 |
| 准备中批次 | WO-MGMT-SMT-PREP | RUN-MGMT-SMT-PREP | PCBA-SMT-V1 |
| 执行中批次 | WO-MGMT-SMT-EXEC | RUN-MGMT-SMT-EXEC | PCBA-SMT-V1 |
| 质量锁定批次 | WO-MGMT-SMT-HOLD | RUN-MGMT-SMT-HOLD | PCBA-SMT-V1 |
| 已完成追溯 | WO-MGMT-SMT-DONE | RUN-MGMT-SMT-DONE | PCBA-SMT-V1 |

---

## DIP 演示数据

| 用途 | 工单号 | 批次号 | 路由编码 |
|------|--------|--------|----------|
| DIP 全流程起点 | WO-DEMO-DIP-{时间戳} | （新建） | PCBA-DIP-V1 |
| DIP 执行中 | WO-MGMT-DIP-EXEC | RUN-MGMT-DIP-EXEC | PCBA-DIP-V1 |
| DIP 已完成追溯 | WO-MGMT-DIP-DONE | RUN-MGMT-DIP-DONE | PCBA-DIP-V1 |

---

## 上料演示数据

### 物料条码格式

格式：`物料编码|批次号`

### 示例条码

| 场景 | 站位码 | 期望物料 | 扫码条码 | 预期结果 |
|------|--------|----------|----------|----------|
| PASS | 2F-34 | 5212090007 | `5212090007\|LOT-20250526-003` | PASS |
| WARNING | 2F-46 | 5212090001 | `5212090001B\|LOT-20250526-002` | WARNING（替代料） |
| FAIL | 任意 | 任意 | `9999999999\|LOT-FAIL-001` | FAIL |

---

## 产线与工位

### SMT 产线

| 产线 | 说明 |
|------|------|
| SMT-A | 主产线 |
| SMT-B | 备用产线 |

### SMT 工位

| 工位代码 | 工序名称 |
|----------|----------|
| ST-SPI-01 | SPI 检测 |
| ST-MOUNT-01 | 贴片 |
| ST-REFLOW-01 | 回流焊 |
| ST-AOI-01 | AOI 检测 |

### DIP 产线

| 产线 | 说明 |
|------|------|
| LINE-DIP-A | DIP 主产线 |

### DIP 工位

| 工位代码 | 工序名称 |
|----------|----------|
| ST-DIP-INS-01 | 插件 |
| ST-DIP-WAVE-01 | 波峰焊 |
| ST-DIP-POST-01 | 后焊处理 |
| ST-DIP-TEST-01 | 功能测试 |

---

## 命名建议

| 类型 | 格式 | 示例 |
|------|------|------|
| 产线 | `SMT-A`, `LINE-DIP-A` | SMT-A |
| 站位码 | 机台-站位 | 2F-46, 1R-14 |
| 工单 | `WO-YYYYMMDD-XXX` | WO-20260127-001 |
| 批次 | `RUN-WO-YYYYMMDD-XXX-01` | RUN-WO-20260127-001-01 |
| 物料批次 | `LOT-YYYYMMDD-XXX` | LOT-20260127-001 |
| Unit SN | `SN-{runNo}-0001` | SN-RUN-WO-001-0001 |

---

## 建议覆盖场景

### 上料场景

- [x] 上料 PASS
- [x] 上料 WARNING（替代料）
- [x] 上料 FAIL + 锁定
- [x] 站位解锁
- [x] 换料记录（带原因）

### FAI 场景

- [x] FAI 创建/启动
- [x] FAI PASS + 签字
- [x] FAI FAIL

### 执行场景

- [x] 批量执行 PASS
- [x] 执行 FAIL + 缺陷处置
- [x] 返修流程

### OQC 场景

- [x] OQC 触发（PASS）
- [x] OQC 触发（FAIL）+ MRB
- [x] 无 OQC（直接完成）

### 追溯场景

- [x] SN 追溯
- [x] 物料批次反查

---

## 数据准备命令

```bash
# 基础种子数据（快速演示）
bun run db:seed

# 详细 SMT 演示数据集
bun scripts/smt-demo-dataset.ts

# 添加多状态场景数据
bun apps/server/scripts/seed-demo.ts
```

数据集详情：`domain_docs/mes/smt_playbook/04_demo_data/`

---

## 返回

- [演示指南首页](../README.md)
- [环境准备](../02_preparation.md)
