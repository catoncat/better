---
type: worktree_note
createdAt: "2026-01-20T04:45:00Z"
branch: "smt-basic-wp4-10"
baseRef: "origin/main"
task:
  title: "SMT WP-4/7/8/10 基础记录落地"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "4.6.5/4.6.8/4.6.9/4.6.11"
  triageNote: "DB+API+UI+docs slices"
---

# smt-basic-wp4-10 - SMT WP-4/7/8/10 基础记录落地

## Scope
- Goal: implement base record capture for stencil/squeegee life, equipment inspection, oven program records, and daily QC/exception.
- Non-goals: workflow gating, alarms, or cross-process integration.
- Risks: unclear form fields; avoid touching unrelated main changes.

## Slices
- [x] Slice 1: read forms/specs + confirm fields
- [ ] Slice 2: DB schema + migration
- [ ] Slice 3: Server APIs + audit
- [ ] Slice 4: Web list pages + dialogs + nav
- [ ] Slice 5: Docs (align + plan)

## Findings
- Prisma: edit `packages/db/prisma/schema/schema.prisma`, create migration via `bun run db:migrate -- --name <change>`.
- API patterns: ServiceResult in service layer, routes handle audit with `recordAuditEvent`, envelope `{ ok, data/error }` required.
- Data list pages must use DataListLayout server mode with card+table views, URL-synced filters, and `viewPreferencesKey`.
- List default sorting: record lists should order by time desc with stable fallback.
- Dialog forms must infer types from Eden, use Zod schema, store ISO strings for DateTime, and normalize inputs.
- QR-Pro-089 fields: line, date, stencil thickness, product model, single print count, total print count, replacement time, inspection items (deform/hole/seal), tension readings, usedBy, confirmedBy, remark; lifespan note: 60k prints.
- Steel stencil cleaning record: model, cleanedAt, operator, confirmedBy, remark.
- QR-Mac-144 fields: line, date, product model, squeegee spec, single print count, total print count, replacement time, inspection items (surface/edge/flatness), usedBy, confirmedBy, remark; lifespan note: 100k prints, weekly check.
- QR-Mac-238 fields: date, machine name, sample model, version, program, result (pass/fail), inspector, remark; note: QC feedback on failure.
- QR-Pro-105 fields: line, equipmentId, date, product name, program name, usedBy, confirmedBy, remark.
- QR-Ins-02 fields: customer, station, assembly number, job no, job qty, shift, time window, defect entries, yellow card, totals (inspected, defects, rates), corrective action, inspector, date, reviewer.
- QR-Pro-034 fields: job no, assy, rev, ship date, customer, qty, line no, downtime, impact, description, issuedBy/date, corrective action, confirmedBy/date.
- Available permissions: readiness (view/check/config), quality (FAI/OQC/disposition); no dedicated QC daily permission, so likely use READINESS_VIEW/CHECK for readiness items and QUALITY_OQC for QC/exception pages.

## Decisions
-

## Errors
- worktree-new created the worktree but no note was generated; created this note manually.
- `bun run db:migrate -- --name smt_basic_records` failed: `prisma: command not found`. Next: run `bun install` in worktree, then retry migrate.
- `bun install` failed with EEXIST clonefileat errors for `zod`, `@babel/parser`, `chokidar`. Next: try `bun install --force`.
- `bun install --force` succeeded; proceed to retry migration.

## Open Questions
-

## Findings (2026-01-20)
- Read dev + small-step-commits skills: keep worktree flow, commit per slice (schema/api/ui/align), update MES plan/align, run `bun scripts/smart-verify.ts` before merge.

## Findings (2026-01-20 cont.)
- `bun run db:migrate -- --name smt_basic_records` completed successfully; migration `20260120190709_smt_basic_records` applied.
- Prisma schema contains new SMT basic record models (Stencil/Squeegee/Inspection/Oven/QC/Exception).

## Findings (2026-01-20 cont. 2)
- Migration SQL creates 7 new SMT record tables + indexes; diff shows schema + bun.lock + worktree note changes.

## Findings (2026-01-20 cont. 3)
- Backend API pattern: service returns ServiceResult, routes handle audit and envelopes; required `recordAuditEvent` on success/fail; TypeBox schemas + error mapping.

## Findings (2026-01-20 cont. 4)
- `apps/server/src/modules/mes` has only `integration/solder-paste-service.ts` for solder; no existing bake-related module found.

## Findings (2026-01-20 cont. 5)
- Bake routes use list+create with Permission.READINESS_VIEW/READINESS_CHECK and audit on create; good template for SMT base records.

## Findings (2026-01-20 cont. 6)
- Bake module provides reference for schema + service: map record fields, parse dates, list filters, create validation, list pagination.

