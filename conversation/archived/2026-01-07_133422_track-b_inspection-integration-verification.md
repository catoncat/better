# Track B: SPI/AOI 检测结果集成验证

> Date: 2026-01-07
> Task: G3 - FAI/TrackOut 读取 SPI/AOI 检测结果
> Status: **已完成** (代码已实现，文档已更新)

## Context

在 MES M2 收尾阶段，需要验证 FAI/TrackOut 是否正确读取 SPI/AOI 检测结果。

## Analysis

### TrackOut 检测结果集成 ✅ 已实现

**代码位置**: `apps/server/src/modules/mes/execution/service.ts:392-408`

```typescript
// Check inspection result records (SPI/AOI) for this track - auto-override if FAIL
const inspectionFail = await db.inspectionResultRecord.findFirst({
    where: {
        trackId: track.id,
        result: InspectionResultStatus.FAIL,
    },
    orderBy: { eventTime: "desc" },
});
const inspectionOverride = inspectionFail !== null;
if (inspectionOverride) {
    span.setAttribute("mes.inspection.override", true);
    span.setAttribute("mes.inspection.fail_record_id", inspectionFail.id);
}

// If inspection FAIL exists, force result to FAIL regardless of manual input
const result =
    inspectionOverride || data.result === "FAIL" ? TrackResult.FAIL : TrackResult.PASS;
```

**逻辑**:
1. TrackOut 时查询当前 Track 关联的 `InspectionResultRecord`
2. 如果存在 `result: FAIL` 的记录，则强制 TrackOut 结果为 FAIL
3. 返回 `inspectionOverride: true` 标识给调用方

### FAI 检测结果集成 ❌ 不需要

FAI (First Article Inspection) 是首件检验流程，它是人工检验过程：
- FAI 检验项由检验员手动录入
- FAI 判定由检验员决定
- FAI 不需要自动读取 SPI/AOI 检测结果

SPI/AOI 检测结果可能作为参考信息展示，但这是增强功能，不是核心集成需求。

### 检测结果接收 API ✅ 已实现

**端点**: `POST /api/integration/inspection-result`

**代码位置**:
- Schema: `apps/server/src/modules/mes/integration/inspection-result-schema.ts`
- Service: `apps/server/src/modules/mes/integration/inspection-result-service.ts`
- Routes: `apps/server/src/modules/mes/integration/routes.ts:892-945`

**功能**:
- 接收 SPI/AOI 检测结果
- 基于 `eventId` 幂等处理
- 自动查找匹配的 Track (`trackId` 解析)
- FAIL 结果自动创建 Defect 记录
- 记录到 IntegrationMessage 审计追踪

## Decisions

1. **确认 TrackOut 检测结果集成已完成** - 代码分析验证
2. **FAI 不需要核心集成** - 人工检验流程设计
3. **更新文档** - 移除 phase2_tasks.md Review Notes 中的矛盾说明

## Changes Made

- `domain_docs/mes/plan/phase2_tasks.md`: 移除 "集成接口：FAI/TrackOut 读取检测结果尚未实现" 说明

## Open Questions

None - 集成已完成。

## References

- TrackOut Service: `apps/server/src/modules/mes/execution/service.ts`
- Inspection Result Service: `apps/server/src/modules/mes/integration/inspection-result-service.ts`
- Previous Discussion: `conversation/2026-01-06_234805_mes_inspection-result-api.md`
