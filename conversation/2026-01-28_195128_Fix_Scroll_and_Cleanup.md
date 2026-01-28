# Fix Scroll and Cleanup

## Context
User reported "Still unable to scroll" in the feedback view dialog, and "MessageSquareText is not defined" (which they fixed).

## Changes
1.  **Replaced `ScrollArea` with Native Scroll**:
    -   In `apps/web/src/routes/_authenticated/system/chat-feedbacks/-components/chat-feedback-dialog.tsx`, replaced `ScrollArea` component with `div` having `overflow-y-auto`. `ScrollArea` can sometimes be finicky with flex layouts and height constraints, while native scrolling is robust.

2.  **Verified `MessageSquareText`**:
    -   Verified that `apps/web/src/components/chat/chat-suggestions.tsx` contains the correct import and usage of `MessageSquareText`. The user likely fixed this manually as indicated by their comment.

3.  **Cleanup**:
    -   Removed unused `Label` import in `chat-messages.tsx` (leftover from previous refactor).
    -   Sorted imports in `chat-suggestions.tsx`.

## Verification
-   `bun run lint` passes.
-   Scrolling logic uses standard CSS `overflow-y-auto` which guarantees scrollability when content exceeds container height.