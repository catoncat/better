## Context
- Bug: Route detail page “编译路由” always shows success toast even when the created `ExecutableRouteVersion` is `INVALID`.
- Root cause: Frontend only checked API call success; compile endpoint returns a version record even when validation fails.

## Decisions
- Treat compile as “success” only when `status === "READY"`.
- For `status === "INVALID"`, show error toast and surface `errorsJson` summary.
- Add UX guidance in route detail: execution-semantics readiness indicator + warning banner, plus a quick bulk action to set station group for missing steps.

## Plan
1. Use compile response `status` and `errorsJson` for toast messaging.
2. Add precheck signal on route detail page for missing station constraints.
3. Provide a minimal bulk helper to create STEP-level execution configs for missing steps.
4. Run `bun run lint`, `bun run format`, `bun run check-types`.

## Open Questions
- Should “Compile” be blocked (instead of warned) when execution semantics are missing, to avoid generating noisy `INVALID` versions?
- Do we want a more complete precheck covering other validation errors (e.g. ingest mapping for AUTO/BATCH/TEST)?

## References
- `apps/web/src/hooks/use-route-versions.ts`
- `apps/web/src/routes/_authenticated/mes/routes/$routingCode.tsx`
- `apps/server/src/modules/mes/routing/service.ts`
