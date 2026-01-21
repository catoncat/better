# Context
- User reports Vite OXC parse error in `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx` at line ~1043.
- Repo currently has uncommitted changes in that file and `apps/server/src/modules/mes/fai/service.ts`.

# Decisions
- Proceed in current worktree per user request.

# Plan
- Inspect the failing JSX block and fix the syntax causing the OXC parse error.
- Re-run relevant checks after fix (per repo workflow).

# Findings
- `git status -sb` shows `main...origin/main [ahead 1]` with dirty files: `apps/server/src/modules/mes/fai/service.ts`, `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`.
- Error points at JSX in FAI section near `<Button ... onClick={() => {`.
- In `$runNo.tsx` readiness actions block, there is an extra `)}` after the FAILED actions `<div>`, and the JSX indentation suggests a malformed block before the FAI card.
- `bun scripts/smart-verify.ts` fails in web typecheck: missing `ExternalLink` import and invalid `Link to="/md/*"` paths (not in route union).
- Route files exist for `/mes/routes`, `/mes/materials`, `/mes/work-centers`, `/mes/solder-paste-usage`, and `/mes/integration/manual-entry`; there is no `/routes/_authenticated/md` directory.
- Reviewed `domain_docs/mes/plan/phase4_tasks.md`; readiness config is an optional Track D item but this fix is a UI syntax repair only.
- `apps/web/src/routeTree.gen.ts` includes `/mes/routes`, `/mes/materials`, `/mes/work-centers`, `/mes/solder-paste-usage`, `/mes/integration/manual-entry`, `/mes/loading`, `/mes/loading/slot-config`. No `/md/*` routes are registered.
- `apps/web/src/config/navigation.ts` lists the active MES navigation paths; relevant items are `/mes/routes` (路由管理), `/mes/materials` (物料主数据), `/mes/work-centers` (工作中心), `/mes/solder-paste-usage` (锡膏使用记录), `/mes/integration/manual-entry` (耗材状态录入). There is no `/md/*` entry.
- Readiness checks: `checkEquipment` validates TPM equipment and maintenance tasks by station code; `checkStencil`/`checkSolderPaste` validate line bindings + status records (stencil READY, solder paste COMPLIANT). These align with the “耗材状态录入” manual-entry page for binding/status updates.
- `apps/web/src/routes/_authenticated/system/integrations.tsx` exposes manual integration sync (includes TPM equipment/status/maintenance tasks). There is no dedicated equipment management page in MES routes.
- `$runNo.tsx` readiness action buttons currently link to `/md/routings`, `/md/materials`, `/md/stations`, `/md/stencils`, `/md/solder-pastes`, which are not registered routes.

# Progress
- Created conversation note.
- Repaired readiness actions JSX block in `$runNo.tsx` by removing the extra `)}` and re-indenting the actions list.
- Updated readiness action links in `$runNo.tsx` to registered routes: `/mes/routes`, `/mes/materials`, `/mes/integration/status`, `/mes/integration/manual-entry`.
- Reordered lucide-react imports in `$runNo.tsx` to satisfy Biome.

# Errors
- `bun scripts/smart-verify.ts` failed: `web check-types` errors in `$runNo.tsx` for missing `ExternalLink` and invalid `/md/*` routes.
- `bun scripts/smart-verify.ts` failed: Biome import order error in `$runNo.tsx` (organize imports).
- `bun scripts/smart-verify.ts` failed: server/web typecheck errors in `apps/server/src/modules/mes/line/service.ts` and `apps/web/src/routes/_authenticated/mes/lines/*` (unrelated to `$runNo.tsx` changes).

# Open Questions
- None.

# References
- `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`
