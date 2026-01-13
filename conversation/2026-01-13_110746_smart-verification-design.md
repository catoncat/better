# 智能验证：非代码变更跳过 `lint`/`check-types`（Local + CI/PR）

## Context

- 现状：`pre-merge-checklist`/`repo-dev-loop` 等默认要求跑 `bun run lint` + `bun run check-types`。
- 问题：纯文档/说明性变更（`*.md`、`conversation/`、`domain_docs/` 等）跑全量检查耗时且无收益。
- 新需求：本地工作流 + CI/PR 都要“按变更范围智能跳过”，并在跳过时给出清晰原因；同时允许强制执行。

## Decisions

- 采用“确定性脚本”作为唯一判断源（避免仅靠 skill 文本/LLM 推理导致 CI 行为不稳定）。
- 仅当变更集合为“文档类”时跳过；只要出现任意代码/配置变更，就运行检查（保守）。
- 必须覆盖 `worktree_notes/`（属于文档类；应跳过）。

## Plan

### A) 变更分类规则（建议先冻结为最小可行集）

**Doc-only（全部命中才允许跳过）**：

- 路径前缀：`conversation/`、`domain_docs/`、`agent_docs/`、`worktree_notes/`
- 扩展名：`*.md`、`*.mdx`、`*.txt`

**Force-run（出现任意一个就必须跑）**：

- 代码：`apps/**/src/**/*.{ts,tsx,js,jsx}`、`packages/**/src/**/*.{ts,tsx,js,jsx}`、`scripts/**/*.ts`
- 生成物/编译相关：`tsconfig*.json`、`biome.json`、`.biomeignore`、`package.json`、`bun.lockb`、`packages/db/prisma/**`
- 其它未知文件类型（默认按风险处理：跑）

> 备注：CSS/静态资源是否强制跑可后置；当前目标先解决“纯文档不跑”的最主要痛点。

### B) 实现方式（推荐：脚本封装，skills/CI 统一调用）

新增脚本：`scripts/smart-verify.ts`（建议 CLI 设计）：

```bash
# 默认：自动选择 baseRef（优先 origin/main，其次 main）
bun scripts/smart-verify.ts

# 显式指定对比基线（CI/PR 推荐显式传入）
bun scripts/smart-verify.ts --base origin/main

# 强制执行（即使 doc-only）
bun scripts/smart-verify.ts --force
```

脚本行为（建议）：

1. 收集变更文件（覆盖三类）：
   - staged：`git diff --name-only --cached`
   - unstaged：`git diff --name-only`
   - committed（分支累计）：`git diff --name-only <baseRef>...HEAD`
2. 判定 doc-only：
   - 若变更集合非空，且所有文件都匹配 doc-only 规则 → **跳过**（exit 0）
   - 否则 → **执行**：
     - `bun run lint`
     - `bun run check-types`
3. 输出必须包含：
   - 变更文件列表（或 top N + “省略”）
   - 判定结论（skip/run）与理由（命中的规则）

### C) Skills 接入点（把“智能验证”变成默认）

需要更新这些 skills 的“Verify”步骤（改为调用脚本，而不是永远跑）：

- `.claude/skills/pre-merge-checklist/SKILL.md`
- `.claude/skills/repo-dev-loop/SKILL.md`
- `.claude/skills/mes-implement/SKILL.md`（如果也包含“合并前必跑”段落）

示例措辞（写进 skill）：

- Verification: run `bun scripts/smart-verify.ts` (doc-only will skip; use `--force` to override).

### D) CI/PR 接入（原则：同一脚本，同一判定）

当前仓库未看到现成 CI 配置（无 `.github/workflows`/`.gitlab-ci.yml` 等），但方案应当支持：

- 在 CI job 中先运行：`bun install`（或复用缓存）→ `bun scripts/smart-verify.ts --base <PR base>`
- doc-only：job 直接成功结束（不跑 lint/typecheck）
- code/config：正常跑 lint/typecheck

对 CI 提供两个建议输入源：

- 若 CI 能提供 base ref（如 `origin/main`、PR base branch）：直接传 `--base <ref>`
- 否则：用 merge-base（脚本内可 fallback）：`git merge-base HEAD origin/main`（并用 `<base>...HEAD` diff）

## Open Questions

- doc-only 的扩展名集合是否要包含图片/表格资源（如 `*.png`、`*.svg`）？
- “只改 `worktree_notes/` 是否永远跳过”：当前决定是跳过；若未来把可执行脚本也放进该目录，需要重新评估。

## References

- `scripts/worktree-scan.ts`（已有“staged/unstaged/committed 变更文件收集”的实现可参考/复用）
- `.claude/skills/pre-merge-checklist/SKILL.md`
- `.claude/skills/repo-dev-loop/SKILL.md`
