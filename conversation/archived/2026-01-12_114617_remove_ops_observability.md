# remove_ops_observability

## Context
- User no longer needs `ops/observability` and asked to remove all related code/docs/config.
- Repo had Jaeger docker assets + docs, and server runtime OpenTelemetry integration.

## Decisions
- Remove Jaeger/observability ops stack and docs entirely.
- Remove OpenTelemetry integration from `apps/server` (plugin wiring, env vars, dependencies) and strip span instrumentation from MES services.

## Plan
- Delete `ops/observability/**` and observability docs; remove any repo references.
- Remove OpenTelemetry from server startup + `.env.example` + deps; update lockfile.
- Remove tracing spans from MES services; keep business logic intact.
- Run `bun run format`, `bun run lint`, `bun run check-types`.

## Open Questions
- None.

## References
- `AGENTS.md`
- `agent_docs/05_ops/observability_jaeger.md` (removed)
- `apps/server/src/index.ts`
- `apps/server/src/modules/mes/**`
