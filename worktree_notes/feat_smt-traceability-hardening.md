---
type: worktree_note
createdAt: "2026-01-24T15:05:00.979Z"
branch: "feat/smt-traceability-hardening"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: completed  # pending | in_progress | completed
task:
  title: "SMT traceability hardening (WP-1 time rules + readiness templateization)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.6.1/T4.6.2/T4.6.6"
  triageNote: "Track A (next triage 2026-01-24)"
---

# feat/smt-traceability-hardening - SMT traceability hardening (WP-1 time rules + readiness templateization)

## Scope
- Goal: implement Track A (T4.6.1/T4.6.2/T4.6.6) with backend + UI + docs alignment.
- Non-goals: no acceptance run, no M4 ingest mapping, no outbound feedback work.
- Risks: static template view does not capture “需要/不需要” detail; WASH scan point depends on line setup.

## Slices
- [x] Slice 0: worktree note context + confirm open questions
- [x] Slice 1: WP-1 time window rule alignment (event handling + docs/plan)
- [x] Slice 2: Readiness checklist template view (static UI + docs/plan)

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-24T15:05:00.980Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- Track A selected; worktree created: feat/smt-traceability-hardening.
- Option 1: static pre-run checklist template view (no DB changes).
- Option A: WASH_4H starts on REFLOW or AOI track-out, ends on WASH track-in.

## Findings
- `domain_docs/mes/spec/data_collection/01_data_collection_specs.md` has no time-window or readiness-specific rules; likely need separate spec or extend elsewhere for T4.6.1/T4.6.2.
- `domain_docs/mes/spec/config/README.md` defines template-based time rule config + prep item policy, but notes it is “docs only” (no implementation yet).
- Time rule template/sample defines `rules` with `ruleCode`, `scopeType/scopeRef`, `startEvent/endEvent`, `maxDurationHours`, `alertLevel`, `waivePermission`.
- Prep item policy template defines `items` with `itemCode`, `gateType`, `recordRequired`, `confirmMode`, `dataSource`, `waivePermission`, `evidenceRefType`.
- Config override doc suggests `ConfigOverride` model with `configType` (PREP_ITEM_POLICY/TIME_RULE_CONFIG), scoped overrides, audit trail (doc-only).
- Existing time rule API models include TimeRuleDefinition (ruleType, duration, warning, start/end events, scope, waivable) and TimeRuleInstance (waive support).
- Time rule routes already expose CRUD for definitions and list/waive for instances (permissions: READINESS_CONFIG/READINESS_OVERRIDE).
- Mes event processor creates/completes time rule instances based on `startEvent`/`endEvent` and ruleType checks (WASH_TIME_LIMIT uses REFLOW/WASH op codes; SOLDER_PASTE_EXPOSURE uses paste usage events).
- Readiness check already evaluates time rule instances by run: EXPIRED => FAILED, WAIVED => WAIVED, ACTIVE => PASSED.
- Readiness schemas focus on check results/waive/exception listing; no template-specific API yet.
- Prisma schema has ReadinessCheck/ReadinessCheckItem models; no template/config override model exists yet. ReadinessItemType already includes PREP_* and TIME_RULE. TimeRuleType limited to SOLDER_PASTE_EXPOSURE + WASH_TIME_LIMIT.
- Web time rule UI currently only supports `SOLDER_PASTE_EXPOSURE` and `WASH_TIME_LIMIT` rule types (dialog select).
- WP-1 spec: time window rules are “印锡→焊接 <4h” and “锡膏暴露 <24h”, with reminders + waivers; requires confirming start/end events and data sources; suggests rule service + violation log + alert.
- SMT form matrix explicitly asks to confirm time window policy (block vs remind) and who can waive; current gap report says time rules not implemented and readiness soft-gate missing.
- MES events are limited to TRACK_IN/TRACK_OUT/SOLDER_PASTE_USAGE_CREATE/SOLDER_PASTE_USAGE_UNBIND; time rules rely on these event types plus payload (operation codes, etc).
- Readiness checks can be selectively enabled via `line.meta` (parseEnabledReadinessChecks), otherwise all checks run; TIME_RULE contributes to FAILED if expired.
- Enabled readiness checks are currently read from `line.meta.readinessChecks.enabled` (no template model yet).
- Codex analysis suggests adding `PreRunChecklistTemplate + PreRunChecklistItem` and `TimeWindowPolicy` models (not present today).
- Architecture doc claims WP-5 can reuse existing ReadinessCheck with templateization (no new model mandated).
- Prior note (2026-01-24 smt-time-rule-fix) aligned time rule codes/events (`SOLDER_PASTE_24H`, `WASH_4H`, `TRACK_OUT`/`TRACK_IN`) and updated templates/samples; avoid reintroducing mismatches.
- Seeded time rules are `SOLDER_PASTE_24H` and `WASH_4H` (global scope, start/end events configured).
- Line routes parse readiness config from `line.meta.readinessChecks.enabled`; default enables all ReadinessItemType.
- Line readiness-config GET/PUT endpoints already exist to manage `line.meta.readinessChecks.enabled`.
- Web readiness-config page only toggles which readiness item types are enabled per line; no checklist item template UI exists.
- Readiness API exposes precheck/formal check + waive item, but no checklist template endpoints.
- User-confirmed matrix says “印锡→回流焊 <4h” is just a reminder and clarifies the real control is reflow/AOI → wash within 4h (scan at wash machine).
- Time-rule cron already marks warnings/expired instances, creates readiness items on expiry, and dispatches notifications to line users/supervisors.
- Seeded time rules are `SOLDER_PASTE_24H` (SOLDER_PASTE_EXPOSURE) and `WASH_4H` (WASH_TIME_LIMIT) with start/end events TRACK_OUT/IN and SOLDER_PASTE_USAGE_CREATE/UNBIND.
- `TimeRuleInstance` declares `activeKey` twice in `packages/db/prisma/schema/schema.prisma`, causing Prisma validation failure.

## Open Questions
- None (time window events confirmed; template view is static by choice).

## Errors
- `bun scripts/smart-verify.ts` failed at `bun run db:generate` with Prisma error P1012: duplicate `activeKey` field on `TimeRuleInstance` (`packages/db/prisma/schema/schema.prisma:2189`). Not addressed here.
