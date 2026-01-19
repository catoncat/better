---
type: worktree_note
createdAt: "2026-01-19T22:08:00.000Z"
branch: "main"
baseRef: "origin/main"
task:
  title: "SMT non-conflict implementation follow-up"
  planPath: "domain_docs/mes/plan/phase4_tasks.md"
  planItem: "Track F SMT deep analysis plan"
  triageNote: "User wants to proceed on main; focus on SMT non-conflict plan"
---

# main - SMT non-conflict implementation

## Scope
- Implement the SMT deep analysis non-conflict plan on main branch.
- Prefer record enhancements and data capture; avoid state machine changes unless explicitly required.

## Slices
- [ ] Slice 1: confirm plan scope + map required modules.
- [ ] Slice 2: schema/migration + server API.
- [ ] Slice 3: web UI + hooks.
- [ ] Slice 4: docs/align updates + verification.

## Decisions
- Proceed on main branch (no worktree).

## Findings
- Worktree already has a separate MES execution note; keep this SMT effort in its own note.
- Working tree is clean except for an unrelated untracked conversation note; do not touch it.
- Phase4 Track F defines SMT work packages WP-1..WP-10 with DoD; includes precheck 4.6.1 for field alignment/time-window rules.
- `codex_smt_flow_deep_analysis.md` highlights gaps in time-window control, solder paste lifecycle, stencil/squeegee lifespan, bake records, temperature program records, changeover records, and daily QC/exception reporting.
- Loading schemas/services do not yet expose new fields (`packageQty`, `reviewedBy`, `reviewedAt`) or slot mapping fields (`unitConsumption`, `isCommonMaterial`); API and UI updates are needed for WP-9.
- MES loading UI lives under `apps/web/src/routes/_authenticated/mes/loading/`.
- Loading page uses `ScanPanel` and `SlotList`; new changeover fields likely belong to ScanPanel or related dialogs.
- ScanPanel only captures slot code/barcode/replace reason; no UI for package quantity or reviewer fields.
- Slot mapping dialog only supports materialCode/productCode/routing/priority/isAlternate; missing unit consumption + common-material flags.
- Loading hooks/types do not include `packageQty/reviewedBy/reviewedAt`; slot mapping hooks lack `unitConsumption/isCommonMaterial` inputs.
- Loading service `verifyLoading`/`replaceLoading` create `LoadingRecord` without package qty or reviewer info; schema/response mapping missing those fields too.
- Loading routes derive `operatorId` from body/user; no pass-through for package qty or reviewer fields.
- Slot material mapping create/update handlers do not accept `unitConsumption` or `isCommonMaterial`, and mapSlotMapping omits them.
- SMT align doc currently lists loading verify/replace under “报警/锁定/重试”; no explicit “换料记录增强” row yet.
- Loading records hook exists but no UI renders loading history; WP-9 “换料历史可查询” needs a new table/card.
- Slot mapping table lacks columns for unit consumption/common material; will need to expand columns and colSpan counts.
- `formatDateTime` helper available in `apps/web/src/lib/utils.ts` for loading history timestamps.
- Emoji scan (`rg -nP "\\p{Extended_Pictographic}" domain_docs/mes`) matches existing test/compair docs; no changes made to those files.

## Progress
- Added loading record fields and slot mapping fields in server schema/service and web hooks.
- Added ScanPanel inputs for package quantity + reviewer, and new loading history table.
- Expanded slot mapping UI to capture/display unit consumption and common-material flag.
- Updated SMT align doc and marked WP-9 complete in phase4 plan.
- `bun scripts/smart-verify.ts` now passes (lint + typecheck + prisma generate).

## Errors
- `bun scripts/smart-verify.ts` failed due to Biome formatting issues in loading UI components (indentation in `mapping-dialog.tsx`, line wrap in `scan-panel.tsx`, type wrap in `loading-history.tsx`); applied manual formatting fixes before re-running.
- Second `bun scripts/smart-verify.ts` failed with TS2322 in `mapping-dialog.tsx` because Zod schema optional field did not match form value type; updated schema to require `unitConsumption` with `z.union([z.number().min(0), z.undefined()])`.

## Open Questions
-

## References
- `domain_docs/mes/plan/phase4_tasks.md`
- `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`
