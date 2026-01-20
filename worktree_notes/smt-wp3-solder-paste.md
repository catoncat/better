---
type: worktree_note
createdAt: "2026-01-20T03:03:35.653Z"
branch: "smt-wp3-solder-paste"
baseRef: "origin/main"
task:
  title: "SMT WP-3 锡膏生命周期"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "4.6.4 锡膏生命周期 (WP-3)"
  triageNote: "DB+API+UI+docs slices"
---

# smt-wp3-solder-paste - SMT WP-3 锡膏生命周期

## Scope
- Goal: deliver WP-3 solder paste lifecycle (usage + cold storage temp) with DB/API/UI + align/plan update.
- Non-goals: productization/generalized dynamic tables; time-window enforcement beyond data capture.
- Risks: shared schema/routes conflicts if other branches touch MES readiness; bun.lock local drift.

## Slices
- [x] Slice 0: worktree note context
- [ ] Slice 1: DB schema + migration (solder paste usage + cold storage temp)
- [ ] Slice 2: Server API + audit entries + routes wiring
- [ ] Slice 3: Web UI list + create dialog + hooks
- [ ] Slice 4: Docs align + plan checkbox update

## Findings
- Plan DoD for 4.6.4 requires end-to-end trace for thaw/warm/mix/issue/return and cold storage temp capture.
- QR-Pro-013 fields: receivedAt, expiresAt, receivedQty, pasteLotId, line, thawedAt, issuedAt, returnedAt, isReturned, usedBy, remark.
- QR-Pro-073 requires twice-daily fridge temp with measuredAt, temperature, measuredBy, reviewedBy; spec range 0-8C (store as data, enforcement later).
- Bake module pattern: list uses Permission.READINESS_VIEW; create uses Permission.READINESS_CHECK; audit via AuditEntityType.* with recordAuditEvent.
- Existing integration `solderPasteStatus` uses lotId + thawedAt/stirredAt/status; WP-3 should be separate usage/temperature records.
- Current `schema.prisma` already defines `SolderPasteUsageRecord`, `ColdStorageTemperatureRecord`, `AuditEntityType` entries, and `Line.solderPasteUsageRecords`.
- Migration `20260120022915_add_solder_paste_usage` already present in repo.
- Deep analysis 3.2 confirms need for SolderPasteUsage + cold storage temp; existing SolderPasteStatusRecord covers thawedAt/stirredAt but lacks usage/temperature UI and 24h rule.
- Readiness check uses LineSolderPaste + SolderPasteStatusRecord only; new usage/temperature APIs can be separate without impacting readiness.
- MES routes register modules via `.use(...)` in `apps/server/src/modules/mes/routes.ts`.
- Bake service pattern: parseDate helper, list uses Prisma where + pagination, create returns ServiceResult with specific error codes and validates time ranges.
- Manual integration UI uses TanStack Form `Field` + `Input type="datetime-local"` for timestamps; consistent for WP-3 dialog.
- Data list pages must use DataListLayout + FilterToolbar + QueryPresetBar, server-mode pagination, and provide both table + card views.
- Create/edit dialog pattern: infer API input types from Eden client and use Zod schema; keep ISO strings for date/time fields.
- Bake records list page is a canonical DataListLayout implementation (filters via URL, server pagination, preset handling) to mirror for WP-3 list.
- Navigation places bake records under “准备与防错”; WP-3 should likely live in same group.
- Hook pattern: use Eden `client.api["path"]` get/post, expose list data + create mutation with toast + invalidate.

<!-- AUTO:BEGIN status -->

## Status (auto)
- UpdatedAt: 2026-01-20T03:03:35.654Z
- BaseRef: origin/main
- CommitsAheadOfBase: 15
- Dirty: true
- ChangedFiles:
  - "conversation/2026-01-20_094100_MES\344\272\247\345\223\201\345\214\226\346\236\266\346\236\204\345\206\263\347\255\226.md"
  - "conversation/2026-01-20_100810_SMT_\351\200\232\347\224\250\345\214\226\346\226\271\346\241\210\350\257\264\346\230\216.md"
  - apps/server/src/modules/mes/bake/routes.ts
  - apps/server/src/modules/mes/bake/schema.ts
  - apps/server/src/modules/mes/bake/service.ts
  - apps/server/src/modules/mes/loading/routes.ts
  - apps/server/src/modules/mes/loading/schema.ts
  - apps/server/src/modules/mes/loading/service.ts
  - apps/server/src/modules/mes/routes.ts
  - apps/web/src/components/login-form.tsx
  - apps/web/src/config/navigation.ts
  - apps/web/src/hooks/use-bake-records.ts
  - apps/web/src/hooks/use-loading.ts
  - apps/web/src/hooks/use-slot-mappings.ts
  - apps/web/src/routes/__root.tsx
  - apps/web/src/routes/_authenticated/mes/bake-records/-components/bake-record-card.tsx
  - apps/web/src/routes/_authenticated/mes/bake-records/-components/bake-record-columns.tsx
  - apps/web/src/routes/_authenticated/mes/bake-records/-components/bake-record-dialog.tsx
  - apps/web/src/routes/_authenticated/mes/bake-records/-components/bake-record-field-meta.tsx
  - apps/web/src/routes/_authenticated/mes/bake-records/index.tsx
  - apps/web/src/routes/_authenticated/mes/loading/-components/loading-history.tsx
  - apps/web/src/routes/_authenticated/mes/loading/-components/mapping-dialog.tsx
  - apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx
  - apps/web/src/routes/_authenticated/mes/loading/index.tsx
  - apps/web/src/routes/_authenticated/mes/loading/slot-config.tsx
  - apps/web/src/routeTree.gen.ts
  - bun.lock
  - conversation/2026-01-19_211002_SMT_non-conflict_implementation.md
  - conversation/2026-01-19_221441_SMT_WP-9_implementation_plan.md
  - conversation/2026-01-20_092857_SMT_WP-2_BakeRecord_implementation.md
  - conversation/2026-01-20_100849_Login_loading_issue_analysis.md
  - conversation/2026-01-20_102301_line-routing-validation-design.md
  - domain_docs/mes/CONTEXT.md
  - domain_docs/mes/plan/phase4_tasks.md
  - domain_docs/mes/spec/architecture/01_product_abstraction.md
  - domain_docs/mes/spec/impl_align/03_smt_align.md
  - packages/db/prisma/schema/migrations/20260120011200_add_bake_record/migration.sql
  - packages/db/prisma/schema/migrations/20260120022915_add_solder_paste_usage/migration.sql
  - packages/db/prisma/schema/schema.prisma
  - worktree_notes/main-smt-non-conflict.md
- Next:
  - Commit worktree note: git add worktree_notes/smt-wp3-solder-paste.md && git commit -m "docs(worktree): add task context"
<!-- AUTO:END status -->

## Decisions
- Use dedicated worktree `smt-wp3-solder-paste` to isolate from dirty main.
- Implement SMT-specific tables first; generalized abstraction deferred.

## Open Questions
-
