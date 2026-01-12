> **✅ 已完成 / COMPLETED**
>
> 所有列表页已对齐 `data_list_pattern.md` 标准，详见下方"完成总结"。
>
> **清理日期**：2026-01-12（任务 3.1.3）

---

# Data List Pattern 实现问题追踪

## 参考标准
- 文档: `agent_docs/02_frontend/data_list_pattern.md`
- 参考实现: `apps/web/src/routes/_authenticated/instruments/index.tsx`

## 标准要求
1. 使用 `DataListLayout` 与 `mode="server"`
2. 分页状态与 URL search 同步
3. `FilterToolbar` 和 `DataListView` 使用相同的 `viewPreferencesKey`
4. 路由搜索参数必须通过 `validateSearch` 验证
5. `QueryPresetBar`（系统预设 + 用户自定义查询预设）
6. `dataListViewProps.renderCard`（卡片视图支持）
7. `locationSearch` 参数传递（用于 URL 分享）

## 全局规则（由用户确定）
1. **所有列表都需要卡片视图** - 因为需要在移动端使用
2. **QueryPreset 系统预设不包含"全部"** - 默认状态即为全部，不需要单独的预设

---

## 列表页检查结果

### ✅ 完全符合标准

#### 1. `apps/web/src/routes/_authenticated/instruments/index.tsx`
- validateSearch: ✅
- mode="server": ✅
- URL 同步分页: ✅
- viewPreferencesKey: "instruments"
- QueryPresetBar: ✅ (系统预设: 全部、内校仪器、外校仪器)
- FilterToolbar: ✅
- dataListViewProps: ✅ (InstrumentCard)
- locationSearch: ✅

#### 2. `apps/web/src/routes/_authenticated/calibrations/index.tsx`
- validateSearch: ✅
- mode="server": ✅
- URL 同步分页: ✅
- viewPreferencesKey: "calibrations"
- QueryPresetBar: ✅ (系统预设: 全部、内校、外校、合格、不合格)
- FilterToolbar: ✅
- dataListViewProps: ✅ (CalibrationCard)
- locationSearch: ✅

---

### ⚠️ 需要讨论

#### 3. `apps/web/src/routes/_authenticated/mes/work-orders.tsx`

**缺失项:**
- ❌ QueryPresetBar
- ❌ dataListViewProps.renderCard
- ❌ locationSearch

**需要讨论:**
- 系统预设应该有哪些？（例如: 全部、已接收、已发布、进行中、已完成...）
- 是否需要卡片视图？工单信息较多，卡片展示效果如何？

---

#### 4. `apps/web/src/routes/_authenticated/mes/routes/index.tsx`

**缺失项:**
- ❌ QueryPresetBar
- ❌ dataListViewProps.renderCard
- ❌ locationSearch

**需要讨论:**
- 系统预设应该有哪些？（例如: 全部、ERP来源、MES来源...）
- 路线信息复杂，是否适合卡片视图？

---

#### 5. `apps/web/src/routes/_authenticated/mes/runs/index.tsx`

**缺失项:**
- ❌ QueryPresetBar
- ❌ dataListViewProps.renderCard
- ❌ locationSearch

**需要讨论:**
- 系统预设应该有哪些？（例如: 全部、准备中、已授权、生产中...）
- 批次信息适合卡片视图吗？

---

#### 6. `apps/web/src/routes/_authenticated/system/user-management.tsx`

**特殊实现:**
- 没有使用 `DataListLayout`，手动组合 `QueryPresetBar` + `FilterToolbar` + `DataListView` + `DataTablePagination`
- 已有 QueryPresetBar 和 FilterToolbar
- 已有卡片视图 (UserCard)
- 缺少 locationSearch

**需要讨论:**
- 是否需要迁移到 `DataListLayout`？
- 保持现状还是统一模式？

---

### ❌ 特殊情况

#### 7. `apps/web/src/routes/_authenticated/system/role-management.tsx`

**说明:**
- 完全不符合 `data_list_pattern`
- 使用纯卡片网格布局，没有表格视图
- 角色数量少，不需要分页

