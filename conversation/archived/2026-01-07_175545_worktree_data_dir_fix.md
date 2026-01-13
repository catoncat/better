# worktree_data_dir_fix

## Context
- Main worktree had `data -> ../better/data`, a self-referential symlink that breaks file access ("too many levels of symbolic links") and prevents DB creation/usage.
- Root cause: `data` was tracked as a symlink in git, and the worktree bootstrap instructions could be misapplied in the canonical worktree.

## Decisions
- Stop tracking `data` in git; treat it as local runtime data only.
- Ignore `/data` in `.gitignore` so local DB/runtime files do not show up in `git status` and cannot be committed accidentally.
- Keep worktree DB sharing as: copy `.env` + optionally symlink `data` in the NEW worktree (not in the canonical worktree).
- Harden `scripts/worktree-new.ts` to resolve the source `data` directory and fail fast with a clear message if it is a broken/self-referential symlink.

## Plan
- Repair main worktree filesystem: replace `data` symlink with a real directory.
- Update workflow docs/skills to clarify where `data` symlink is allowed and when it is optional.
- Commit `.gitignore` and script/doc changes.

## Open Questions
- Whether to prefer absolute `DATABASE_URL` everywhere and drop the `data` symlink step entirely (kept optional for now).

## References
- `.gitignore`
- `AGENTS.md`
- `scripts/worktree-new.ts`
- `.codex/skills/worktree-bootstrap/SKILL.md`
- `.claude/skills/worktree-bootstrap/SKILL.md`
