# Server dev reload investigation

## Findings
- `packages/db/prisma/generated/prismabox/barrel.ts` exists on disk even when Bun reports module missing.
- Removed Prismabox re-export from `packages/db/src/index.ts` to prevent Bun startup failure on missing `barrel` import; repo imports Prismabox directly from `@better-app/db/prismabox`.