**建议:**
- 保持现状，作为例外情况
- 在 `data_list_pattern.md` 中说明此类场景不需要遵循该模式

---

## 讨论记录

### ✅ work-orders.tsx - 已确定
- **QueryPreset 系统预设**:
  - 活跃工单: `{ status: ["RECEIVED", "IN_PROGRESS"] }`
  - 待生产: `{ status: ["RELEASED", "IN_PROGRESS"] }`
  - 已完成: `{ status: ["COMPLETED", "CLOSED"] }`
- **卡片视图**: ✅ 需要（全局规则：移动端支持）
- **viewPreferencesKey**: "work-orders"

### ✅ routes/index.tsx - 已确定
- **QueryPreset 系统预设**:
  - ERP来源: `{ sourceSystem: "ERP" }`
  - MES来源: `{ sourceSystem: "MES" }`
- **卡片视图**: ✅ 需要（全局规则：移动端支持）
- **viewPreferencesKey**: "routes"

### ✅ runs/index.tsx - 已确定
- **QueryPreset 系统预设**:
  - 准备中批次: `{ status: ["PREP", "FAI_PENDING"] }`
  - 生产中批次: `{ status: ["AUTHORIZED", "RUNNING"] }`
  - 已归档: `{ status: ["ARCHIVED"] }`
- **卡片视图**: ✅ 需要（全局规则：移动端支持）
- **viewPreferencesKey**: "runs"

### ✅ user-management.tsx - 已确定
- **迁移到 DataListLayout**: ✅ 是
- **卡片视图**: ✅ 需要（已有 UserCard，需要集成）
- **viewPreferencesKey**: "system-user-management"
- **注意**: 需要添加 locationSearch 参数

---

## 实施清单

### ✅ 1. work-orders.tsx - 已完成
- [x] 添加 `useQueryPresets` hook
- [x] 添加系统预设 (活跃工单、待生产、已完成)
- [x] 添加 `queryPresetBarProps` 到 DataListLayout
- [x] 添加 `locationSearch` 参数
- [x] 创建 `WorkOrderCard` 组件
- [x] 添加 `dataListViewProps.renderCard`

### ✅ 2. routes/index.tsx - 已完成
- [x] 添加 `useQueryPresets` hook
- [x] 添加系统预设 (ERP来源、MES来源)
- [x] 添加 `queryPresetBarProps` 到 DataListLayout
- [x] 添加 `locationSearch` 参数
- [x] 创建 `RouteCard` 组件
- [x] 添加 `dataListViewProps.renderCard`

### ✅ 3. runs/index.tsx - 已完成
- [x] 添加 `useQueryPresets` hook
- [x] 添加系统预设 (准备中批次、生产中批次、已归档)
- [x] 添加 `queryPresetBarProps` 到 DataListLayout
- [x] 添加 `locationSearch` 参数
- [x] 创建 `RunCard` 组件
- [x] 添加 `dataListViewProps.renderCard`

### ✅ 4. user-management.tsx - 已完成
- [x] 重构为使用 `DataListLayout`
- [x] 添加 `locationSearch` 参数
- [x] 集成现有的 UserCard 到 dataListViewProps
- [x] 移除 "全部" 预设

### ✅ 5. 更新 data_list_pattern.md - 已完成
- [x] 添加全局规则说明（所有列表都需要卡片视图 - 移动端支持）
- [x] 添加全局规则说明（系统预设不包含"全部"）
- [x] 添加 role-management 作为例外情况的说明

### ✅ 6. 更新参考实现 - 已完成
- [x] 移除 instruments/index.tsx 中的 "全部" 预设
- [x] 移除 calibrations/index.tsx 中的 "全部" 预设

---

## 完成总结

所有列表页已统一到 `data_list_pattern.md` 定义的标准模式：
- ✅ work-orders.tsx
- ✅ routes/index.tsx
- ✅ runs/index.tsx
- ✅ user-management.tsx
- ✅ instruments/index.tsx (参考实现，已修正)
- ✅ calibrations/index.tsx (参考实现，已修正)

例外情况（保持现状）：
- role-management.tsx (纯卡片网格布局，无需分页)
