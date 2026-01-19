# MES loading + FAI fixes (tasks 5.1/5.2)

## Context
- User requested completing remaining issues in `domain_docs/mes/plan/tasks.md` for loading + FAI.
- Work done in worktree `fix/mes-loading-ux`.

## Decisions
- Loading verify idempotent re-scan returns `isIdempotent` and skips audit event to avoid duplicate logs.
- FAI create/start enforce unit availability server-side; start flow prompts to generate units when missing.

## Plan
- Finish loading remaining items: lock visibility, barcode hint, idempotent UI message, audit behavior.
- Finish FAI remaining items: run filter combobox, unit checks, start prompt.
- Update tasks plan + run verification.

## Findings
- Loading expectations now include slot `isLocked` and verify response can include `isIdempotent`.
- FAI list includes run relation, enabling UI to generate units and retry start.
- `bun scripts/smart-verify.ts` clean after format/type fixes.

## Progress
- Implemented loading API/UI updates and FAI server/UI guards.
- Updated `domain_docs/mes/plan/tasks.md` status to [x] for 5.1.2/5.1.4/5.1.5/5.1.6 and 5.2.1/5.2.3/5.2.4.

## Errors
- `bun scripts/smart-verify.ts` failed due to formatting and type mismatch; fixed and re-ran successfully.
- Conversation note overwrite required `>|` due to `noclobber`.

## Open Questions
- None.

## References
- `apps/server/src/modules/mes/loading/service.ts`
- `apps/server/src/modules/mes/loading/routes.ts`
- `apps/server/src/modules/mes/fai/service.ts`
- `apps/web/src/routes/_authenticated/mes/loading/-components/slot-list.tsx`
- `apps/web/src/routes/_authenticated/mes/loading/-components/scan-panel.tsx`
- `apps/web/src/routes/_authenticated/mes/fai.tsx`
- `apps/web/src/hooks/use-loading.ts`
- `apps/web/src/hooks/use-fai.ts`
- `domain_docs/mes/plan/tasks.md`
- `bun scripts/smart-verify.ts`
