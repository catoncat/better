# chat history local storage ui plan

## Context
- 用户要求：聊天记录保存 + 历史记录 UI，先不使用数据库，直接存浏览器。
- 用户选择方案：A/A/A（面板内切换视图；自动恢复最近会话；localStorage）。
- 当前工作区存在未提交改动：`apps/web/src/components/chat/chat-messages.tsx`。

## Decisions
- UI 采用面板内切换历史列表视图。
- 默认自动恢复最近会话。
- 存储使用 localStorage。

## Plan
- 设计 localStorage 数据结构（会话元数据与会话消息分离）。
- UI：聊天面板顶部增加“历史”入口，列表视图支持新建、切换、重命名、删除。
- 会话加载策略：进入页面恢复最近会话；打开聊天时加载对应消息。
- 落地实现前先处理未提交的 `chat-messages.tsx` 变更（提交或回滚）。

## Findings
-

## Progress
-

## Errors
-

## Open Questions
- 是否先提交/回滚 `chat-messages.tsx` 的未提交改动后再开始实现？

## References
- `apps/web/src/components/chat/*`
