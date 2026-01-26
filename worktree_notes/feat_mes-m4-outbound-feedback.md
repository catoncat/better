---
type: worktree_note
createdAt: "2026-01-26T05:42:44.539Z"
branch: "feat/mes-m4-outbound-feedback"
baseRef: "origin/main"
dependencies:
  blockedBy: []
  blocks: []
status: in_progress  # pending | in_progress | completed
task:
  title: "M4 Outbound feedback MVP (T4.5.1-T4.5.2)"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "T4.5.1-T4.5.2"
  triageNote: ".scratch/2026-01-26_124800_next_mes_triage.md"
touchPoints:
  - "domain_docs/mes/plan/phase4_tasks.md"
  - "domain_docs/mes/tech/api/01_api_overview.md"
  - "apps/server/src/modules"
  - "packages/db/prisma/schema/schema.prisma"
---

# feat/mes-m4-outbound-feedback - M4 Outbound feedback MVP (T4.5.1-T4.5.2)

## Scope
- Goal: Land ERP outbound feedback MVP (contract + enqueue + retryable outbox delivery).
- Non-goals: Auto-trigger on every state transition; TPM outbound feedback.
- Risks: External ERP endpoint contract still TBD; delivery is best-effort until ERP endpoint is available/configured.

## Slices
- [x] Contract: outbound payload spec
- [x] DB: outbox + indexes
- [x] Server: enqueue + delivery worker
- [x] Docs/tests: acceptance + trace

## Findings
- No existing “outbox” implementation found in `apps/server/src` (needs new model/worker).
- Existing integration pattern: MES inbound services log to `IntegrationMessage` for audit/idempotency (see `apps/server/src/modules/mes/integration/*` + `packages/db/prisma/schema/schema.prisma`).
- Domain doc already defines outbound integration expectations: `domain_docs/mes/spec/integration/01_system_integrations.md` (MES → ERP / TPM).
- `domain_docs/mes/spec/integration/02_integration_payloads.md` currently defines inbound payloads only (no outbound contract yet).
- Existing retryable queue exists: `MesEvent` table + `mes-event-cron` (`apps/server/src/plugins/mes-event-cron.ts`) + processor (`apps/server/src/modules/mes/event/processor.ts`) → can be extended for outbound.

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-26T05:42:44.539Z
- BaseRef: origin/main
- CommitsAheadOfBase: 0
- Dirty: true
- ChangedFiles:
  - (none)
- Next:
  - Continue the next unchecked slice.
<!-- AUTO:END status -->

## Decisions
- MVP direction: implement ERP “run completion” outbound feedback first (manual enqueue endpoint + cron delivery), keep TPM as follow-up.
- Outbox/retry: reuse `MesEvent` as outbox; add `OUTBOUND_FEEDBACK` event type and a delivery handler in the mes-event processor.
- Delivery toggle: outbound processing disabled by default via env; when disabled, enqueue is allowed but cron won’t deliver.

## Open Questions
-
