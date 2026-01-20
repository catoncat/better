# 系统性角色权限审计任务

> 目标：排查所有预设角色的权限配置，确保每个角色能正常访问其职责范围内的页面，且 UI 与 API 权限对应。

---

## 背景问题

当前发现的问题模式：
1. **UI/API 权限不对应**：用户能看到页面/按钮，但点击后返回 403
2. **页面加载时多个 API 权限缺失**：打开页面会请求多个 API，部分返回 403 但无提示
3. **React Query 重试**：403 错误导致无限重试
4. **错误提示不明确**：权限错误显示为"检查网络"

---

## 任务 1：梳理角色权限矩阵

### 1.1 读取预设角色定义

```bash
# 文件位置
cat packages/db/src/permissions/preset-roles.ts
```

输出格式：

| 角色 | 权限列表 | 数据范围 |
|------|---------|---------|
| admin | SYSTEM_USER_MANAGE, SYSTEM_ROLE_MANAGE, ... | ALL |
| planner | WO_READ, WO_RECEIVE, ... | ALL |
| ... | ... | ... |

### 1.2 读取所有权限定义

```bash
cat packages/db/src/permissions/permissions.ts
```

列出所有 Permission 枚举值及其含义。

---

## 任务 2：梳理页面-权限映射

### 2.1 扫描所有前端页面

```bash
# 列出所有路由文件
find apps/web/src/routes -name "*.tsx" -type f | head -50
```

### 2.2 对每个页面分析

对于每个页面文件，检查：

1. **页面加载时请求哪些 API**（搜索 `useQuery`, `useMutation`, hooks 调用）
2. **每个 API 需要哪些权限**（对照后端 routes 的 `requirePermission`）
3. **页面上有哪些操作按钮**（搜索 `<Button`, `onClick`）
4. **按钮是否有权限控制**（搜索 `<Can`, `hasPermission`）

检查模板：

```markdown
### 页面：/mes/runs/$runNo（批次详情）

**页面加载请求的 API**：
| API | 权限 | 用途 |
|-----|------|------|
| GET /api/runs/:runNo | run:read | 批次详情 |
| GET /api/runs/:runNo/readiness/latest | readiness:view | 就绪检查状态 |
| GET /api/fai/run/:runNo/gate | quality:fai | FAI 门禁状态 |
| GET /api/fai/run/:runNo | quality:fai | FAI 记录 |
| GET /api/oqc/run/:runNo | quality:oqc | OQC 记录 |

**页面操作按钮**：
| 按钮 | 权限 | 是否有 UI 控制 |
|------|------|---------------|
| 执行预检 | readiness:check | ✅ 已添加 |
| 正式检查 | readiness:check | ✅ 已添加 |
| 创建 FAI | quality:fai | ❌ 缺失 |
| 授权生产 | run:authorize | ❌ 需检查 |
| 收尾 | run:close | ❌ 需检查 |

**问题**：
- planner 角色缺少 readiness:view，导致就绪检查状态无法加载
- planner 角色缺少 quality:fai/quality:oqc，导致这些区域无法加载
```

---

## 任务 3：后端权限定义扫描

### 3.1 扫描所有 API 权限配置

```bash
# 搜索所有 requirePermission 定义
grep -rn "requirePermission" apps/server/src/modules --include="*.ts" | head -100
```

### 3.2 构建 API-权限对照表

输出格式：

| 模块 | API Path | Method | 权限 |
|------|----------|--------|------|
| runs | /api/runs | GET | run:read |
| runs | /api/runs/:runNo | GET | run:read |
| readiness | /api/runs/:runNo/readiness/latest | GET | readiness:view |
| fai | /api/fai/run/:runNo/gate | GET | quality:fai |
| ... | ... | ... | ... |

---

## 任务 4：角色-页面可访问性矩阵

基于上述分析，生成矩阵：

| 页面 | admin | planner | engineer | quality | leader | operator |
|------|-------|---------|----------|---------|--------|----------|
| /mes/work-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /mes/runs/:runNo | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| /mes/execution | ✅ | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| /mes/fai | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/oqc | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /mes/loading | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| /mes/routes | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /mes/trace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... | ... | ... |

图例：
- ✅ 完全可用
- ⚠️ 部分功能可用（需说明哪些受限）
- ❌ 无权限访问

---

## 任务 5：发现的问题汇总

### 5.1 权限缺失问题

| 角色 | 页面 | 缺失权限 | 影响 | 建议 |
|------|------|---------|------|------|
| planner | /mes/runs/:runNo | readiness:view | 无法看就绪状态 | 添加权限 或 隐藏该区域 |
| ... | ... | ... | ... | ... |

### 5.2 UI 控制缺失问题

| 页面 | 按钮/区域 | 需要权限 | 当前状态 |
|------|----------|---------|---------|
| /mes/runs/:runNo | 创建 FAI | quality:fai | 未做权限控制 |
| ... | ... | ... | ... |

### 5.3 API 错误处理问题

| 问题 | 位置 | 建议修复 |
|------|------|---------|
| 403 显示为"检查网络" | 全局错误处理 | 区分 403 显示权限不足 |
| 权限错误触发重试 | React Query 配置 | 403 应该 retry: false |

---

## 任务 6：修复方案

### 方案 A：扩展角色权限

如果某角色**职责需要**访问某页面的数据，添加对应权限。

```typescript
// packages/db/src/permissions/preset-roles.ts
{
  code: "planner",
  permissions: [
    // ... existing
    Permission.READINESS_VIEW, // 新增：可查看就绪状态
  ],
}
```

### 方案 B：页面/区域权限控制

如果某角色**不需要**看到某区域，隐藏该区域。

```tsx
// 使用 <Can> 组件包裹
<Can permissions={Permission.READINESS_VIEW}>
  <ReadinessSection />
</Can>
```

### 方案 C：全局错误处理优化

```typescript
// apps/web/src/lib/eden.ts 或全局 QueryClient 配置
// 1. 403 错误不重试
// 2. 403 显示具体权限信息
```

---

## 执行顺序

1. **先完成任务 1-4**：产出完整的权限矩阵
2. **再执行任务 5**：汇总所有问题
3. **最后制定任务 6**：分类修复方案

---

## 输出要求

1. 生成一个 Markdown 文件：`user_docs/demo/permission_audit_report.md`
2. 包含上述所有表格和分析
3. 明确列出每个问题的修复方案和优先级

---

## 关键文件位置

```
packages/db/src/permissions/
├── permissions.ts          # 权限枚举定义
├── preset-roles.ts         # 预设角色权限
├── ability.ts              # 权限类型定义
└── index.ts                # 导出

apps/web/src/
├── hooks/use-ability.ts    # 前端权限 hook
├── components/ability/can.tsx  # 权限控制组件
└── routes/_authenticated/mes/  # MES 页面

apps/server/src/
├── plugins/permission.ts   # 权限中间件
└── modules/mes/*/routes.ts # API 权限定义
```
