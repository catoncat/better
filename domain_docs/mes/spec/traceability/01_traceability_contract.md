# Traceability Contract & Strategies

> **更新时间**: 2025-01-02
> **实现状态**: M1.7 已完成，追溯查询 UI + API 可用

This document defines the traceability contract, with a specific requirement for routing:
- Trace MUST reflect the **route source** and the **frozen executable route version** used at execution time.
- ERP routing updates MUST NOT rewrite the meaning of historical traces.

---

## 1. Goals

Trace queries must answer:
1) What route (and which version) was used
2) Which steps were executed, at which stations, by which event sources
3) What data values were collected and how they were judged
4) What quality outcomes occurred (M1: PASS/FAIL; M2+: defects/disposition/rework)
5) How to reproduce execution semantics later (for audit/forensics)

---

## 2. Mandatory Routing Fields in Trace Output

### 2.1 Route identity
Trace MUST include:
- `route.code`
- `route.sourceSystem` (ERP | MES)
- `route.sourceKey` (ERP FNumber or external key, if applicable)

### 2.2 Frozen executable version
Trace MUST include the version bound to the Run:
- `routeVersion.id` OR `(routingId, versionNo)`
- `routeVersion.compiledAt`

Rationale:
- Ensures trace stability even when ERP sends routing changes later.

Trace SHOULD include the step list and execution semantics from the frozen executable snapshot:
- step sequence (`stepNo`, `operationId`)
- execution semantics (`stationType`, station constraints, gate flags)
- data collection bindings (`dataSpecIds`)

---

## 3. Suggested Trace APIs

### 3.1 Full trace by unit SN
`GET /api/trace/units/{sn}`

Suggested response sections:
- Unit info
- Work order + Run info
- Route + routeVersion (frozen)
- Step list (from routeVersion snapshot)
- Tracks (manual) and/or ingest events (auto/batch/test)
- Data values
- Materials (if implemented)
- Optional snapshot cache

---

## 4. Snapshot Strategy (Optional but Recommended)

### 4.1 TraceSnapshot
A `TraceSnapshot` can cache a computed view.
If used, snapshot MUST include:
- `route.code`
- `route.sourceSystem`
- `routeVersionId` (or versionNo)
- generation timestamp

This prevents snapshot drift when routing updates.

### 4.2 Update triggers
Two acceptable strategies:
- On-demand generation on first query
- Event-driven incremental updates on TrackOut / ingest / data value write

---

## 5. ERP Routing Updates and Trace Consistency

Rules:
- In-flight or completed Runs always reference their frozen routeVersion.
- New Runs reference the latest READY routeVersion.
- Trace defaults to `mode=run` (frozen), not `mode=latest`.

Optional query mode:
- `?mode=run` (default)
- `?mode=latest` (analysis only, not audit-grade)

---

## 6. References
- `domain_docs/mes/spec/routing/01_routing_engine.md`
- `domain_docs/mes/spec/routing/04_route_versioning_and_change_management.md`
- `domain_docs/mes/tech/api/04_api_contracts_trace.md` (if present)
