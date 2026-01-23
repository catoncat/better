---
name: worktree-status
description: "Report current branch/worktree progress (分支进度/做到哪/还差什么/worktree 状态). Reads and updates `worktree_notes/<branchSlug>.md` (AUTO status block) and reports next steps; do not triage/slice unless explicitly asked."
context: fork
trigger_examples:
  positive:
    - "做到哪了"
    - "进度怎么样"
    - "还差什么"
    - "完成了吗"
    - "这个分支状态"
    - "当前任务进度"
    - "worktree 状态"
    - "branch status"
    - "what's left"
    - "progress"
  negative:
    - "现在做什么" # → mes-next
    - "下一步做什么" # → mes-next
    - "帮我实现 XXX" # → mes-implement / dev
    - "创建 worktree" # → worktree-new
---

# Worktree Status

## Triggers

- "这个分支做到哪了 / 还差什么 / 进度如何 / 当前任务完成怎么样"
- "worktree 状态 / branch status / progress"

## Workflow

| Step | Action |
|------|--------|
| 0 | Preflight per `AGENTS.md` (`git status`, call out dirty tree) |
| 1 | Update note (deterministic): `bun scripts/worktree-note-status.ts` |
| 2 | Read `worktree_notes/<branchSlug>.md` and report: task summary + slices + changed files + suggested next step |
| 3 | Check dependencies: read `dependencies.blockedBy` and report if any blockers are not yet completed |

## Dependencies Tracking

The worktree note frontmatter includes:

```yaml
dependencies:
  blockedBy: []           # Other branches/tasks this depends on
  blocks: []              # Other branches/tasks waiting on this
status: pending           # pending | in_progress | completed
```

When reporting status:
1. If `blockedBy` is non-empty, check if those tasks/branches are completed
2. If blocked, highlight this prominently: "⚠️ Blocked by: ..."
3. Show `status` field value in the summary
4. If `blocks` is non-empty, mention which tasks are waiting on this one

## Guardrails

- Do not run `mes-next` / `task-split` for progress questions unless explicitly asked to "重新拆分/重新 triage".
- Do not rewrite non-AUTO sections of the note without explicit user instruction.

## Special: main branch

**不要为 main 分支创建或更新 worktree note。**

当检测到当前分支是 main 时：
1. 提示用户：main 分支不使用 worktree_notes
2. 建议替代方案：
   - 调查/讨论 → 用 `.scratch/` 记录临时笔记（`bun scripts/conversation-new.ts "<topic>"`）
   - 重要决策 → 用 `conversation/` 记录并 commit（`bun scripts/conversation-new.ts --persist "<topic>"`）
   - 要写复杂代码 → 创建 feature 分支 + worktree（`bun scripts/worktree-new.ts <branch> <path>`）
3. 不要尝试读取或创建 `worktree_notes/main.md`