## Findings (2026-01-20 cont. 7)
- MES routes module uses `.use(<routes>)` per feature (bake, solder-paste, etc.). New SMT basic routes must be registered in `apps/server/src/modules/mes/routes.ts`.

## Findings (2026-01-20 cont. 8)
- Permission checks use `requirePermission` with `Permission` enum from db; routes enforce permissions per module (need to pick for SMT record endpoints).

## Findings (2026-01-20 cont. 9)
- OQC routes require `Permission.QUALITY_OQC`; solder-paste routes use `READINESS_VIEW` for list and `READINESS_CHECK` for create. Likely use same split for SMT basic records (QC/exception use QUALITY_OQC).

## Findings (2026-01-20 cont. 10)
- Bake records web page uses DataListLayout server mode with filters, query presets, create dialog; includes list + card views and permission-gated create button. Use as template for SMT basic record pages.

## Findings (2026-01-20 cont. 11)
- Web list page pattern requires DataListLayout (server mode), filters/presets, table+card views; references `data_list_pattern.md` + `list_sorting.md`.
- Web form dialog pattern requires Eden-inferred input types, Zod + TanStack Form, dialog owns form state; references `create_edit_dialog.md` + `form_building.md`.

## Findings (2026-01-20 cont. 12)
- Data list pattern: DataListLayout server mode with FilterToolbar + QueryPresetBar, sync pagination to URL, include card view, use dateRange filters with from/to keys.
- List sorting: default to most relevant time desc; set initialSorting in UI; backend should order by time desc with stable fallback.

## Findings (2026-01-20 cont. 13)
- Create/edit dialog: infer input types from Eden, Zod schema is source of truth, store ISO strings for dates, reset form on close/open.
- Form building: use TanStack Form + zodValidator, full-width inputs, required indicator in label, fixed error height; relationship fields use selector/combobox.

## Findings (2026-01-20 cont. 14)
- Hooks pattern: `useXList` uses Eden `client.api[route].get`, `unwrap`, queryKey; create mutation invalidates list and toasts success/failure.
- Solder paste hook shows query types and create input inferred from Eden; use as template for SMT record hooks.

## Findings (2026-01-20 cont. 15)
- Solder paste list page mirrors bake list: search/date-range filters, query presets, DataListLayout server pagination, permission-gated create dialog.

## Findings (2026-01-20 cont. 16)
- Field meta pattern uses DataListFieldMeta with card/table renderers; common formatting helpers for dates and badges.
- Dialog pattern uses TanStack Form + Zod; normalizes values to `undefined` for optional fields and uses DateTimePicker with ISO strings.

## Findings (2026-01-20 cont. 17)
- Phase4 plan Track F tasks: WP-4 (steel/squeegee life), WP-7 (equipment inspection), WP-8 (oven program), WP-10 (daily QC + production exception) are pending.
- SMT align file currently maps bake/solder/cold storage; needs new rows for stencil/squeegee/inspection/oven/QC/exception records once implemented.

## Findings (2026-01-20 cont. 18)
- Navigation config in `apps/web/src/config/navigation.ts` has "准备与防错" and "质量管理" sections; new SMT basic pages should be added there with proper permissions.

## Findings (2026-01-20 cont. 19)
- Permissions available: READINESS_VIEW/READINESS_CHECK and QUALITY_OQC/QUALITY_DISPOSITION/QUALITY_FAI. For SMT basic records, readiness-type should use READINESS_*; QC/exception should use QUALITY_OQC.

## Findings (2026-01-20 cont. 20)
- Solder paste service pattern: parseDate helper, list queries map lineCode -> lineId(s), orderBy time desc + createdAt desc; create validates timestamps and trims required fields.
- Schema pattern includes lineId/lineCode/lineName in response for line-linked records.

## Findings (2026-01-20 cont. 21)
- Enum schema pattern uses `t.Union([t.Literal(...)])` for inspection type/status in `inspection-result-schema.ts`.

## Errors (2026-01-20)
- `cat <<'EOF' > apps/server/src/modules/mes/smt-basic/schema.ts` failed with "no such file or directory" even though `mkdir -p` ran; verified `apps/server/src/modules/mes/smt-basic` exists and re-ran the write successfully.

## Findings (2026-01-20 cont. 22)
- DataListFieldMeta supports card/table renderers and optional formatting; bake field meta shows how to format dates and badges for list display.

## Progress (2026-01-21)
- Removed stray smt-basic import/usages from `apps/server/src/modules/mes/routes.ts` on main to avoid missing module error; worktree remains source for SMT basic feature.

## Findings (2026-01-21)
- Filter toolbar supports `type: "select"` with `options` (example in materials list), and custom render inputs for additional filters.
