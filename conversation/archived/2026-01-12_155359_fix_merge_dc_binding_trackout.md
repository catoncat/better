## Context

- User requested: fix the issues found in review (DataCollection binding + TrackOut correctness), commit changes, and merge into `main`.
- Worktrees involved:
  - Feature: `/Users/envvar/lzb/better-3.5.2` (`feat/3.5.2-dc-spec-web`)
  - Main: `/Users/envvar/lzb/better` (`main`)

## Decisions

- TrackOut requiredness semantics:
  - Only enforce required data specs when final result is **PASS**.
  - Only enforce specs that are **bound** to the current step **and active**.
  - If specs are bound but inactive, do not block production (ignored by UI and server validation).
- Binding robustness:
  - Compile validates that `dataSpecIds` exist and belong to the step operation to avoid cross-operation binding and spec-name ambiguity.
- JSON payload:
  - Web TrackOut dialog parses JSON and sends `valueJson` instead of (incorrect) `valueText`.

## Plan

1. Fix server TrackOut validation + compile guards
2. Fix web TrackOutDialog payload + UX alignment
3. Update navigation and spec clearing UX
4. Update `domain_docs/mes/plan/phase3_tasks.md`
5. Run `bun run format`, `bun run lint`, `bun run check-types`
6. Merge into `main`

## Open Questions

- Should `EXEC_DATA_COLLECT` be enforced anywhere (currently TrackOut is gated by `EXEC_TRACK_OUT`)?
- Should compile enforce “at least one spec bound” for certain operations/steps, or keep it optional?

## References

- Server:
  - `apps/server/src/modules/mes/execution/service.ts`
  - `apps/server/src/modules/mes/execution/routes.ts`
  - `apps/server/src/modules/mes/routing/service.ts`
- Web:
  - `apps/web/src/routes/_authenticated/mes/-components/track-out-dialog.tsx`
  - `apps/web/src/routes/_authenticated/mes/execution.tsx`
  - `apps/web/src/routes/_authenticated/mes/-components/data-spec-selector.tsx`
  - `apps/web/src/config/navigation.ts`
  - `apps/web/src/routes/_authenticated/mes/data-collection-specs/-components/spec-dialog.tsx`
- Docs:
  - `domain_docs/mes/plan/phase3_tasks.md`
