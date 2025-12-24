# JSON Field Type Safety

## Goal
- Preserve type safety for Prisma JSON fields in the frontend.

## When to Use
- Any API response includes JSON fields.

## Problem
Prisma JSON fields are typed as `JsonValue`, which loses structure and autocomplete.

## Solution
Attach explicit response schemas so Eden Treaty can infer correct types.

## Source of Truth
- `apps/server/src/schemas/json-schemas.ts`

## Example
```ts
import { t } from "elysia";
import { notificationDataSchema } from "../../schemas/json-schemas";

const notificationSchema = t.Object({
  id: t.String(),
  title: t.String(),
  message: t.String(),
  data: t.Nullable(notificationDataSchema),
  createdAt: t.String(),
});

.get("/", async ({ db }) => {
  const items = await db.notification.findMany();
  return items;
}, {
  response: t.Array(notificationSchema),
});
```

## JSON Fields That Require Schemas
- `Notification.data`
- `SystemConfig.value`
- `SystemLog.details`
- `CalibrationRecord.attachments`
- `AuditEvent.diff`
