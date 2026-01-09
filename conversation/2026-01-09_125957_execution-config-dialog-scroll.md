## Context
- Bug: ExecutionConfig dialog content overflows viewport; header/footer not fixed and body not scrollable, blocking form interaction.

## Decisions
- Keep dialog header and footer fixed (non-scrolling).
- Make dialog body scrollable with a max height, using flex layout + `overflow-y-auto`.

## Changes
- `ExecutionConfigDialog`: `DialogContent` uses `max-h-[85vh] flex flex-col`; form body is `flex-1 overflow-y-auto`; footer is separated with a top border.
- `BulkStationGroupDialog`: same scroll/fixed-footer treatment to avoid similar issues on small screens.

## References
- `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
