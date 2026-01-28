# Improve Chat Feedback Dialog

## Context
User reported issues with the Chat Feedback Dialog:
1.  Content was not scrollable (due to line truncation).
2.  Markdown was not rendered for assistant messages.
3.  The "Note" field should be at the top.

## Changes
1.  **Refactored Markdown Rendering**:
    -   Extracted `ChatMarkdown` component from `MessageBubble` to reuse markdown rendering logic with custom components (Code, Table, Links).
    -   Updated `MessageBubble` to use `ChatMarkdown`.

2.  **Updated `ChatFeedbackDialog`**:
    -   **Layout**: Moved the "Note" (Textarea) to the top of the dialog.
    -   **Rendering**: Used `ChatMarkdown` for assistant messages to render rich text.
    -   **Scrolling**: Removed `line-clamp-2` and used `whitespace-pre-wrap` for user messages, allowing content to expand and scroll within the `max-h-80` container.
    -   **Interaction**: Replaced `Label` wrapper (which caused invalid HTML with block content) with a `div` having `onClick` handler for row selection. Added `biome-ignore` for static element interaction.

## Verification
-   Verified `bun run lint` passes.
-   Code structure ensures markdown is consistent between chat stream and feedback dialog.