# Date and Time Handling

## Goal
- Prevent timezone bugs across web and server.

## When to Use
- Any feature involving dates, times, or schedules.

## Rules
- Frontend always sends full ISO strings with timezone: `date.toISOString()`.
- Backend parses incoming ISO and stores timestamps in UTC.
- Do not parse `"yyyy-MM-dd"` with `new Date(...)`.
- If a date-only value is received, interpret it explicitly in the target timezone before calculations.

## Timezone Configuration
- Set `APP_TIMEZONE` to an IANA name (example: `Asia/Shanghai`).
- Offset is derived from this value; do not hardcode offsets.

## Day-Based Logic
- Use helpers from `utils/datetime.ts`:
  - `getTimezoneIana()`
  - `getTimezoneOffsetMinutes()`

## Related Docs
- `agent_docs/05_ops/cron_jobs.md`
