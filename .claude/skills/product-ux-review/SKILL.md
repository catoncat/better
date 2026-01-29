---
name: product-ux-review
description: 'MES 产品 UX 审视：假设业务逻辑已过关，专注表单效率/空态体验/信息架构/功能划分；产出 `domain_docs/mes/ux_review/product_ux/<scope>.md`。'
---

# Product UX Review（MES 产品 UX 审视）

## Goal

假设业务逻辑已过关，把评审重心放在**产品设计层面的体验优化**（不是功能验收），聚焦 4 个维度：
1) 表单/操作效率
2) 空态/异常体验
3) 信息架构（IA）
4) 功能划分与路由规划

---

## Non-Negotiables（硬约束）

### ✅ 默认允许写入/新增
- `domain_docs/mes/ux_review/product_ux/*.md`
- `.scratch/`（可选：中间草稿，不入 Git）

### 🚫 默认不检查/不产出（直接视为已正确）
- 权限门禁正确性
- 状态机一致性
- API 错误码覆盖与后端校验完备性

### 🚫 默认禁止修改（避免跑偏）
- `.claude/skills/**`
- `domain_docs/mes/ux_review/00_*.md`、`domain_docs/mes/ux_review/round*_*.md`（本 skill 不维护轮次与共享状态）

---

## Inputs（必须明确）

用户必须提供：
- **Scope**：一个 scope slug（例如：`loading`、`execution`、`routing`）

输出文件命名规则（固定）：
- `domain_docs/mes/ux_review/product_ux/<scope>.md`
- `<scope>` 建议小写 + snake_case（如 `work_orders_runs`）

---

## Workflow（执行步骤）

### Step 1) 锁定 UI 证据（只看前端）

按 scope 搜集最小证据集（只读）：
- `apps/web/src/routes/_authenticated/mes/<scope>.tsx`
- `apps/web/src/routes/_authenticated/mes/<scope>/**`
- `apps/web/src/routes/_authenticated/mes/-components/**`（与 scope 强相关的组件）
- 相关 hooks/components（能定位到交互、默认值、校验、loading/error/empty 的实现即可）

> 只需要足够支撑结论的证据；不要扩展到权限/状态机/API 合约的正确性判断。

### Step 2) 按 4 个维度平行审视

每条 checklist 必须标注：
- ✅ 符合
- ⚠️ P2: 待优化（影响效率/理解成本，但不阻塞主任务）
- ❌ P1: 需改进（高频/高成本/易错/阻塞推进）

### Step 3) 输出 `product_ux/<scope>.md`

要求：
- 每个维度至少 5 条 checklist（不足说明原因，如“当前页面几乎无表单”）
- 每条 P1/P2 包含「现状 → 影响 → 建议」一句话闭环

---

## 评审维度（4 大类）

### 1) 表单/操作效率

重点检查：
- 默认值是否合理（减少手输）
- 是否支持批量操作（批量选择/批量提交/批量撤销）
- 输入校验时机（`blur` vs `submit`）、校验信息是否可读
- Tab 顺序是否符合操作流、是否有默认焦点（首要输入）
- 是否有快捷键、扫码友好（如适用）
- 是否有搜索/过滤/最近使用（降低定位成本）

### 2) 空态/异常体验

重点检查：
- 空列表/空数据是否解释“为什么空”+“下一步做什么”
- 加载态是否有 skeleton/spinner、是否避免布局抖动
- 错误提示是否可理解（人话）、是否提供恢复建议（重试/刷新/联系谁/去哪里配置）
- 无权限态文案是否说明原因与替代路径（无需验证权限真伪，只看体验表达）

### 3) 信息架构（IA）

重点检查：
- 页面布局是否清晰（主任务突出、次要信息不抢注意力）
- 信息分组是否符合心智模型（按任务、按对象、按时间、按步骤）
- 信息密度是否适当（过稀浪费滚动/过密难读）
- 关键操作入口是否明显且一致
- 次要信息是否适当隐藏/折叠（默认态不噪音）

### 4) 功能划分与路由规划

重点检查：
- 页面职责是否单一（一个页面只做一件事）
- 配置与执行是否分离（避免执行页承担配置任务）
- 入口位置是否符合角色任务（操作者/线长/工艺/质量）
- 路由结构是否符合用户心智模型（从“我现在要做什么”出发）
- 是否存在功能重复/入口分散（同一能力多个入口导致迷路）

---

## Output Template（产出模板）

```markdown
# Product UX Review: <Scope>

## 覆盖页面/组件证据
- `apps/web/src/routes/_authenticated/mes/<scope>.tsx`
- `apps/web/src/routes/_authenticated/mes/<scope>/...`
- `apps/web/src/routes/_authenticated/mes/-components/...`

## 1) 表单/操作效率
- ✅ ...
- ⚠️ P2: ... | 影响: ... | 建议: ...
- ❌ P1: ... | 影响: ... | 建议: ...

## 2) 空态/异常体验
...

## 3) 信息架构（IA）
...

## 4) 功能划分与路由规划
...

## 总结
- P1 共 N 项
- P2 共 M 项

## 与现有 skill 的关系
| Skill | 关注点 | 使用场景 |
|---|---|---|
| `ux-review-exec` | 业务逻辑 + 权限 + 状态机 + UX | 功能验收、主线闭环检查 |
| `product-ux-review` | UX 细节 + 产品设计 | 交互优化、体验打磨 |
```

---

## 验收标准（快速自检）

- 产出只围绕 4 个 UX 维度（效率/空态/IA/功能划分）
- 不包含「权限/状态机/API 错误码」正确性判断（最多作为 out-of-scope 备注，不展开）
