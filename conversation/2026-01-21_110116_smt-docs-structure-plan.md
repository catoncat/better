# Context
User requested a detailed, multi-document SMT configuration + flow guide under a new folder, with emphasis on data generation context and data management per step. Work in current tree (no worktree).

# Decisions
- Create a new folder `domain_docs/mes/smt_playbook/` with a structured document set, separate from existing specs/tests.
- Write docs in slices to avoid aPM single huge doc.

# Plan
- Slice 1: Create folder + README index.
- Slice 2: Scope/terms + data sources/ownership overview.
- Slice 3: Configuration docs (lines/slots, materials/lots, slot mappings, routes/products).
- Slice 4: Flow docs + demo data recipes + validation checklists.

# Findings
- SMT flow diagram includes "上料防错" steps (加载站位表 → 扫码验证 → 判断 → 确认上料 / 报警锁定重试).
- QR-Pro-121 and QR-Mac-022 forms define real-world station/material mapping and changeover record fields.

# Progress
- Created `domain_docs/mes/smt_playbook/README.md`.
- Added `00_scope_and_terms.md` and `01_data_sources_and_ownership.md`.
- Added configuration docs: `02_configuration/01_lines_and_slots.md`, `02_configuration/02_material_master_and_lots.md`, `02_configuration/03_slot_material_mapping.md`.

# Errors
- None.

# Open Questions
- None.

# References
- domain_docs/mes/spec/process/03_smt_flows.md
- domain_docs/mes/spec/process/compair/smt_flow_user.md
- domain_docs/mes/spec/process/compair/smt_forms/SMT物料上机对照表.md
- domain_docs/mes/spec/process/compair/smt_forms/SMT生产换料记录表 (QR-Mac-022).md
