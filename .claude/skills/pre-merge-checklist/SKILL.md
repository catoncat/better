---
name: pre-merge-checklist
description: "Run pre-merge / pre-PR verification for this repo (合并前检查/PR前检查). Use when the user asks to finish, merge, open a PR, or do final checks; enforces git-status cleanliness, bun lint/typecheck, and required doc/plan/align updates."
---

# Pre-Merge Checklist

## Goal

Catch issues early and keep merge-ready commits.

## Checklist

0. Confirm you are in the worktree you plan to merge.
1. Repo state:
   - `git status`
   - If not clean, commit or stash; call it out.
2. Required docs:
   - If this work included discussion/plan/decision, ensure a note exists in `conversation/YYYY-MM-DD_HHMMSS_<topic>.md`.
   - If this work implemented MES changes:
     - Confirm the relevant `domain_docs/mes/spec/impl_align/*.md` and plan files are updated.
3. Formatting (optional but recommended):
   - `bun run format`
4. Verification (required):
   - `bun run lint`
   - `bun run check-types`
5. Final sanity:
   - `git diff --stat`
   - Ensure staged/committed changes match the intended slice(s).
