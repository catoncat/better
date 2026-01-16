# Unit creation path mismatch in demo guide

## Context
- User flagged demo guide states TrackIn auto-creates Unit; this conflicts with prior decision that Units must be pre-generated under a Run.

## Decisions
- Prior discussion/decision: TrackIn must not auto-create Units; Unit must exist (pre-generated) before TrackIn.
- Run requires planQty; generateUnits constrained by planQty; deleteUnits allows cleanup of unprocessed Units.

## Plan
-

## Findings
- Source discussion: conversation/2026-01-13_131234_run-planqty-unit-lifecycle.md explicitly states "TrackIn no longer auto-creates Unit" and enforces pre-generation.
- Demo guide update was tracked in worktree_notes/feat_m3-ux-hardening.md (Slice 4) and commit cf2f299 referenced, but guide text still claims auto-create.
- Acceptance issue logged: user_docs/demo/acceptance_issues.md documents TrackIn with new SN returning UNIT_NOT_FOUND and mismatch vs guide.
- user_docs/demo/guide.md section 2.4 explicitly says "first TrackIn auto-creates Unit" and lists two paths (auto-create + batch pre-gen), which conflicts with the prior decision.
- git blame shows the auto-create guidance in section 2.4 was added in commit ecb8e5a8 (2026-01-13 16:15) with message "document Unit generation paths: auto-create on TrackIn vs batch pre-generate".

## Progress
- Updated demo guide 2.4 to require pre-generated Units and remove TrackIn auto-create path.
- Updated acceptance issue #3 to fixed with clarified expected behavior and doc reference.

## Errors
- Attempted to update `user_docs/demo/guide.md` with `python`, but `python` is not available in PATH (zsh: command not found). Used `python3` to rewrite the file.

## Open Questions
-

## References
- conversation/2026-01-13_131234_run-planqty-unit-lifecycle.md
- worktree_notes/feat_m3-ux-hardening.md
- user_docs/demo/acceptance_issues.md
- user_docs/demo/guide.md
- git log user_docs/demo/guide.md (commit ecb8e5a8)
