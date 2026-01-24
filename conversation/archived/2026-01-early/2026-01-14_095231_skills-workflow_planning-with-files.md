# skills-workflow_planning-with-files

## Context
- Goal: Use the external `planning-with-files` Claude skill as a reference to improve this repo’s Skills workflow (planning/progress/error persistence).
- Constraint: Keep MES “plan is source of truth” contract intact (`domain_docs/mes/plan/*`).

## Decisions
- Adopt “files as memory” explicitly in `AGENTS.md` for any multi-step / long tool-call tasks.
- Treat existing repo artifacts as the local equivalent of Manus’ 3-file pattern:
  - `worktree_notes/<branchSlug>.md` → branch-scoped plan + progress + errors
  - `conversation/*.md` → cross-cutting decisions + findings + progress
  - `.spec-workflow/` → deterministic workflow run artifacts (gitignored)
- Align conversation note creation to `bun scripts/conversation-new.ts` (avoid ad-hoc timestamping).
- Extend conversation note template to include `Findings/Progress/Errors` sections so research and failures don’t live only in chat context.

## Plan
- Update `AGENTS.md` to codify: files-as-memory, 2-action rule, read-before-decide, and “never repeat failures” (3-strike escalation).
- Update relevant SKILL.md files so “persist to disk” is part of the default workflow.
- Update `scripts/conversation-new.ts` template to match the new note structure.
- Run `bun scripts/smart-verify.ts`.

## Findings
- External skill emphasizes:
  - 3-file pattern (`task_plan.md`, `findings.md`, `progress.md`)
  - “2-action rule” (write findings after ~2 read/view operations)
  - “Read before decide” to prevent goal drift
  - Error persistence + “never repeat failures” via a 3-strike protocol
- This repo already had most primitives (worktree notes, conversation notes, deterministic workflows), but lacked a single, explicit “context engineering” rule set and had a minor inconsistency in how conversation notes should be created.

## Progress
- Updated `AGENTS.md` (workflow rules + conversation note creation).
- Updated `.claude/skills/dev/SKILL.md` (persistent planning guidance).
- Updated `.claude/skills/task-split/SKILL.md` (persist slice plan to disk).
- Updated `.claude/skills/note/SKILL.md` (note sections aligned with template).
- Updated `scripts/conversation-new.ts` (adds Findings/Progress/Errors sections).
- Verified: `bun scripts/smart-verify.ts` (biome + types) passed.

## Errors
- None.

## Open Questions
- Should we add a dedicated `.claude/skills/planning-with-files/` (repo-local variant) that can be explicitly invoked to bootstrap a task workspace (separate files vs. a single `conversation/*.md`)?
- Should we add a deterministic workflow spec under `agent_workflows/` for “plan bootstrap” similar to `mes-triage.json`?

## References
- External reference: https://github.com/OthmanAdi/planning-with-files
- `AGENTS.md`
- `.claude/skills/dev/SKILL.md`
- `.claude/skills/task-split/SKILL.md`
- `.claude/skills/note/SKILL.md`
- `scripts/conversation-new.ts`
