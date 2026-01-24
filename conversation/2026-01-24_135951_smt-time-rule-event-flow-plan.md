# smt-time-rule-event-flow-plan

## Context
- User chose plan A: database-backed event flow for Time Rule (no external MQ).

## Decisions
- Poll interval: 30s.
- Event granularity: use coarse event types (TRACK_IN/OUT, SOLDER_PASTE_USAGE_CREATE) with payload context.
- Event retention: 30 days.
- Retry policy: max 10 attempts with exponential backoff.

## Plan
- Define event table schema and statuses.
- Add event emitters at key business actions (track-in/out, solder paste usage, etc.).
- Add event processor to consume events and create/complete time-rule instances.
- Add idempotency + retry + error logging.
- Add config knobs (poll interval, retention).
- Slice the implementation into DB, server emitters, event processor, and cleanup.

## Findings
- Current Time Rule instances are created/completed directly in business services; events are not yet used.

## Progress
- Docs updated to reflect event flow assumptions and new Phase 2.1 tasks.

## Errors
- None.

## Open Questions
- Confirm whether `@elysiajs/cron` supports 30s schedules; if not, use minute cron + internal throttling or setInterval.

## References
- Time Rule definition/instance logic.
