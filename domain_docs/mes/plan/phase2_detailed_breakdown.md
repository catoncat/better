# Phase 2 详细任务分解 (M2 - Execution Control & Quality)

> 状态：**执行中**
> 创建时间：2025-12-30
> 目标：添加准备检查门禁、FAI、缺陷处置、OQC 抽检

---

## 现状总结

### Phase 1 已完成 (100%)
- 所有 1.1-1.31 任务已完成
- MES 模块已有完整的 work-order → run → unit → track 执行闭环
- 权限系统基于 CASL，支持 line/station 级数据范围

### 现有质量模型（已在 Schema 中）
| 模型 | 用途 | 状态 |
|------|------|------|
| `PrepCheck` | 准备检查 | 基础版，需扩展为 ReadinessCheck |
| `Inspection` | FAI/OQC/IPQC/FQC | 已存在，`InspectionType` 枚举支持 |
| `Defect` | 缺陷记录 | 已存在 |
| `Disposition` | 处置决策 | 已存在 |
| `ReworkTask` | 返工任务 | 已存在 |

---

## Task 2.1: Line Readiness Check (准备检查)

**设计文档**: `domain_docs/mes/plan/phase2_line_readiness_design.md`

### 子任务列表

| ID | 描述 | 依赖 | 工作量 | 状态 |
|----|------|------|--------|------|
| 2.1.1 | Schema: 添加 `ReadinessCheck` + `ReadinessCheckItem` 表和枚举 | - | S | [ ] |
| 2.1.2 | Service: 设备检查逻辑 (TpmEquipment + TpmMaintenanceTask) | 2.1.1 | M | [ ] |
| 2.1.3 | Service: 物料检查逻辑 (BOM + Material) | 2.1.1 | M | [ ] |
| 2.1.4 | Service: 工艺路线检查逻辑 (ExecutableRouteVersion) | 2.1.1 | S | [ ] |
| 2.1.5 | API: 预检 + 正式检查 + 获取结果 + 历史 | 2.1.2-4 | M | [ ] |
| 2.1.6 | API: 豁免接口 (waive) | 2.1.5 | S | [ ] |
| 2.1.7 | Gate: 修改 Run 授权 API 增加检查前置 | 2.1.5 | S | [ ] |
| 2.1.8 | 权限: 添加 `mes:readiness:*` 权限常量 | - | S | [ ] |
| 2.1.9 | 事件: Run 创建时自动预检 | 2.1.5 | S | [ ] |
| 2.1.10 | 事件: TPM/路由变更时重新预检 | 2.1.9 | M | [ ] |
| 2.1.11 | UI: Run 详情页准备状态卡片 | 2.1.5 | M | [ ] |
| 2.1.12 | UI: 准备检查执行页 | 2.1.6 | M | [ ] |
| 2.1.13 | UI: 异常汇总看板 | 2.1.5 | M | [ ] |

---

## Task 2.2: FAI Tasks & Authorization Gate (首件检验)

**注意**: Schema 已有 `Inspection` 模型和 `InspectionType.FAI`

### 子任务列表

| ID | 描述 | 依赖 | 工作量 | 状态 |
|----|------|------|--------|------|
| 2.2.1 | Schema: 验证/扩展 Inspection 模型 (FAI 特有字段) | - | S | [ ] |
| 2.2.2 | Service: FAI 任务创建逻辑 (限制试产数量) | 2.2.1 | M | [ ] |
| 2.2.3 | API: 创建 FAI 任务 | 2.2.2 | S | [ ] |
| 2.2.4 | API: 记录检验结果 | 2.2.2 | S | [ ] |
| 2.2.5 | API: 完成 FAI (PASS/FAIL) | 2.2.4 | S | [ ] |
| 2.2.6 | Gate: Run 授权需 FAI PASSED | 2.2.5, 2.1.7 | S | [ ] |
| 2.2.7 | UI: FAI 任务创建/执行页 | 2.2.5 | M | [ ] |
| 2.2.8 | UI: FAI 结果记录表单 | 2.2.7 | M | [ ] |

---

## Task 2.3: Defect & Disposition (缺陷与处置)

**注意**: Schema 已有 `Defect`, `Disposition`, `ReworkTask` 模型

### 子任务列表

