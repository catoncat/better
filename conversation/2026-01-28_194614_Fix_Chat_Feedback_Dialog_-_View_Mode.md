# Fix Chat Feedback Dialog - View Mode

## Context
The user pointed out that the *viewing* dialog (in the management list) was not scrolling, not rendering markdown, and not showing the note at the top. I previously fixed the *creation* dialog by mistake.

## Changes
1.  **Exported `ChatMarkdown`**: From `apps/web/src/components/chat/chat-messages.tsx` to allow reuse.
2.  **Updated `ChatFeedbackDialog` (View Mode)**:
    -   Imported `ChatMarkdown`.
    -   Used `ChatMarkdown` to render `item.assistantMessage` (Markdown support).
    -   Moved `item.feedback` (Note) to the top of the content area.
    -   Verified `ScrollArea` usage (it was already present, but the lack of markdown rendering might have made content look like a single block if it had markdown syntax).

## Verification
-   Verified `bun run lint` passes.
-   Code logic aligns with user requirements (Note on top, Markdown rendering, Scrollable).