# Audit Logs & Domain Events

## Goal
- Record every **write** operation for business traceability.
- Provide a durable audit trail that operators/admins can query.
- Share a single **Domain Event** between audit logging and notifications.

## When to Use
- Any create/update/delete or state transition in business logic.
- MES workflows: work order reception/release, run creation/authorization,
  track in/out, quality disposition, rework, and config changes.

## Design Principles
- **Append-only**: Audit logs are never updated or deleted in-place.
- **Minimal storage, reconstructable**: store diffs only (no full snapshots).
- **Single event source**: the same event payload feeds both Audit Log + Notification.
- **Separation of concerns**: audit is for traceability, notifications are for UX.

## Domain Event Pipeline (Single Source of Truth)
1. Build a Domain Event object during a write operation:
   - actor, action, entity, before/after, diff, status, error
2. Inside the same DB transaction:
   - persist business change
   - insert audit log row (append-only)
3. After commit:
   - dispatch notifications using the same `event_id`

## Data Model (Audit Log)
Recommended minimal fields:
- `id`
- `event_id` (shared with notification)
- `actor_id`, `actor_name`, `actor_role`, `actor_type`
- `action` (e.g. `WORK_ORDER_RELEASE`, `RUN_AUTHORIZE`, `TRACK_OUT`)
- `entity_type`, `entity_id`, `entity_display`
- `status` (`SUCCESS`/`FAIL`)
- `error_code`, `error_message` (only on failure)
- `diff` (JSON)
- `request_id`, `ip`, `user_agent`
- `trace_id` (optional; link to OTel)
- `created_at`

## Diff Format (Decision)
**Use a JSON Patch–style diff with before/after values**.
- Minimal storage: only changed fields are stored.
- Reconstructable: you can rebuild the previous/next values for each field.

Example diff payload:
```json
[
  { "op": "replace", "path": "/status", "before": "RECEIVED", "after": "RELEASED" },
  { "op": "replace", "path": "/planned_qty", "before": 1000, "after": 1200 }
]
```

Notes:
- This is inspired by RFC 6902 (JSON Patch) but extends ops with `before/after`
  to support audit display and rollback.
- Only changed fields are recorded; no full entity snapshot by default.
- If full time-travel is ever needed, add periodic snapshots later.

## Archive Strategy (File-Based)
Selected: **file archive** (not table partitioning).

Plan:
- Periodic job exports old audit rows to JSONL (or Parquet) files.
- After export, delete archived rows from the DB.
- Keep an `audit_archives` index table with:
  `file_path`, `range_start`, `range_end`, `row_count`, `checksum`, `created_at`

## Access Rules (Policy Stub)
- Users can view **their own** audit logs.
- Privileged roles can view **others** (role-based policy).
- Admin can view **all**.
- Implementation is deferred until role/permission model is finalized.

## Related Docs
- `agent_docs/03_backend/notifications.md`
- `agent_docs/03_backend/api_patterns.md`
