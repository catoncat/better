# doc review loading fixes

## Context
- Round1 Loading doc review found documentation deviations; user chose to fix all (user docs + playbook docs).

## Decisions
- Update user material guide for load-table failures, verify exceptions, and replace flow.
- Align playbook unlock input with API behavior.
- Clarify slot mapping `slotId` meaning.
- Mark deviations as fixed in round1 review record.

## Plan
- Edit user_docs/05_material.md (exceptions + replace flow + barcode format).
- Edit smt_playbook loading flow unlock section.
- Edit slot material mapping doc to distinguish slotId vs slotCode.
- Update round1_loading review notes to show fixes.

## Findings
- user_docs/05_material.md lacked load-table failure and verify exception handling; replace steps mismatched UI.
- 03_loading_flow.md required operatorId for unlock; API only requires reason.
- 03_slot_material_mapping.md used slotId examples as slot codes.

## Progress
- Docs updated and review record marked as fixed.

## Errors
- None.

## Open Questions
- None.

## References
- user_docs/05_material.md
- domain_docs/mes/smt_playbook/03_run_flow/03_loading_flow.md
- domain_docs/mes/smt_playbook/02_configuration/03_slot_material_mapping.md
- domain_docs/mes/doc_review/round1_loading.md
