# permission audit plan

## Context
- User wants a permission-first UI design because roles are user-defined and cannot be hard-coded.
- Scope must align with the three process flows (E2E, SMT, DIP).

## Decisions
- Use permissions as the sole source of UI gating (view vs action), not role presets.
- Build a capability map from flows to permissions, then audit pages against it.
- Choose hide vs “no access” vs “configure permission” per module based on flow continuity and context.

## Plan
- Track 1: Capability map (flow-aligned)
  - Extract functional blocks from E2E/SMT/DIP flows (readiness, loading, FAI, OQC, MRB, run lifecycle, execution, trace, routing/config).
  - Map each block to required API endpoints + permission points (view/action).
  - Output: `user_docs/demo/permission_audit_plan.md` section "Capability Map".
- Track 2: UI gating patterns (decision matrix)
  - Classify each block: Core context / Actionable / Config & Ops / Sensitive data.
  - Apply gating decision matrix:
    - Core context + missing view → show “no access” placeholder (preserve flow continuity).
    - Actionable + missing action → hide or disable with reason (depends on whether user is expected actor in this flow step).
    - Config & Ops + missing config permission → hide by default; if flow blocked, show “needs config” CTA.
    - Sensitive data + missing view → hide.
  - Define query gating rule: do not fetch without view permission.
  - Define error handling rule: 401/403 show permission message and no retry.
  - Output: checklist + snippet patterns for `Can`, `useAbility`, query `enabled`.
- Track 3: Page audit checklist (flow-ordered)
  - Build page inventory from flows (work orders, runs, run detail, readiness config/exceptions, loading, execution, FAI, OQC, trace, routing, data-specs, integration/manual entry, materials/boms/work-centers).
  - For each page, map data blocks + action blocks → permissions and gating choice.
  - Record: API/permission map, UI gating status, missing/incorrect gating.
- Track 4: Implementation slices (after audit)
  - Slice by page group (work orders + runs, execution + loading, quality pages, config pages).
  - Add tests/QA checklist per slice.

## Findings
- Flow docs show a shared backbone: readiness -> loading -> FAI -> authorize -> execution -> OQC/MRB, plus DIP-specific IPQC-like steps.
- UI gating cannot be role-based; must be per-block and aligned to flow continuity.

## Progress
- Drafted `user_docs/demo/permission_audit_plan.md` with capability map template, decision matrix, and audit steps.
- Added module-level decision flow (flow continuity, optional module hide, config CTA rules) and output requirements.
- Filled capability map table with core flow steps and verified API/permission pairs.
- Added first page audit entry for `/mes/runs/:runNo` with module-level gating decisions and gaps.

## Errors
- None.

## Open Questions
- For blocks that are part of the visible flow but not actionable by this user, do we show “no access” or a brief “next step by X role” hint?
- Do we want a centralized permission-to-UI registry (single TS map) or per-page annotations?

## References
- `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- `domain_docs/mes/spec/process/03_smt_flows.md`
- `domain_docs/mes/spec/process/04_dip_flows.md`
- `user_docs/demo/permission_audit_plan.md`
