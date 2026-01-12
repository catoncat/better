## Context

- Demo feedback: `user_docs/demo/guide.md` doesn’t walk through the SMT/DIP flows defined in:
  - `domain_docs/mes/spec/process/01_end_to_end_flows.md`
  - `domain_docs/mes/spec/process/03_smt_flows.md` (SMT)
  - `domain_docs/mes/spec/process/04_dip_flows.md` (DIP)
- Request: assess what interactions are still missing to complete an end-to-end SMT flow in the current implementation (assume ERP already provides operations matching the SMT flow).

## Findings (SMT flow → current UI)

- WO receive/release/run create: implemented (`/mes/work-orders`)
- Run readiness checks (precheck/formal + waive): implemented (`/mes/runs/$runNo`, `/mes/readiness-exceptions`)
- Loading verify (load table + scan verify + replace): implemented (`/mes/loading?runNo=...`)
- FAI create/start/record/complete gate: implemented (`/mes/runs/$runNo` + `/mes/fai`)
- Run authorize/revoke: implemented but currently on Run list (`/mes/runs`) not Run detail
- Execution track-in/out + route advance + auto defect on FAIL: implemented (`/mes/execution`)
- Defect disposition (REWORK/SCRAP/HOLD + release hold) + rework tasks: implemented (`/mes/defects`, `/mes/rework-tasks`)
- Run closeout (triggers OQC): implemented (`/mes/runs/$runNo` “收尾”)
- OQC + MRB decision: implemented (`/mes/oqc`, MRB dialog on Run detail)
- WO closeout: implemented (`/mes/work-orders`)

## Gaps / Risks vs spec

- FAI “trial production before authorization” (流程节点：`首件生产(试产)`):
  - Server `track-in/out` currently requires `Run=AUTHORIZED|IN_PROGRESS`, so it’s not possible to execute physical trial production while `Run=PREP` (the spec orders FAI trial production before Run authorization).
  - Current implementation supports FAI as inspection records without enforcing trial production.
- Demo guide gaps:
  - Missing explicit walkthrough for readiness checks (“产前检查”), loading verify, readiness exceptions, defect disposition/rework tasks, closeout steps, and the actual UI location for Run authorization.
  - Optional but helpful: manual entry/binding for stencil/solder paste status (`/mes/integration/manual-entry`) when no live integration.

## Plan (proposed next actions)

1. Update `user_docs/demo/guide.md` to add a complete SMT walk-through aligned to `03_smt_flows.md` (use existing pages/routes).
2. Decide how to align FAI trial production with spec:
   - Option A: implement a dedicated “FAI trial mode” execution path that allows limited track-in/out during `Run=PREP` tied to an active FAI.
   - Option B: revise the spec/flow to reflect “FAI record-only” (not recommended if the spec remains the source of truth).

## Open Questions

- For SMT demo acceptance: is “FAI 试产” required to be physically executed (track-in/out) before authorization, or is “FAI record-only” acceptable for now?
- Should Run authorization be moved/duplicated to Run detail for smoother operator flow, or keep it in the Run list and update docs only?

## References

- `user_docs/demo/guide.md`
- `domain_docs/mes/spec/process/03_smt_flows.md`
- `domain_docs/mes/spec/impl_align/03_smt_align.md`
- Key UI: `apps/web/src/routes/_authenticated/mes/runs/$runNo.tsx`, `apps/web/src/routes/_authenticated/mes/runs/index.tsx`, `apps/web/src/routes/_authenticated/mes/loading/index.tsx`, `apps/web/src/routes/_authenticated/mes/execution.tsx`
- Key server gates: `apps/server/src/modules/mes/run/service.ts`, `apps/server/src/modules/mes/execution/service.ts`, `apps/server/src/modules/mes/fai/service.ts`

