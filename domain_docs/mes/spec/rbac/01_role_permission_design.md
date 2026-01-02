# MES 系统角色权限设计

**版本**: 1.2
**日期**: 2025-01-02
**状态**: 已实现（前后端对齐，含 Readiness 权限）

---

## 1. 设计原则

1. **最小权限原则**: 每个角色只拥有完成其职责所需的最小权限
2. **职责分离**: 关键操作需要不同角色协作完成（如批次授权）
3. **可审计性**: 所有关键操作记录操作人和角色
4. **实用性**: 角色划分符合制造业实际组织结构

---

## 2. 角色定义

### 2.1 角色列表

| 角色代码 | 中文名称 | 英文名称 | 典型人员 |
|---------|---------|---------|---------|
| `admin` | 系统管理员 | System Admin | IT 管理员 |
| `planner` | 生产计划员 | Production Planner | PMC 计划员 |
| `engineer` | 工艺工程师 | Process Engineer | PE 工程师 |
| `quality` | 质量工程师 | Quality Engineer | QE 工程师 |
| `leader` | 产线组长 | Line Leader | 拉长/班组长 |
| `operator` | 操作员 | Operator | 产线作业员 |

### 2.2 角色详细说明

#### 2.2.1 系统管理员 (admin)
**职责**: 系统配置、用户管理、集成管理  
**典型场景**:
- 创建和管理用户账号
- 配置系统参数
- 管理 ERP/TPM 集成
- 查看系统日志

#### 2.2.2 生产计划员 (planner)
**职责**: 工单管理、批次创建、生产调度  
**典型场景**:
- 从 ERP 接收工单
- 发布工单到产线
- 创建生产批次
- 监控工单完成进度

#### 2.2.3 工艺工程师 (engineer)
**职责**: 路由配置、执行语义设置、流程优化  
**典型场景**:
- 查看和配置路由步骤
- 设置执行语义（站点类型、FAI 要求等）
- 编译路由版本
- 分析生产数据优化流程

#### 2.2.4 质量工程师 (quality)
**职责**: 质量检验、缺陷处理、追溯分析  
**典型场景**:
- 执行 FAI 首件检验（M2）
- 处理缺陷处置（返工/报废/冻结）（M2）
- 执行 OQC 抽检（M2）
- 追溯查询和质量分析

#### 2.2.5 产线组长 (leader)
**职责**: 产线管理、批次授权、异常处理  
**典型场景**:
- 授权生产批次
- 监控产线进度
- 处理生产异常
- 管理产线人员排班

#### 2.2.6 操作员 (operator)
**职责**: 工位执行操作  
**典型场景**:
- 在指定工位执行进站/出站
- 录入生产数据（M2）
- 报告异常

注：当前权限模型以权限点为最小单元，未单独预置只读角色；如需可通过自定义角色配置只读权限点。

---

## 3. 权限点

权限点固定在代码中定义，角色仅配置权限点数组。

```typescript
export const Permission = {
  // 工单域
  WO_READ: 'wo:read',
  WO_RECEIVE: 'wo:receive',
  WO_RELEASE: 'wo:release',
  WO_CANCEL: 'wo:cancel',

  // 批次域
  RUN_READ: 'run:read',
  RUN_CREATE: 'run:create',
  RUN_AUTHORIZE: 'run:authorize',
  RUN_REVOKE: 'run:revoke',
  RUN_CLOSE: 'run:close',

  // 执行域
  EXEC_READ: 'exec:read',
  EXEC_TRACK_IN: 'exec:track_in',
  EXEC_TRACK_OUT: 'exec:track_out',
  EXEC_DATA_COLLECT: 'exec:data_collect',

  // 路由域
  ROUTE_READ: 'route:read',
  ROUTE_CONFIGURE: 'route:configure',
  ROUTE_COMPILE: 'route:compile',
  ROUTE_CREATE: 'route:create',

  // 准备检查域 (M2 新增)
  READINESS_VIEW: 'readiness:view',
  READINESS_CHECK: 'readiness:check',
  READINESS_OVERRIDE: 'readiness:override',
  READINESS_CONFIG: 'readiness:config',

  // 质量域 (M2)
  QUALITY_FAI: 'quality:fai',
  QUALITY_OQC: 'quality:oqc',
  QUALITY_DISPOSITION: 'quality:disposition',

  // 追溯域
  TRACE_READ: 'trace:read',
  TRACE_EXPORT: 'trace:export',

  // 系统域
  SYSTEM_USER_MANAGE: 'system:user_manage',
  SYSTEM_ROLE_MANAGE: 'system:role_manage',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_INTEGRATION: 'system:integration',
} as const;
```

---

## 4. 数据范围控制

### 4.1 产线隔离
某些角色只能访问其负责的产线数据：

| 角色 | 数据范围 |
|-----|---------|
| `leader` | 仅管辖的产线 |
| `operator` | 仅绑定的工位所属产线 |
| 其他角色 | 全部产线 |

### 4.2 工位绑定
操作员需要绑定到特定工位：
- 操作员账号关联一个或多个允许操作的工位
- 进站/出站时验证操作员是否有权操作该工位
- 组长可操作其管辖产线的所有工位

---

## 5. 角色组合场景

