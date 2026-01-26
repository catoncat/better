---
type: worktree_note
createdAt: "2026-01-25T06:06:41.403Z"
branch: "feat/mes-m4-ingest-exec-mapping"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "MES M4 Ingest: execution mapping + trace aggregation (T4.3.1–T4.3.4)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.3.1-T4.3.4"
  triageNote: ".scratch/2026-01-25_140525_mes-next_Track_A_Slice_3.md"
touchPoints:
  - "domain_docs/mes/spec/routing/01_routing_engine.md"
  - "domain_docs/mes/spec/traceability/01_traceability_contract.md"
  - "apps/server/src/modules/mes/ingest"
  - "packages/db/prisma/schema/schema.prisma"
---

# feat/mes-m4-ingest-exec-mapping - MES M4 Ingest: execution mapping + trace aggregation (T4.3.1–T4.3.4)

## Scope
- Goal: 完成 M4 Ingest 主链路闭环（T4.3.1–T4.3.4）：执行映射（routeVersion snapshot + ingestMapping）→ 写入结果（Track/CarrierTrack + DataValues + PASS/FAIL）→ 门禁/一致性校验（station constraint / mismatch / required data）→ Trace 聚合（trace 输出包含 ingest 事件与对应执行结果）。
- Non-goals: 不恢复/推进 E2E Acceptance；不做 Outbound Feedback（T4.5.*）；不扩展 WP-6 到“末件”实现（仅后续对齐计划）。
- Risks: 写入模型/字段未完全确定导致 schema 变更；Trace 输出 shape 变更可能影响后续 UI/断言；门禁规则需与 routing/traceability contract 保持一致。

## Slices
- [x] Slice 3: M4 Ingest - execution mapping + trace aggregation (T4.3.1–T4.3.4)

## Latest Decisions (2026-01-25)
- IngestMapping path 语义：按文档实现，path 从 ingest event 根对象开始，raw payload 在 `payload.*`。
- BATCH 写入策略：CarrierTrack + 每个 Unit 的 Track（DataValue 默认写到 CarrierTrack；如需 per-unit values 再扩展）。
- 错误策略：若触发 STEP_MISMATCH / STATION_MISMATCH / REQUIRED_DATA_MISSING 等一致性错误，则本次 ingest 直接失败且不落库（便于用同 dedupeKey 修正后重试）。

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-26T02:27:00Z
- BaseRef: origin/main
- CommitsAheadOfBase: 5
- Dirty: true
- ChangedFiles:
  - domain_docs/mes/plan/phase4_tasks.md
  - domain_docs/mes/tech/api/04_api_contracts_trace.md
  - apps/server/src/testing/integration/mes-ingest-batch.test.ts
  - worktree_notes/feat_mes-m4-ingest-exec-mapping.md
- Next:
  - Run bun scripts/smart-verify.ts, then fast-forward merge to main.
<!-- AUTO:END status -->

## Decisions
- 优先级：验收暂停（本分支只做 T4.3.1–T4.3.4）。
- WP-6：仅对齐计划状态（不在本分支实现“末件”）。

## Findings
- Ingest API 入口：`apps/server/src/modules/mes/ingest/routes.ts:14-95`（POST `/ingest/events`）。
- Ingest 持久化/规范化：`apps/server/src/modules/mes/ingest/service.ts:369-530`（`createIngestEvent`）
  - 会从 Run 绑定的 `routeVersion.snapshotJson` 解析 `ingestMapping`（`resolveIngestMapping`: 146-158），并把 payload 规范化（`normalizePayload`: 191-222）。
  - 当前 `resolveIngestMapping` 仅按 `step.stationType === eventType` 取第一个候选；尚未做到“定位 step/unit”（T4.3.1 的核心）。
- Routing spec（门禁错误码）明确了：`STEP_MISMATCH` / `STATION_MISMATCH` / `REQUIRED_DATA_MISSING`（见 `domain_docs/mes/spec/routing/01_routing_engine.md`）。
- Traceability contract（M4 planned）要求 trace 输出的 `ingestEvents[]` 能关联到 Track/CarrierTrack/DataValue（见 `domain_docs/mes/spec/traceability/01_traceability_contract.md`）。

## Open Questions
- BATCH 事件（carrier + snList）最终写入粒度：只写 `CarrierTrack` + carrier-level `DataValue`，还是要同时为每个 SN 生成 `Track/DataValue`？（先读现有 execution/trace 实现与 specs 后再定）
