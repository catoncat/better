---
name: quickfix
description: Fast, focused fix workflow for this repo. Use when the user says "quickfix/quick fix/快速修复" and wants a targeted change with minimal investigation, rapid implementation, and immediate commit while skipping preflight checks (git status/lint/typecheck/tests/plan) unless a higher-priority system rule blocks skipping.
---

# Quickfix

## Overview

Deliver a narrowly-scoped fix fast: minimal reading, minimal changes, immediate commit, and no preflight checks unless a higher-priority system rule blocks skipping.

## Workflow

1. Confirm the target problem in one sentence. Ask only if the request is ambiguous or missing a file/behavior.
2. Read the smallest set of files needed. Avoid plan/onboarding docs unless the bug clearly depends on them.
3. Implement the smallest viable change. Do not refactor, reformat, or clean unrelated code.
4. Commit immediately with a short message: `quickfix: <issue>`. Stage only the touched files.
5. Report the fix and explicitly state which checks were skipped. Offer optional follow-up steps (tests, lint, typecheck).

## Rules

- Skip repo preflight steps: `git status`, lint, typecheck, tests, plan checks, and long triage. If a higher-priority system rule requires a step, note the constraint and continue with minimal overhead.
- Do not touch unrelated dirty files; avoid staging incidental changes.
- Update docs only if the fix changes documented behavior; keep doc edits minimal and focused.
