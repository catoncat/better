# workflow_control_plane_mvp

## Context
- User wants a governance-friendly “hybrid orchestration” model: explicit control plane (order/parallel/retry/human gates) + multiple runtime nodes (scripts/tools/LLM/human).
- Repo already relies on skills for workflow guidance; `.claude/*` is gitignored except `.claude/skills/**`, so workflow specs must live outside `.claude/` to be team-shared.

## Decisions
- Add a committed control-plane directory `agent_workflows/` with JSON workflow specs.
- Implement a deterministic Bun workflow runner `scripts/workflow-run.ts` that writes step-level artifacts under `.spec-workflow/` (gitignored).
- Pilot with MES “what next” as a deterministic workflow `agent_workflows/mes-triage.json` (plan extraction + worktree scan + saved conversation note).

## Plan
- Keep expanding in small slices:
  - Add `agent_workflows/pre-merge.json` for `bun run lint` / `bun run check-types` and optional `bun run format` with human gate.
  - Add a `workflow:check` script to validate workflow specs and enforce stable step IDs.
  - Add a “skill node contract” linter for `.claude/skills/**/SKILL.md` (inputs/outputs/side effects/retry/human gates/smoke tests).

## Open Questions
- Do we want workflows to support data passing between steps beyond file-based artifacts (env pointers to output files are current pattern)?
- Should we add “human approval groups” (approve once for multiple steps) for convenience?
- Should MES triage script include a strict “no code/doc changes” check beyond capturing `git status`?

## References
- `agent_workflows/README.md`
- `agent_workflows/mes-triage.json`
- `scripts/workflow-run.ts`
- `scripts/mes-triage-render.ts`
- `scripts/mes-triage-note.ts`
- `domain_docs/mes/CONTEXT.md`
