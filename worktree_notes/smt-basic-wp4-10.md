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

## Open Questions
-
