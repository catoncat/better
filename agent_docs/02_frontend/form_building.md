# Form Building Guide

## Goal
- Build accessible, type-safe, and visually consistent forms.

## Core References
- **Field Component**: `agent_docs/99_reference/shadcn.field.llm.txt` (Layout and Accessibility)
- **TanStack Form**: `agent_docs/99_reference/shadcn.tanstack_form.llm.txt` (State and Validation)

## Layout Best Practices
- **Vertical (Default)**: Standard for single column or dense grids.
- **Horizontal**: Use `orientation="horizontal"` for row-based alignment.
- **Responsive**: Use `orientation="responsive"` paired with `@container/field-group` for layout shifts.

## Validation (Zod + TanStack Form)
- Always use **Zod** schemas for validation.
- Integrate with TanStack Form's `useForm` hook.
- Use `field.state.meta.errors` for showing error messages via `<FieldError />`.

## Implementation Pattern
For standard Create/Edit modals, follow the pattern in `agent_docs/02_frontend/create_edit_dialog.md`.

### Reserved Space
To prevent layout shifts during validation, use the `reserve` prop on `FormDescription` or `FormMessage` (if implemented in project `ui/form.tsx`) or ensure container heights are stable.

### Tooltips for Metadata
For long hints that don't need to be visible all the time, prefer a `Tooltip` next to the `FormLabel` instead of a long `FormDescription`.

## Related Docs
- `agent_docs/02_frontend/ui_system.md`
- `agent_docs/02_frontend/create_edit_dialog.md`
