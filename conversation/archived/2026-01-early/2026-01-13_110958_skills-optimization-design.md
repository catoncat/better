# Skills 文档格式与效率优化（结合 worktree_notes + smart-verify）

## Context

- 当前 skills 存在重复描述（preflight/worktree/verify/commit pattern），导致：
  - token 浪费（每次加载都要读同样的段落）
  - 维护成本高（改一处逻辑要改多处）
  - 行为不一致风险（不同 skill 对同一规则表述不同）
- 同时出现新的需求：
  - doc-only 变更在 Local + CI/PR 都应跳过 `lint/check-types`
  - worktree 创建后需要携带任务上下文，并能在分支内直接回答进度（不再全量 triage）

## Decisions

- 通用规则的“唯一真相”放在 `AGENTS.md`（`CLAUDE.md`/`GEMINI.md` 为其 symlink；不在 skills 中重复铺开）。
- skills 本体只保留“该 skill 独有的动作/约束”，并统一采用紧凑结构（Triggers/Inputs/Workflow/Outputs/Guardrails/Fast path）。
- 验证逻辑统一收敛到 `bun scripts/smart-verify.ts`（skills/CI 复用同一判定）。
- 进度查询收敛到 `worktree-status` + `worktree_notes/`（避免误触发 triage/slicer）。

## Plan

### A) Skill 文档信息架构（模板）

建议统一为以下结构（鼓励表格化 Workflow；减少叙述性散文）：

```md
---
name: <skill-name>
description: "<one-liner>"
context: fork
---

# <Skill Title>

## Triggers
- <what user asks>

## Inputs
- Required: <...>
- Optional: <...>

## Workflow
| Step | Action |
|------|--------|
| 0 | Preflight per `AGENTS.md` |
| 1 | ... |

## Outputs
- <what to print / files updated>

## Guardrails
- <must not do>

## Fast Path
- <default short path when no ambiguity>
```

### B) “共享片段引用” vs “AGENTS.md 收敛”

另一份方案里提到 `.claude/skills/_shared/` 片段复用。需要注意：

- skill 加载是否会自动 follow 引用不可靠（需要 AI 额外打开文件，存在漏读风险）。
- 本仓库已明确：通用规则应在 `AGENTS.md`（会自动进入上下文），因此更稳的是“AGENTS 收敛 + skill 精简”。

建议取长补短：

- **以 `AGENTS.md` 为主**：放所有跨 skill 的硬规则（preflight、worktree 建议、commit cadence、conversation sync、smart verify）。
- `_shared/` 可作为“人类维护的片段库”（可选），但不作为运行时依赖。

### C) 需要新增/调整的关键 skills（具体改动点）

**1) 新增 `worktree-status`（或 `task-status`）**

- 目的：回答“当前分支进度/做到哪了/还差什么”时不再 triage/slice。
- 读取：`worktree_notes/<branchSlug>.md`
- 允许写：仅更新 note 的 `AUTO` 区块（见 worktree-context 设计文档）。

**2) 更新 `mes-triage`**

- 明确 Triggers：只响应“下一步做什么/what next/接下来开发什么/还有什么没做”，不覆盖“进度/做到哪”类问题。
- 当用户选中某个 candidate 且要求创建 worktree：
  - 用 `bun scripts/worktree-new.ts` 携带 `--task/--plan/--triage/--slices`，在新 worktree 里落地 `worktree_notes`。
  - 提醒把 worktree note 作为“Slice 0”先提交（`docs(worktree): add task context`）。

**3) 更新 `pre-merge-checklist` / `repo-dev-loop`**

- Verification 段落统一替换为：`bun scripts/smart-verify.ts`（doc-only 自动跳过；`--force` 可覆盖）。

**4) 更新 `worktree-bootstrap`**

- 增加一段：worktree 创建后的“上下文落地”必须写入 `worktree_notes/`（并推荐作为第一笔 commit）。

### D) 文档层面的效率优化（减少重复、提高可扫描性）

- 用“Workflow 表格”替代长段落序号列表（同样信息更短更易扫）。
- 把所有“命令列表”收敛为 1-2 个 canonical 命令：
  - `bun scripts/smart-verify.ts`（验证）
  - `bun scripts/worktree-new.ts`（创建 worktree + 初始化上下文）
  - `bun scripts/conversation-new.ts`（写 conversation note）

### E) 实施顺序（建议分 3 个 slice，便于 review）

- Slice 1（P0）：补齐/更新三件套脚本与约定
  - `worktree_notes/` 约定落地（README 可选）
  - `scripts/smart-verify.ts`（决定性来源）
  - `scripts/worktree-new.ts` 增强（写入 worktree_notes）
- Slice 2（P0）：核心 skills 精简与改造
  - `pre-merge-checklist`/`repo-dev-loop`/`worktree-bootstrap`/`mes-triage`/`conversation-sync`
- Slice 3（P1）：补齐“进度查询闭环”
  - 新增 `worktree-status`
  - 让 `task-slicer` 可把 slices 写入 worktree note（可选）

## Open Questions

- `worktree_notes/` 是否需要约定“合并后保留/归档策略”（默认建议保留）。
- `worktree-status` 自动勾选 slices 的规则：仅手动勾选 vs 允许基于 commit message/关键文件变更做“半自动提示”。

## References

- `AGENTS.md`（通用规则的唯一真相）
- `conversation/2026-01-13_105833_worktree-context-design.md`
- `conversation/2026-01-13_110746_smart-verification-design.md`
- `.claude/skills/repo-dev-loop/SKILL.md`
- `.claude/skills/pre-merge-checklist/SKILL.md`
