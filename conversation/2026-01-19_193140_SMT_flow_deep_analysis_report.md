# Context
- Task: produce a deep SMT workflow comparison and gap analysis report using the provided plan.
- Output target: `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md`.
- Inputs: `smt_flow_user.md`, `smt_flow_checkpoint.md`, `smt_forms/*.md`, `03_smt_flows.md`, `impl_align/03_smt_align.md`.

# Decisions
- Follow the user-specified report structure (6 chapters + appendices).
- Use per-node field-level comparisons grounded in form samples and current system docs.

# Plan
- Read system SMT flow spec and implementation alignment.
- Extract customer forms and workflow constraints from compair docs and forms.
- Build chapter-by-chapter report with node-level comparisons, field mapping tables, and prioritized recommendations.

# Findings
- Pending.

# Progress
- Created conversation note for deep analysis report.

# Errors
- None.

# Open Questions
- Whether any additional internal data model references should be included beyond `03_smt_flows.md` and `impl_align/03_smt_align.md`.

# References
- `domain_docs/mes/spec/process/compair/smt_flow_user.md`
- `domain_docs/mes/spec/process/compair/smt_flow_checkpoint.md`
- `domain_docs/mes/spec/process/compair/smt_forms/`

# Findings (system spec)
- SMT flow spec defines WO RECEIVED/RELEASED, Run PREP/AUTHORIZED/IN_PROGRESS/COMPLETED/ON_HOLD/CLOSED_REWORK/SCRAPPED with readiness gate and FAI gate before authorization.
- Readiness checks are configurable by `Run.meta.readinessChecks.enabled` and include STENCIL, SOLDER_PASTE, EQUIPMENT, MATERIAL, ROUTE, LOADING.
- Implementation alignment lists existing APIs and UI routes for readiness, loading verification, FAI creation/recording, execution (track-in/out), defects, MRB, and OQC.

# Findings (data model docs)
- `domain_docs/mes/tech/db/01_prisma_schema.md` is high-level and only lists baseline entities (ReadinessCheck, Inspection, Authorization, DataCollectionSpec/DataValue) without field-level definitions for SMT-specific forms.
- Field-level comparisons will require referencing actual Prisma schema or module APIs rather than this doc.

# Findings (schema: readiness/loading/inspection)
- Schema includes loading verification models: FeederSlot, SlotMaterialMapping, RunSlotExpectation, LoadingRecord with status, verifyResult, failReason, loaded/unloaded timestamps and operator.
- LineStencil/LineSolderPaste capture line-level current bindings with bind/unbind times.
- StencilStatusRecord and SolderPasteStatusRecord support event-driven status updates with tension, cleaning, expiry, thaw/stir times via integration.
- ReadinessCheck/ReadinessCheckItem store PRECHECK/FORMAL status, itemType/itemKey, evidenceJson, and waive metadata.
- Inspection/InspectionItem model FAI or other inspections with sample qty, inspector, item name/spec, actual value, PASS/FAIL, defect code, timestamps.
- DataCollectionSpec/DataValue support generic data capture tied to operations/tracks.

# Findings (schema: material & inspection integration)
- MaterialLot/MaterialUse capture lot-level traceability and unit-level usage, but no explicit bake/paste lifecycle fields are modeled; extra attributes would need meta or dedicated models.
- Stencil/solder paste lifecycle is captured via LineStencil/LineSolderPaste bindings and event records (StencilStatusRecord/SolderPasteStatusRecord).
- InspectionResultRecord supports SPI/AOI integration with runNo/unitSn/stepNo, result status, defects/rawData payloads, and equipment/operator identifiers.

# Progress (update)
- Drafted deep analysis report at `domain_docs/mes/spec/process/compair/codex_smt_flow_deep_analysis.md` with chaptered structure, node-by-node analysis, and appendices.

# Findings (other analysis: smt_flow_deep_analysis.md)
- The other report mirrors the planned structure with coverage matrix (~60%), four-stage timeline, and per-node deep dives including suggested model extensions and priority labels.
- It asserts readiness gaps (baking, solder paste stirring, program version, squeegee) and defines explicit model sketches for baking, stencil usage/inspection, and squeegee usage.
- It treats QR-Pro-121 as fully supported and frames missing items mainly as optional fields (common material flag, unit-consumption check).
- It states X-ray inspection is missing despite existing InspectionResultRecord (integration vs daily/record context is not distinguished).

# Findings (other analysis: additional)
- The other report proposes new models/fields using names not present in schema (`Stencil`, `SolderPaste`, `Fai/FaiItem`, `LoadingLog`), whereas current schema uses `StencilStatusRecord`, `SolderPasteStatusRecord`, `Inspection/InspectionItem`, and `LoadingRecord`.
- It marks AOI daily check and X-ray records as fully missing; the schema has `InspectionResultRecord` (SPI/AOI integration) but lacks a daily checklist workflow, so the gap is more about process/UI than storage.
- It assigns coverage percentages and week-by-week roadmap with effort estimates; these are not backed by repo planning docs and should be treated as assumptions.

# Progress (update)
- Added Chapter 7 "具体实施方案（整合版）" to consolidate all materials into a concrete work-plan: preconditions, work packages, phased plan, acceptance criteria, risks, and missing inputs.
