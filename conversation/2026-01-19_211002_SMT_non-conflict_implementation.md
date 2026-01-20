# Context
- Task: implement all SMT items confirmed as non-conflicting, starting with record-enhancement features that do not change the core state machine.
- Constraints: stay within MES doc contract; update plan tracking in `domain_docs/mes/plan/phase4_tasks.md` Track F.

# Decisions
- Proceed on main branch as requested; ignore unrelated local changes.
- Use small-step commits per slice (schema/migration, server, web, docs/plan updates).

# Plan
- Inspect current loading/FAI/defect/execution UI and API to locate insertion points.
- Implement loading/slot mapping enhancements (unit consumption/common material, packaging qty, reviewer).
- Implement record enhancements for production data, product in/out, and exception/repair capture where feasible using existing models.
- Update plan checkboxes in `domain_docs/mes/plan/phase4_tasks.md` as slices complete.

# Findings
- Dev skill and Prisma change skill loaded; Prisma changes require reading `agent_docs/04_data/prisma.md` before edits.

# Progress
- Conversation note created.

# Errors
- None.

# Open Questions
- Scope for “all non-conflict items” still needs mapping to concrete features in current UI/API.

# References
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`

# Findings (loading module)
- Loading API schemas and service mapping currently expose LoadingRecord fields without packageQty/reviewer; SlotMaterialMapping has only materialCode/priority/isAlternate.
- Loading verify/replace bodies include runNo/slotCode/materialLotBarcode/operatorId/reason, so new fields will require schema+service+UI updates.

# Findings (loading UI)
- Scan panel only captures slotCode/material barcode and replace reason; no packaging qty or reviewer fields.
- Slot mapping dialog supports slot/material/product/routing/priority/isAlternate; no unit-consumption/common-material fields.

# Findings (loading hooks)
- use-loading hooks and LoadingRecord type do not expose packageQty or reviewer fields; replace/verify payloads match server schema.
- Slot mapping hooks only support materialCode/productCode/routingId/priority/isAlternate; adding unit consumption/common material requires API changes.

# Findings (prisma doc)
- Schema changes require updating `packages/db/prisma/schema/schema.prisma` and running `bun run db:migrate` for migrations.

# Findings (slot mapping service)
- Slot material mapping create/update only persists materialCode/productCode/routingId/priority/isAlternate; schema and mapping detail will need extension for unit-consumption/common-material fields.

# Errors
- `bun run db:migrate -- --name loading_mapping_fields` failed due to Prisma drift against `data/db.db`; migrate dev requested reset and exited code 130.

# Next Approach
- Re-run migration with a clean temporary DATABASE_URL (new sqlite file) to generate migration without touching existing data.

# Errors (continued)
- `bunx prisma migrate diff --from-migrations ... --to-schema-datamodel ...` failed because `--to-schema-datamodel` was removed; need to use `--to-schema`.

# Next Approach
- Re-run migrate diff with `--to-schema packages/db/prisma/schema/schema.prisma` and capture SQL for a manual migration.

# Errors (continued)
- `bunx prisma migrate diff --from-migrations ... --to-schema ... --script` failed with "Error in Schema engine" (no detail output).

# Next Approach
- Need guidance on migration strategy in non-interactive environment (manual SQL migration vs allowing migrate dev reset or a repo-specific script).
