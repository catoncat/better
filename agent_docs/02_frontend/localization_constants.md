# Localization Constants

## Goal
- Keep UI labels consistent and centralized.

## When to Use
- Rendering enum labels or status text.

## Rule
- Do not hardcode enum maps in components.
- Use `apps/web/src/lib/constants.ts` instead.

## Example
```ts
import { USER_ROLE_MAP } from "@/lib/constants";

function UserRoleBadge({ role }: { role: string }) {
  return <Badge>{USER_ROLE_MAP[role] ?? role}</Badge>;
}
```

## Available Maps
- `USER_ROLE_MAP`
- `NOTIFICATION_STATUS_MAP`
- `NOTIFICATION_PRIORITY_MAP`
