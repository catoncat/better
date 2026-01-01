# Kingdee Field Discovery Tools

这个工具帮助你发现金蝶云星空 WebAPI 中各个表单（FormId）的所有可用字段。

## 背景

我们的系统正在从金蝶 ERP 同步以下数据：

- **PRD_MO**: 生产订单 (Work Orders)
- **BD_Material**: 物料主数据 (Materials)
- **ENG_BOM**: 物料清单 (Bill of Materials)
- **BD_WorkCenter / PRD_WorkCenter**: 工作中心 (Work Centers)
- **ENG_Route**: 工艺路线 (Routings)

目前我们只同步了部分字段。这个工具帮助你发现每个表单的所有可用字段，以便：

1. 了解金蝶中有哪些数据可以同步
2. 决定是否需要同步更多字段
3. 更新字段映射配置

## 工具说明

### 1. `kingdee-fields-complete.ts` ⭐ **结构发现**

这是最全面的字段发现工具，使用两步法：

1. 用 `ExecuteBillQuery` 找到示例记录
2. 用 `View` API 获取完整的数据模型结构

**使用方法：**

```bash
# 发现所有表单的字段
bun scripts/kingdee-fields-complete.ts

# 只发现特定表单
bun scripts/kingdee-fields-complete.ts PRD_MO
bun scripts/kingdee-fields-complete.ts BD_Material
```

**输出：**

- 控制台：字段列表和结构预览
- JSON 文件：完整的数据模型和字段分析（`kingdee-{FormId}-complete.json`）

### 2. `kingdee-fieldkeys-verified.ts` ⭐⭐ **可查询字段验证**

基于 View 结构生成候选字段，并用 ExecuteBillQuery 验证哪些字段是真正可查询的。

**使用方法：**

```bash
# 验证所有表单可查询字段
bun scripts/kingdee-fieldkeys-verified.ts

# 只验证特定表单
bun scripts/kingdee-fieldkeys-verified.ts PRD_MO
bun scripts/kingdee-fieldkeys-verified.ts ENG_Route
```

**输出：**

- JSON 文件：`kingdee-{FormId}-verified-fields.json`
- 包含 queryableFields / invalidFields / 结构摘要

### 3. `kingdee-discover-fields-query.ts`

使用 `ExecuteBillQuery` 来测试和分析字段。适合用于：

- 快速测试特定字段是否可用
- 查看字段的实际数据示例
- 不需要具体单据编号

**使用方法：**

```bash
bun scripts/kingdee-discover-fields-query.ts
```

### 4. `kingdee-discover-fields.ts`

使用 `View` API 的原始版本。需要你提供示例单据编号。

## 环境变量配置

运行前需要设置以下环境变量（通常在 `.env` 文件中）：

```bash
MES_ERP_KINGDEE_BASE_URL=http://your-kingdee-server/K3Cloud/
MES_ERP_KINGDEE_DBID=your_database_id
MES_ERP_KINGDEE_USERNAME=administrator
MES_ERP_KINGDEE_APPID=your_app_id
MES_ERP_KINGDEE_APP_SECRET=your_app_secret
MES_ERP_KINGDEE_LCID=2052
```

## 输出文件

工具会生成 JSON 文件，包含：

- `formId`: 表单标识
- `formName`: 表单名称
- `currentFields`: 当前正在同步的字段（标记为 ✓）
- `discoveredFields`: 发现的所有字段
- `rawModel`: 完整的金蝶数据模型
- `sampleNumber`: 使用的示例单据编号

## 如何使用发现的字段

1. **查看输出的字段列表**：优先参考 `kingdee-*-verified-fields.json` 中的 `queryableFields`

2. **更新同步配置**：编辑 `apps/server/src/modules/mes/integration/erp-master-sync-service.ts`

   ```typescript
   // 例如：为生产订单添加更多字段
   const WORK_ORDER_FIELDS = [
     "FBillNo",
     "FMaterialId.FNumber",
     "FQty",
     "FPlanFinishDate",
     "FStatus",
     "FPickMtrlStatus",
     "FModifyDate",
     // 新增字段
     "FWorkShopID.FNumber",    // 车间
     "FProduceLineId.FNumber", // 生产线
   ];
   ```

3. **更新索引映射**：同时更新对应的 INDEX 常量

   ```typescript
   const WORK_ORDER_INDEX = {
     woNo: 0,
     productCode: 1,
     plannedQty: 2,
     dueDate: 3,
     erpStatus: 4,
     erpPickStatus: 5,
     updatedAt: 6,
     // 新增
     workshop: 7,
     productLine: 8,
   } as const;
   ```

4. **更新数据处理逻辑**：在 `normalizeWorkOrders` 等函数中使用新字段

## 金蝶字段命名规则

- **基础字段**：`FBillNo`, `FNumber`, `FName` 等
- **关联字段**：`FMaterialId.FNumber` 表示物料的编号
- **分录字段**：`FTreeEntity.FQty` 表示分录表中的数量
- **组织字段**：`FPrdOrgId.FNumber` 表示生产组织的编号

## 示例工作流

```bash
# 1. 发现生产订单的所有字段
bun scripts/kingdee-fields-complete.ts PRD_MO

# 2. 查看输出，找到需要的字段（如 FWorkShopID.FNumber）

# 3. 编辑 erp-master-sync-service.ts，添加新字段

# 4. 测试同步
bun scripts/kingdee-sync.ts

# 5. 检查数据库，验证新字段已正确同步
```

## 故障排除

### 问题：No records found

**原因**：金蝶系统中该表单没有数据

**解决**：
- 检查金蝶系统中是否有相应单据
- 尝试其他 FormId

### 问题：View API failed

**原因**：可能是单据编号不存在或权限不足

**解决**：
- 检查用户权限
- 确保示例单据存在且已审核

### 问题：Login failed

**原因**：环境变量配置错误

**解决**：
- 检查 `.env` 文件中的配置
- 确认服务器 URL、数据库 ID、用户名和密码

## 相关文档

- [金蝶云星空 WebAPI 文档](https://vip.kingdee.com/article/139606735600983552)
- [ExecuteBillQuery 使用说明](你提供的那个 Markdown 文档)
- [系统集成设计文档](../../domain_docs/mes/spec/)

## 下一步

发现字段后，你可能需要：

1. 更新数据库 schema（如果需要存储新字段）
2. 更新 TypeScript 类型定义
3. 更新前端显示逻辑
4. 更新 API 响应格式

参考项目文档中的集成和数据处理指南。
