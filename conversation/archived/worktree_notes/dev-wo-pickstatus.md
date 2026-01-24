# Work order pick-status rules (pending)

Findings
- Repo already dirty: apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx, apps/web/src/routes/_authenticated/mes/work-orders.tsx, packages/shared/src/error-codes.ts, worktree_notes/main.md.
- Current UI only allows creating run when pickStatus is 2/3/4; server createRun rejects otherwise.

Open questions
- Reminder for "not fully picked" at run creation: non-blocking warning vs allow create with warning vs show disabled action with tooltip?
- Status transition rule: only allow 1/2 -> 3/4 when WO is IN_PROGRESS; confirm for RELEASED/RECEIVED and ERP WOs.

Progress
- Checked run create dialog + work order action gating: create run action currently hidden unless pick status is 2/3/4.

Findings
- domain_docs/mes/plan/phase3_tasks.md not found; need correct plan path.
- impl_align files exist: domain_docs/mes/spec/impl_align/01_e2e_align.md, 03_smt_align.md, 04_dip_align.md.

Findings
- Using plan reference: domain_docs/mes/plan/tasks.md (Phase 3 plan; completed).

Progress
- Updated align doc: domain_docs/mes/spec/impl_align/01_e2e_align.md to note run-create warning for incomplete pick.

Errors
- Emoji scan failed (pre-existing emoji in domain_docs/mes; see rg output). Not modified.
