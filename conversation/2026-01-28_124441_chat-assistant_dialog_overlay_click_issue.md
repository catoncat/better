# chat-assistant dialog overlay click issue

## Context
-

## Decisions
-

## Plan
-

## Findings
-

## Progress
-

## Errors
-

## Open Questions
-

## References
-

## Context
- 用户反馈：`apps/web/src/components/chat/chat-assistant.tsx` 中按钮在有 Dialog 时无法点击，被 Dialog 背景层拦截，点击会关闭 Dialog。
- 目标：仅在 `main` 上最小改动修复点击问题，不触碰其他未提交改动。

## Plan
- 读取当前 `chat-assistant.tsx` 结构与样式，定位 Dialog/backdrop 层级与点击穿透问题。
- 选择最小改动（z-index / pointer-events / portal 容器）修复交互。
- 局部验证（无需全量 lint/typecheck，除非改动扩散）。

## Findings
- 待补充：文件结构与具体层级问题需要读取源码确认。

## Findings (update)
- `chat-assistant.tsx` 中浮动按钮使用了 `z-9999`（非 Tailwind 默认类），而面板与遮罩使用 `z-[9999]`/`z-[9998]`。按钮可能没有实际 z-index，导致被 Dialog overlay 拦截。
- 项目内仅此处出现 `z-9999`，未见全局自定义类。

## Progress
- 将按钮的 z-index 类从 `z-9999` 修正为 `z-[9999]`，与面板/遮罩保持一致，避免被 Dialog overlay 拦截。

## Progress (verify)
- 运行 `bun scripts/smart-verify.ts`；Biome + Prisma generate + check-types 全部通过。
- smart-verify 检测到的改动包含其他文件（非本次修改）。

## Findings (update 2)
- Dialog 使用 Radix `DialogPrimitive.Content`，默认点击对话框外会关闭（DismissableLayer）。
- 即使聊天按钮层级更高，点击仍属于“outside”，会触发 Dialog 关闭。

## Progress (update 2)
- 为 ChatAssistant 根节点添加 `data-chat-assistant-root`，用于对话框识别。
- 在 `DialogContent` 增加 `onInteractOutside` 拦截：点击 ChatAssistant 区域时 `preventDefault()`，避免 Dialog 被关闭。

## Progress (verify 2)
- 再次运行 `bun scripts/smart-verify.ts`；Biome + Prisma generate + check-types 全部通过。
