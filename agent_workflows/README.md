# Agent Workflows (Control Plane)

This repo uses:
- **Workflows** as the explicit control plane: step order, parallel/serial execution, retry policy, and human gates.
- **Scripts / tools / humans** as the data plane: the actual executors for each step (Bun scripts, git commands, etc.).

Workflows are intended to reduce governance cost vs. natural-language-only orchestration:
- **Version governance**: a workflow diff shows exactly which step/condition changed.
- **Failure recovery**: step IDs allow partial re-run (`--from` / `--only`).
- **Observability & attribution**: each run produces step-level artifacts under `.spec-workflow/` (gitignored).

## Directory layout

- `agent_workflows/*.json`: committed workflow specs (team-shared)
- `.spec-workflow/`: local run artifacts (gitignored)

## Running a workflow

Run:
- `bun scripts/workflow-run.ts agent_workflows/<name>.json`

Common flags:
- `--dry-run`: print the steps without executing
- `--from <stepId>`: start from a specific step ID
- `--only <stepId>`: run only one step
- `--approve <stepId>`: allow a `requiresHuman` step to run

Artifacts:
- Default output root is `.spec-workflow/runs/<workflow>/<timestamp>/`

## Workflow spec (JSON)

Minimal shape:

```json
{
  "name": "mes-triage",
  "version": 1,
  "steps": [
    {
      "id": "worktree_scan",
      "kind": "bun",
      "args": ["scripts/worktree-scan.ts", "--format", "md"]
    }
  ]
}
```

Step fields:
- `id` (required): stable step identifier (used for re-run / artifacts)
- `kind` (required): `command` | `bun` | `assert.gitClean`
- `args` (required): argv array (no shell parsing)
- `cwd` (optional): working directory (default: repo root)
- `env` (optional): extra env vars for the step
- `retry` (optional): `{ "attempts": 2, "backoffMs": 500 }`
- `requiresHuman` (optional): if true, runner stops unless `--approve <id>`
- `captureStdoutTo` / `captureStderrTo` (optional): relative paths under the run dir

