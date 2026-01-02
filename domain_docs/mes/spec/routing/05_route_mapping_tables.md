# ERP → MES Mapping Tables

> **更新时间**: 2025-01-02
> **实现状态**: ✅ M1.5 已完成，Operation + WorkCenter 映射可用

This document defines how ERP routing fields map to MES dictionaries and execution constraints.

---

## 1. OperationMapping (ERP processKey → MES Operation)

Purpose:
- ERP provides process identifiers; MES requires a stable `Operation` entity.
- Operations enable reuse and execution config inheritance.

Keys:
- `sourceProcessKey` (ERP process id/code)
- unique per `(sourceSystem, sourceProcessKey)`

Missing mapping policy:
- Early phase: auto-create Operation (audit can be recorded at integration sync level)
- Strict phase: compile INVALID with `MAPPING_MISSING`

---

## 2. WorkCenterStationGroupMapping (ERP workCenter/dept → MES StationGroup)

Positioning (2B):
- Not a hard constraint.
- Used as a default suggestion for stationGroup and governance.
- Compile does not infer station constraints from this mapping; explicit `RouteExecutionConfig` is required.

Keys:
- `sourceWorkCenter` and/or `sourceDepartment`

---

## 3. Stable Step Key (sourceStepKey)

Recommended:
`ERP:{routeNo}:{operNumber}:{processKey}`

Use cases:
- inherit step-level execution config across ERP updates
- track governance and change impact

`sourceStepKey` is stored as an explicit column on `RoutingStep` for indexing and matching.

---

## 4. Governance Views (Recommended)
Provide queries or admin pages for:
- unmapped processKey count
- unmapped workCenter/dept count
- INVALID version reasons distribution
