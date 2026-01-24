# device data gateway poc

## Context
- SMT Gap Slice 2 (T3.2/T3.3) requires a device data collection gateway POC and auto data ingest path.
- Existing integration endpoints handle stencil/solder paste/inspection but no generic device data ingestion.

## Decisions
- Add `POST /api/integration/device-data` to ingest device data values and write `DataValue` with `TrackSource.AUTO`.
- Use `IntegrationMessage` dedupeKey (`device-data:{eventId}`) for idempotency and duplicate handling (POC).
- Keep scope to data ingestion only; defer full ingestMapping + auto TrackIn/Out.

## Plan
- Document gateway POC design and reference it from data collection specs.
- Implement schema/service/route for `/api/integration/device-data` with audit logging.
- Update SMT align, SMT gap plan, and API overview docs.

## Findings
- `TrackSource.AUTO` unused in existing code; new endpoint introduces auto ingest.
- Data collection specs already define AUTO method and can be validated for device ingestion.

## Progress
- Added device gateway POC doc and updated data collection specs + API overview.
- Implemented device data ingestion service/schema/route and SMT align + plan updates.

## Errors
- None.

## Open Questions
- Follow-up for full ingestMapping and AUTO/BATCH/TEST execution remains.

## References
- `domain_docs/mes/spec/data_collection/02_device_gateway_poc.md`
- `apps/server/src/modules/mes/integration/device-data-service.ts`
- `apps/server/src/modules/mes/integration/routes.ts`
