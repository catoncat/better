---
name: pre-merge-checklist
description: "Run pre-merge / pre-PR verification for this repo (合并前检查/PR前检查). Use when the user asks to finish, merge, open a PR, or do final checks; enforces git-status cleanliness, bun lint/typecheck, and required doc/plan/align updates."
---

# Pre-Merge Checklist

## Workflow

| Step | Action |
|------|--------|
| 0 | Confirm you are in the worktree/branch you plan to merge |
| 1 | Repo state: `git status` (if dirty, call it out; do not auto-commit unless asked) |
| 2 | Required docs: conversation note (if discussion/plan/decision happened); MES work requires plan/align updates |
| 3 | Optional formatting: `bun run format` |
| 4 | Verification (smart): `bun scripts/smart-verify.ts` (doc-only skips; `--force` overrides) |
| 5 | Final sanity: `git diff --stat` and confirm changes match the intended slice(s) |
