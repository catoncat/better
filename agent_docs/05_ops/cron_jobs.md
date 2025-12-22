# Cron Jobs

## Goal
- Provide the required pattern for scheduled tasks.

## When to Use
- Implementing any scheduled job.

## Required Rules
- Use `@elysiajs/cron`.
- Set `timezone: getTimezoneIana()` (from `APP_TIMEZONE`).
- Set `catch: true` so failures do not stop the schedule.
- Log start/finish/error to `SystemLog` for auditability.
- Register the plugin in `apps/server/src/index.ts` with `.use(myCronPlugin)`.

## Reference Implementation
- `apps/server/src/plugins/instrument-cron.ts`

## Minimal Template
```ts
import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { prisma } from "../plugins/prisma";
import { getTimezoneIana } from "../utils/datetime";

const db = prisma;

export const myCronPlugin = new Elysia({ name: "my-cron" }).use(
  cron({
    name: "my-task",
    pattern: "0 3 * * *",
    timezone: getTimezoneIana(),
    catch: true,
    run: async () => {
      // Log start, run task, log finish or error.
    },
  }),
);
```

## Common Patterns
- `0 2 * * *` daily at 02:00
- `0 0 * * 1` weekly Monday midnight
- `0 0 1 * *` monthly on the 1st
- `0 */6 * * *` every 6 hours
