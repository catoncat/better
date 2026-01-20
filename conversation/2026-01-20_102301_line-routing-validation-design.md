# line-routing-validation-design

## Context
- User expects one physical line to support multiple routing versions with minor variations.
- Validation failure must provide clear mismatch details and configuration guidance.

## Decisions
- Keep Line↔Routing compatibility capability-based (line supports multiple routings/versions).
- Validation failures should include: mismatch location (line/routing/step) + concrete config actions to fix.

## Plan
- If implemented: add `processType` to `Line` + `Routing` (or a capability table); seed values; release validation checks `processType` + station-group coverage; return structured guidance payload.

## Findings
- `Line` model currently has no process-type field; it only holds identity + relations (`stations`, `runs`, `feederSlots`, `lineStencils`, `lineSolderPastes`).
- `SlotMaterialMapping` can optionally point to `routingId`, so loading validation can already be routing-scoped.
- `Routing` also has no process-type field; steps link to `RoutingStep` with optional `stationGroupId`.
- `Station` links to both `Line` (`lineId`) and `StationGroup` (`groupId`), so line compatibility can be inferred by checking whether each routing step’s station group has stations on the target line.

## Progress
-

## Errors
- Attempted to read `/Users/envvar/.claude/skills/note/SKILL.md`; file not found. Next: read repo path `/Users/envvar/lzb/better/.claude/skills/note/SKILL.md`.

## Open Questions
- Use `processType` multi-capability (array/join table) vs single `processType` + "MIXED"?

## References
-
