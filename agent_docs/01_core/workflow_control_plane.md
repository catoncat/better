# Workflow Control Plane (Hybrid Orchestration)

## Goal

Make team workflows (triage, preflight, verification) **explicit, reviewable, and partially re-runnable**.

This repo treats:
- **Workflows** as the *control plane* (what to do next; order; retry; human gates).
- **Scripts/tools/humans** as the *data plane* (how each step is executed).

## Why (vs. natural-language-only orchestration)

- **Version governance**: diffs show exactly which step changed.
- **Failure recovery**: steps have IDs; rerun from the failed step.
- **Observability**: each run writes step-level artifacts to `.spec-workflow/` (gitignored).

## Where things live

- Workflow specs: `agent_workflows/*.json`
- Runner: `scripts/workflow-run.ts`
- Local run artifacts: `.spec-workflow/` (gitignored)

## Interaction with skills

Skills remain useful as:
- a shared “how to do it” capability package for humans/LLMs
- a pointer to the canonical workflow and runner command

For governance-critical flows (MES triage, pre-merge checks), prefer:
- `bun scripts/workflow-run.ts agent_workflows/<workflow>.json`

## Artifact contract (local only)

Each run writes a directory:
- `.spec-workflow/runs/<workflow>/<timestamp>/`

At minimum:
- `run.json`: workflow metadata + step summary
- `logs.ndjson`: step-level events
- `outputs/`: captured stdout/stderr or generated markdown

