# Phase 4 Plan (M4 - Ingest & Automation) — Draft

> 状态：草案（待确认范围）
> 更新时间：2026-01-14
> 目标：在不破坏 M3 上线默认“人工 TrackIn/TrackOut”的前提下，补齐 AUTO/BATCH/TEST 的 ingest 执行闭环，并为后续回传/自动化扩展提供稳定接口。

---

## -1. Current Priority (Acceptance)（先验收再做 M4）

在开始本阶段开发前，当前最紧急任务是**跑全流程验收**（尤其前端集成/UI 操作链路），把阻断性问题收敛到可复现清单并修复/确认。

- 验收计划：`user_docs/demo/acceptance_plan.md`
- 问题跟踪：`user_docs/demo/acceptance_issues.md`

原则：
- 未完成验收（或仍存在 P0 阻断问题）时，不建议推进 Track A/B/C 的实现开发。

## 0. Scope / Non-Goals

### 0.1 M4 In-Scope（本期交付）

- **Ingest 事件接入**：支持 AUTO/BATCH/TEST 事件写入（幂等、可回放、可审计）。
- **执行闭环**：基于 `ingestMapping` 将事件映射为执行结果（Tracks/CarrierTracks + DataValues + PASS/FAIL）。
- **追溯覆盖**：Trace 可呈现“手工 Track”与“ingest 事件”来源，且与冻结 routeVersion snapshot 对齐。
- **回归保护**：不影响既有 MANUAL TrackIn/TrackOut + 质量闭环（M2）与上线验收脚本（M3）。

### 0.2 非目标（后续/按需）

- 回传/outbound feedback：是否纳入 M4 TBD（建议作为独立 Track 推进，避免阻塞 ingest 闭环）
- 大规模报表/看板（BI/统计）
- 设备实时控制闭环（非 ingest 范畴）

---

## 1. Go/No-Go 验收标准（建议）

P0（必须）：
- Ingest API 支持幂等（dedupeKey），重复上报不产生重复副作用。
- AUTO/TEST step 能通过 ingestMapping 自动写入 DataValue，并产生可追溯的执行事件/结果。
- Trace API 能展示 ingest 事件来源、映射后的结果、以及对应的 routeVersion（冻结）。
- 现有 MANUAL 执行路径与 `bun apps/server/scripts/test-mes-flow.ts` 仍稳定通过（回归）。

---

## 2. Workstreams（可并行 Tracks）

> Status: [x] done, [~] in progress, [ ] pending

### 2.1 Track A — M4 Planning & Contract（P0）

- [ ] 4.1.1 定义 IngestEvent 合约（字段、幂等键、来源系统、时间戳、payload 约束）
- [ ] 4.1.2 定义/收敛 `ingestMapping` 结构（如何提取 sn/station/time/result/measurements）
- [ ] 4.1.3 补充 M4 验收场景（AUTO/TEST 最小闭环；含回放/幂等/追溯断言）

### 2.2 Track B — Ingest Event Foundation（DB + API）（P0）

- [ ] 4.2.1 Schema: IngestEvent（持久化 + 索引 + 去重策略 + 必要关联）
- [ ] 4.2.2 Server: Ingest API（create + idempotency + validation + error taxonomy）
- [ ] 4.2.3 Service: raw persistence → normalize/dispatch（为后续执行/追溯留扩展点）
- [ ] 4.2.4 Trace: 事件可查询/可关联（最小字段回显，支持回放定位）

### 2.3 Track C — AUTO/TEST Execution via `ingestMapping`（P0）

- [ ] 4.3.1 执行映射：根据 routeVersion snapshot + ingestMapping 解析事件并定位 step/unit
- [ ] 4.3.2 写入结果：生成 Track/CarrierTrack（如适用）+ DataValues + PASS/FAIL outcome
- [ ] 4.3.3 门禁/一致性：station constraint / step mismatch / required data 校验与可定位错误
- [ ] 4.3.4 Trace 聚合：trace 输出包含 ingest 事件与对应的执行结果/数据值

### 2.4 Track D — Optional: Readiness Config（UX/API）（P1）

- [ ] 4.4.1 Readiness 配置模型与 API（开关/规则/默认值可配置）
- [ ] 4.4.2 Web 配置页（工程师/管理员可操作；与权限/审计一致）

### 2.5 Track E — Optional: Outbound Feedback（ERP/TPM）（TBD）

- [ ] 4.5.1 定义回传 payload 合约（完成/质量/追溯摘要；幂等键）
- [ ] 4.5.2 Outbox/重试策略（失败回放、死信、审计）

---

## 3. Conflicts / Shared Touch Points

- Track B ↔ Track C：共享触点（执行服务/追溯聚合），建议不要在同一分支并行推进。
- Track A → Track B/C：合约/映射结构会决定 DB/API 设计，建议先落地最小合约再实现。
- Track E：与集成/审计/幂等基础设施共享触点，建议后置到 ingest 闭环稳定后推进。

---

## 4. References

- `domain_docs/mes/plan/01_milestones.md`
- `domain_docs/mes/spec/routing/01_routing_engine.md`
- `domain_docs/mes/spec/routing/03_route_execution_config.md`
- `domain_docs/mes/spec/traceability/01_traceability_contract.md`
- `conversation/2026-01-14_115848_mes-next_triage.md`
- `user_docs/demo/acceptance_plan.md`
- `user_docs/demo/acceptance_issues.md`
