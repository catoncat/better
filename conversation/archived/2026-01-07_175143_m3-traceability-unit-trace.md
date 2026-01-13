Context
- M3 traceability work in worktree `m3-trace` focuses on unit trace API contract alignment.
- Trace contract requires data values and routing/version fields in trace output.

Decisions
- Add derived `dataValues.value` to unit trace response while keeping typed fields.

Plan
- Implement response/schema change for unit trace.
- Run lint/typecheck in the worktree.
- Record plan progress in milestones.

Open Questions
- None.

References
- /Users/envvar/lzb/better-m3-trace/apps/server/src/modules/mes/trace/service.ts
- /Users/envvar/lzb/better-m3-trace/apps/server/src/modules/mes/trace/schema.ts
- /Users/envvar/lzb/better-m3-trace/domain_docs/mes/plan/01_milestones.md
