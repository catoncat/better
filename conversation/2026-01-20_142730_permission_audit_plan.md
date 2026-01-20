# permission audit plan

## Context
- User wants a permission-first UI design because roles are user-defined and cannot be hard-coded.
- Scope must align with the three process flows (E2E, SMT, DIP).

## Decisions
- Use permissions as the sole source of UI gating (view vs action), not role presets.
- Build a capability map from flows to permissions, then audit pages against it.

## Plan
- Track 1: Capability map (flow-aligned)
  - Extract functional blocks from E2E/SMT/DIP flows (readiness, loading, FAI, OQC, MRB, run lifecycle, execution, trace, routing/config).
  - Map each block to required API endpoints + permission points (view/action).
  - Output: `user_docs/demo/permission_audit_plan.md` section "Capability Map".
- Track 2: UI gating patterns (implementation guide)
  - Define view vs action gating rules (when to hide vs show disabled + reason).
  - Define query gating rule: do not fetch data without view permission.
  - Define error handling rule: 401/403 surface permission message and no retry.
  - Output: checklist + snippet patterns for `Can`, `useAbility`, query `enabled`.
- Track 3: Page audit checklist (flow-ordered)
  - Build a page inventory from flows: work orders, runs list, run detail, readiness config/exceptions, loading, execution, FAI, OQC, trace, routing, data-specs, integration/manual entry.
  - For each page, map data blocks and action blocks to permissions.
  - Record: API/permission map, UI gating status, missing/incorrect gating.
- Track 4: Implementation slices (after audit)
  - Slice by page group (work orders + runs, execution + loading, quality pages, config pages).
  - Add tests/QA checklist per slice.

## Findings
- Flow docs show a shared backbone: readiness -> loading -> FAI -> authorize -> execution -> OQC/MRB, plus DIP-specific IPQC-like steps.

## Progress
- None yet for the new plan; previous fixes are already in the worktree.

## Errors
- None.

## Open Questions
- Preferred behavior when user lacks view permission: hide section entirely vs show “no access” placeholder?
- Do we want a centralized permission-to-UI registry (single TS map) or per-page annotations?

## References
- `domain_docs/mes/spec/process/01_end_to_end_flows.md`
- `domain_docs/mes/spec/process/03_smt_flows.md`
- `domain_docs/mes/spec/process/04_dip_flows.md`