### 5.1 小型工厂（人员复用）
| 实际人员 | 系统角色 |
|---------|---------|
| 老板/厂长 | `admin` + `planner` |
| 技术主管 | `engineer` + `quality` |
| 拉长 | `leader` |
| 作业员 | `operator` |

### 5.2 中型工厂（标准配置）
| 实际人员 | 系统角色 |
|---------|---------|
| IT 管理员 | `admin` |
| PMC 计划员 | `planner` |
| PE 工程师 | `engineer` |
| QE 工程师 | `quality` |
| 产线拉长 | `leader` |
| 作业员 | `operator` |

### 5.3 大型工厂（精细分工）
可能需要更细的角色划分，如：
- `senior_operator`: 可以处理简单异常
- `shift_supervisor`: 跨产线的轮班主管
- `quality_inspector`: 只做检验不做处置

---

## 6. 实现方案

### 6.1 数据模型

```prisma
enum DataScope {
  ALL
  ASSIGNED_LINES
  ASSIGNED_STATIONS
}

model Role {
  id          String    @id @default(cuid())
  code        String    @unique
  name        String
  description String?
  permissions String    // JSON array of permission strings
  dataScope   DataScope @default(ALL)
  isSystem    Boolean   @default(false)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userRoles   UserRoleAssignment[]

  @@map("roles")
}

model UserRoleAssignment {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  @@unique([userId, roleId])
  @@map("user_role_assignments")
}

model UserLineBinding {
  id      String @id @default(cuid())
  userId  String
  lineId  String
  user    User   @relation(fields: [userId], references: [id])
  line    Line   @relation(fields: [lineId], references: [id])
  @@unique([userId, lineId])
  @@map("user_line_bindings")
}

model UserStationBinding {
  id        String  @id @default(cuid())
  userId    String
  stationId String
  user      User    @relation(fields: [userId], references: [id])
  station   Station @relation(fields: [stationId], references: [id])
  @@unique([userId, stationId])
  @@map("user_station_bindings")
}

model User {
  // ... existing fields
  preferredHomePage String?

  userRoles      UserRoleAssignment[]
  lineBindings   UserLineBinding[]
  stationBindings UserStationBinding[]
}

### 6.2 权限检查中间件

```typescript
// 后端以权限点 + Ability 为权限源
// - permissionPlugin 提供 requirePermission 宏
// - /api/permissions/me 返回当前用户角色 + 数据范围
```

### 6.3 前端导航过滤

```typescript
// navigation.ts (permissions + permissionMode)
export const navMain = [
  {
    title: '工单管理',
    url: '/mes/work-orders',
    permissions: ['wo:read'],
  },
  {
    title: '批次管理',
    url: '/mes/runs',
    permissions: ['run:read'],
  },
  {
    title: '工位执行',
    url: '/mes/execution',
    permissions: ['exec:read', 'exec:track_in', 'exec:track_out'],
    permissionMode: 'any',
  },
  // ...
];
```

---

## 7. 实现阶段

### Phase 1: 基础权限框架（已完成）
1. [x] 权限常量与 Ability 构建器
2. [x] Prisma 模型（Role/UserRoleAssignment/Binding）
3. [x] 预置角色与权限点

### Phase 2: 后端集成（已完成）
1. [x] permissionPlugin + requirePermission 宏
2. [x] MES API 权限检查与数据范围过滤
3. [x] /api/permissions/me 与 /api/roles CRUD

### Phase 3: 前端集成（已完成）
1. [x] useAbility hook + Can 组件
2. [x] 导航按权限过滤
3. [x] 关键按钮/操作按权限显示

### Phase 4: 角色管理 UI（已完成）
1. [x] 角色列表页（/system/role-management）
2. [x] 角色创建/编辑对话框
3. [x] 用户多角色分配
4. [x] 用户-产线/工位绑定

### Phase 5: 准备检查权限（已完成 2025-12-31）
1. [x] 新增 `readiness:*` 权限点
2. [x] API 权限检查集成
3. [x] 前端按钮/操作权限控制

---

## 8. 准备检查权限说明 (M2 新增)

| 权限点 | 说明 | 典型角色 |
|-------|------|---------|
| `readiness:view` | 查看准备检查结果 | leader, quality, engineer |
| `readiness:check` | 执行预检/正式检查 | leader, quality |
| `readiness:override` | 豁免检查项 | quality, admin |
| `readiness:config` | 管理检查配置（预留） | admin, engineer |

**建议角色配置**：
- `leader`: `readiness:view`, `readiness:check`
- `quality`: `readiness:view`, `readiness:check`, `readiness:override`
- `admin`: 全部 `readiness:*`

---

## 9. 待讨论问题

1. **操作员是否需要看到批次列表？**
   - 当前方向：按权限点 + 数据范围控制，可给 operator 赋予 run:read 并限制到工位/产线

2. **质量工程师是否应该能操作执行页？**
   - 场景：FAI 试产时 QE 可能需要操作
   - 当前方向：通过权限点 exec:track_in / exec:track_out 控制

3. **是否需要审批流？**
   - 场景：批次授权是否需要多人审批
   - 当前方向：权限点已支持单人授权，审批可作为后续流程增强

---

*本设计文档与当前实现保持一致。*
