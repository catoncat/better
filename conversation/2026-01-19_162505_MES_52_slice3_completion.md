# MES 5.2 slice3 completion

## Context
- User asked to continue and complete the next set of issues in `domain_docs/mes/plan/tasks.md` (slice 3).
- Scope: execution UX polish and FAI messaging (5.2.6/5.2.7/5.2.8/5.2.13), plus 5.2.19 when working in execution page.

## Decisions
- Fold 5.2.19 (TrackIn/TrackOut current step hint) into slice 3 since it shares the same execution surface.

## Plan
- Replace manual run/WO inputs with searchable comboboxes in execution page.
- Add FAI trial rules note in FAI page and execution page.
- Prevent queue table actions from being pushed off-screen by truncating SN cells.
- Surface current-step hints in TrackIn/TrackOut forms.

## Findings
- Combobox component available at `apps/web/src/components/ui/combobox.tsx`.
- Execution page already has queue and queued-unit data with step metadata to power hints.

## Progress
- Implemented combobox-based run/WO selection in execution page.
- Added FAI rules callouts in execution and FAI pages.
- Added TrackIn/TrackOut current-step hints; truncated SN cells to avoid horizontal scroll.

## Errors
- None.

## Open Questions
- None.

## References
- `apps/web/src/routes/_authenticated/mes/execution.tsx`
- `apps/web/src/routes/_authenticated/mes/fai.tsx`
- `domain_docs/mes/plan/tasks.md`