| ID | 描述 | 依赖 | 工作量 | 状态 |
|----|------|------|--------|------|
| 2.3.1 | Schema: 验证/扩展 Defect + Disposition 模型 | - | S | [ ] |
| 2.3.2 | Service: TrackOut FAIL 时自动创建 Defect | 2.3.1 | M | [ ] |
| 2.3.3 | Service: Disposition 处置流程 (REWORK/SCRAP/HOLD) | 2.3.2 | L | [ ] |
| 2.3.4 | API: 缺陷查询 + 创建 | 2.3.2 | M | [ ] |
| 2.3.5 | API: 处置操作 (assign disposition) | 2.3.3 | M | [ ] |
| 2.3.6 | API: 返工任务管理 | 2.3.3 | M | [ ] |
| 2.3.7 | API: Hold 释放 | 2.3.3 | S | [ ] |
| 2.3.8 | UI: 缺陷列表 + 处置操作 | 2.3.5 | M | [ ] |
| 2.3.9 | UI: 返工任务跟踪 | 2.3.6 | M | [ ] |

---

## Task 2.4: OQC Sampling Flow (出货质检)

**注意**: Schema 已有 `Inspection` + `InspectionType.OQC`

### 子任务列表

| ID | 描述 | 依赖 | 工作量 | 状态 |
|----|------|------|--------|------|
| 2.4.1 | Schema: OQC 抽检规则表 (比例/固定数量) | - | S | [ ] |
| 2.4.2 | Service: OQC 任务创建逻辑 (Unit 完成后触发) | 2.4.1 | M | [ ] |
| 2.4.3 | Service: OQC 抽样算法 | 2.4.2 | M | [ ] |
| 2.4.4 | API: OQC 任务管理 | 2.4.2 | M | [ ] |
| 2.4.5 | API: OQC 结果记录 | 2.4.4 | S | [ ] |
| 2.4.6 | Gate: Run/WO 完成需 OQC 通过 | 2.4.5 | S | [ ] |
| 2.4.7 | UI: OQC 任务列表 + 执行 | 2.4.5 | M | [ ] |
| 2.4.8 | UI: OQC 规则配置 | 2.4.1 | S | [ ] |

---

## Task 2.5: Final Confirmation & Closeout (最终确认)

### 子任务列表

| ID | 描述 | 依赖 | 工作量 | 状态 |
|----|------|------|--------|------|
| 2.5.1 | Service: Run 完成条件检查 (所有门禁) | 2.1.7, 2.2.6, 2.3.3, 2.4.6 | M | [ ] |
| 2.5.2 | Service: WO 完成条件检查 | 2.5.1 | S | [ ] |
| 2.5.3 | API: Run closeout | 2.5.1 | S | [ ] |
| 2.5.4 | API: WO closeout | 2.5.2 | S | [ ] |
| 2.5.5 | UI: 关闭确认对话框 | 2.5.3 | S | [ ] |
| 2.5.6 | 归档占位符 (后续扩展) | 2.5.4 | S | [ ] |

---

## 工作分配 (Wave 模式)

### Wave 1 (无依赖，可并行启动)
- [ ] 2.1.1 Schema (Readiness)
- [ ] 2.1.8 权限定义
- [ ] 2.2.1 Schema (FAI 扩展验证)
- [ ] 2.3.1 Schema (Defect/Disposition 扩展验证)
- [ ] 2.4.1 Schema (OQC 规则)

### Wave 2 (Schema 完成后)
- [ ] 2.1.2-4 检查逻辑 (Equipment/Material/Route) [可并行]
- [ ] 2.2.2 FAI 任务逻辑
- [ ] 2.3.2 Defect 自动创建
- [ ] 2.4.2-3 OQC 任务 + 抽样

### Wave 3 (Service 完成后)
- [ ] 2.1.5-7 Readiness API + Gate
- [ ] 2.2.3-6 FAI API + Gate
- [ ] 2.3.4-7 Defect/Disposition API
- [ ] 2.4.4-6 OQC API + Gate

### Wave 4 (API 完成后)
- [ ] 2.5.1-4 Closeout Service + API
- [ ] 所有 UI 任务 (可分配给 frontend-ui-ux-engineer)

### Wave 5
- [ ] 2.1.9-10 事件触发 (预检自动化)
- [ ] 2.5.5-6 关闭 UI + 归档

---

## 优先级

**关键路径**: 2.1 (Readiness) → 2.2 (FAI) → 2.5 (Closeout)

**建议顺序**:
1. Task 2.1 (Line Readiness) - 最详细的设计文档已就绪，阻断后续授权
2. Task 2.2 (FAI) - 授权前的质量门禁
3. Task 2.3 (Defect) - 执行中必需
4. Task 2.4 (OQC) - 完成前必需
5. Task 2.5 (Closeout) - 最后收尾

---

## 相关文档

- 设计文档: `domain_docs/mes/plan/phase2_line_readiness_design.md`
- 需求讨论: `conversation/line_readiness_check_discussion.md`
- 端到端流程: `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- API 模式: `agent_docs/03_backend/api_patterns.md`
