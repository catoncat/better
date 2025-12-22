# Notifications

## Goal
- Document notification storage, dispatch, and WeCom integration.

## When to Use
- Adding notification triggers or UI behaviors.

## Database Model
- `Notification` stores in-app notifications with optional metadata in `data`.
- WeCom config is stored in `SystemConfig` under key `wecom_notifications`.

## Notification Data Shape
```ts
{
  entityType?: string;
  entityId?: string;
  action?: string;
  link?: { url: string; label?: string };
}
```

## Dispatch
- Use `dispatchNotification(db, params)` in transactional route logic.

```ts
import { dispatchNotification } from "apps/server/src/modules/notifications/service";

await dispatchNotification(db, {
  recipients: [userId],
  type: "system",
  title: "Instrument due soon",
  message: "Instrument INS-001 is due on 2025-03-01.",
  priority: "normal",
  data: { entityType: "instrument", entityId: instrumentId, action: "view" },
});
```

## API Endpoints
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/read-all`
- `PATCH /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

## WeCom Endpoints
- `GET /api/system/wecom-config`
- `POST /api/system/wecom-config`
- `POST /api/system/wecom-test`
