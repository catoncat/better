# ERP Integration Next Steps Plan (Kingdee)

目标：基于可查询字段清单，完善 ERP 同步与 MES 业务字段覆盖。

## 输入
- `kingdee-*-verified-fields.json`（可查询字段清单）
- `domain_docs/mes/spec/integration/01_system_integrations.md`
- `domain_docs/mes/spec/integration/02_integration_payloads.md`
- `domain_docs/mes/spec/routing/02_erp_route_ingestion.md`

---

## Task 1: 确认可查询字段清单
- [x] 重新运行 `bun scripts/kingdee-fieldkeys-verified.ts`（生产/准生产环境，不再需要）
- [x] 归档环境差异（字段存在/缺失，不再需要）
- [x] 若字段差异明显，补充到 `kingdee-*-verified-fields.json` 的说明（不再需要）

## Task 2: 更新同步字段（PRD_MO / 工单）
- [x] 将 `FRoutingId.*` 与 `FWorkShopID.*` 加入同步字段
- [x] 同步 `FPlanStartDate` / `FPlanFinishDate`
- [x] 同步 `FMaterialId.FSpecification` / `FPriority` / `FSrcBillNo`
- [x] 明确产线字段缺失的替代方案（MES 分派 / 线别映射）

## Task 3: 更新同步字段（ENG_Route / 工艺路线）
- [x] 使用 ExecuteBillQuery 的行字段：
  - `FOperNumber`, `FProcessId.*`, `FWorkCenterId.*`, `FDepartmentId.*`
  - `FOperDescription`, `FKeyOper`, `FIsFirstPieceInspect`,
    `FIsProcessRecordStation`, `FIsQualityInspectStation`
- [x] 验证路由头字段：`FNumber`, `FName`, `FMATERIALID.*`, `FBomId.*`, `FDocumentStatus`
- [x] 更新规范化逻辑，避免使用 `TreeEntity` 前缀

## Task 4: 更新同步字段（BD_Material / 物料）
- [x] 同步 `FSpecification`, `FBarCode`, `FDescription`
- [x] 同步 `FDocumentStatus`, `FForbidStatus`, `FIsBatchManage`, `FIsKFPeriod`
- [x] 同步 `FCategoryID.*`, `FBaseUnitId.*`, `FProduceUnitId.*`
- [x] `FModel` 若无可查询字段，保留为空或仅写 meta

## Task 5: 更新同步字段（ENG_BOM / BOM）
- [x] 同步 `FNumber`, `FMATERIALID.*`, `FMATERIALIDCHILD.*`
- [x] 同步 `FNumerator`, `FDENOMINATOR`, `FSCRAPRATE`, `FFIXSCRAPQTY`
- [x] 同步 `FISKEYCOMPONENT`, `FISSUETYPE`, `FBACKFLUSHTYPE`
- [x] 同步 `FDocumentStatus`, `FForbidStatus`

## Task 6: 更新同步字段（ENG_WorkCenter / 工作中心）
- [x] 同步 `FDeptID.*`, `FWorkCenterType`, `FDocumentStatus`, `FDescription`
- [x] 缺失 `FWorkShopId` / `FIsProductLine` 时，改为部门映射

## Task 7: 数据模型与 API/前端适配
- [x] 评估是否新增字段列（决定先写入 `meta.erp`）
- [x] 不新增列（扩展字段先写入 `meta.erp`，后续视业务再提列）
- [x] API 输出与前端列表展示适配新增字段

## Task 8: ERP 集成模块整理
- [x] 合并/重构 `erp-master-sync-service.ts` 与 `erp-service.ts`（仅 Kingdee）
- [x] 明确同步入口与配置项（路由字段、表单字段）

## Task 9: 验证与回归
- [x] 抽样校验字段值是否真实可用（已用 `kingdee-check-field.ts` 验证 PRD_MO / BD_Material / ENG_BOM / ENG_Route / ENG_WorkCenter）
- [x] 检查同步性能与字段数增长的影响（路由约 14s，工单约 9s，其余表 < 6s）
- [x] 更新文档（若字段差异或映射策略变化）
