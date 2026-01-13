# Worktree Notes 上下文传递设计（`worktree_notes/`）

## Context

- 当前问题
  - Worktree 创建后没有携带“当前分支在做什么”的上下文（任务来源、切片、触及点）。
  - 在 worktree 里问“这个分支做到哪了/还差什么”时，AI 容易误触发 `mes-triage`/`task-slicer`，重复跑全项目任务分解。
  - 跨会话/跨 worktree 上下文丢失，导致二次解释成本高。
- 目标：让“任务上下文”随分支走、可自动更新、且能被 AI 在分支内快速读取。

## Decisions

- 任务上下文采用专门目录：`worktree_notes/`（随分支提交；在任何 worktree/会话都可读到）。
- worktree 创建后由脚本生成上下文：扩展 `bun scripts/worktree-new.ts` 支持传入任务参数并自动写入 note。
- 允许自动更新：在回答“分支进度”时，AI/脚本可以自动勾选/更新 `worktree_notes` 中的进度与状态块。

## Plan

### A) 目录与命名约定（避免 merge 冲突）

- 新增目录：`worktree_notes/`（tracked）。
- 每个分支一个 note：`worktree_notes/<branchSlug>.md`（避免固定文件名导致多分支合并冲突）。
- `branchSlug` 规则（建议写入脚本，保证一致）：
  - `/` → `__`
  - 其它非字母数字/`-_` → `_`
  - 示例：`feat/mes/material-binding` → `feat__mes__material-binding.md`

### B) Note 模板（“人可读 + 机可写”）

核心要求：脚本/AI 只能改动“自动区块”，不触碰人工区块，减少冲突与误改。

建议模板如下（YAML frontmatter 方便脚本解析；`AUTO` 区块用于自动更新）：

```md
---
type: worktree_note
createdAt: 2026-01-13T11:00:00+08:00
branch: feat/mes/material-binding
baseRef: origin/main
task:
  title: Material Binding Validation
  planPath: domain_docs/mes/plan/phase2_tasks.md
  planItem: 3.2
  triageNote: conversation/2026-01-13_080325_mes-triage_next-steps.md
touchPoints:
  - apps/server/src/modules/mes/execution/
  - apps/web/src/routes/_authenticated/mes/runs/
---

# feat/mes/material-binding — Material Binding Validation

## Scope
- Goal: （一句话目标）
- Non-goals: （不做什么）
- Risks: （高风险点）

## Slices
- [ ] Slice 0: 写入 worktree note（本文件）
- [ ] Slice 1: （…）
- [ ] Slice 2: （…）

<!-- AUTO:BEGIN status -->
## Status (auto)
- UpdatedAt: 2026-01-13T11:00:00+08:00
- CommitsAheadOfBase: 0
- Dirty: false
- ChangedFiles:
  - (none)
- Next:
  - （自动给建议下一步；允许 AI 覆盖）
<!-- AUTO:END status -->

## Decisions
- （人工记录：关键取舍、为什么）

## Open Questions
- （人工记录：未决问题）
```

### C) `worktree-new.ts`：创建 worktree 时写入 note（把上下文“带过去”）

在 `scripts/worktree-new.ts` 增加可选参数（示例）：

```bash
bun scripts/worktree-new.ts <branch> <path> \
  --task "Material Binding Validation" \
  --plan domain_docs/mes/plan/phase2_tasks.md \
  --plan-item 3.2 \
  --triage conversation/2026-01-13_080325_mes-triage_next-steps.md \
  --touch apps/server/src/modules/mes/execution/ \
  --touch apps/web/src/routes/_authenticated/mes/runs/ \
  --slices "Slice 1: service validation" \
  --slices "Slice 2: API wiring" \
  --slices "Slice 3: UI feedback"
```

脚本行为（建议）：

- `git worktree add` + `bun install`（保持现有行为）。
- 在新 worktree 根目录下创建/更新 `worktree_notes/<branchSlug>.md`（用模板；把参数写进 frontmatter）。
- 输出明确下一步（不自动 commit，避免脚本做“隐式改写历史”）：
  - `cd <path>`
  - `git add worktree_notes/<branchSlug>.md`
  - `git commit -m "docs(worktree): add task context"`

### D) `worktree-status`：分支内“进度查询”的默认入口（避免误 triage）

新增 skill：`.claude/skills/worktree-status/SKILL.md`（或 `task-status`），触发覆盖：

- “进度/做到哪/还差什么/当前分支状态/worktree 状态/完成怎么样”

行为（建议固定顺序，避免跑偏）：

1. `git rev-parse --show-toplevel` + `git branch --show-current` 获取分支名。
2. 定位 note：`worktree_notes/<branchSlug>.md`
   - 存在：读取并优先使用 note 中的 `task/Scope/Slices`。
   - 不存在：引导用户创建（或直接调用 `worktree-note-new` 脚本生成模板）。
3. 进度采集（轻量、确定性）：
   - `git status --porcelain`
   - `git log --oneline --decorate -n 20`
   - `git diff --stat <baseRef>...HEAD`（baseRef 从 note 或默认 `origin/main`）
4. 允许自动更新：仅更新 note 的 `AUTO:BEGIN status` 区块（更新时间、dirty、变更文件、建议下一步等）。
5. 输出给用户：任务简述 + 已完成/未完成 slices + 当前变更 + 下一步建议。

Guardrail（写入 skill）：

- 当问题是“进度/状态”时：禁止触发 `mes-triage`/`task-slicer`，除非用户明确说“重新拆分/重新 triage”。

### E) 与 `mes-triage`/`task-slicer` 的联动（把任务信息写入 worktree_notes）

- `mes-triage`：用户选定 Track/Task 且要求创建 worktree 时，调用 `worktree-new.ts` 并携带 `--task/--plan/...`，在新 worktree 里落地 note。
- `task-slicer`：在“已选定任务”且已存在 note 时，把 2-6 slices 直接写入 note 的 `## Slices`（减少重复输出与上下文丢失）。

## Open Questions

- 是否需要 `worktree_notes/README.md` 作为索引与约定说明（建议：需要，避免新人不知道规则）。
- note 是否需要在合并前保留/清理（建议：保留为历史；必要时可在 release 分支归档）。
- `AUTO` 区块的字段集合是否要冻结（建议：先冻结最小集合：UpdatedAt/Dirty/ChangedFiles/Next）。

## References

- `scripts/worktree-new.ts`
- `scripts/worktree-scan.ts`（可复用“变更文件 + touched areas”的判定逻辑）
- `.claude/skills/worktree-bootstrap/SKILL.md`
- `.claude/skills/mes-triage/SKILL.md`
