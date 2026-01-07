---
name: web-form-dialog
description: "Build a create/edit dialog or modal form in apps/web (对话框/弹窗/表单/create edit dialog). Use when implementing entity create/edit flows, dialogs, and type-safe forms using Eden types + Zod + TanStack Form."
---

# Web Form Dialog

## Goal

Implement a consistent create/edit dialog with end-to-end type safety and stable UX.

## Required References

- `agent_docs/02_frontend/create_edit_dialog.md`
- `agent_docs/02_frontend/form_building.md`

## Workflow

0. Preflight:
   - Run `git status` and call out a dirty tree.
1. Type contract:
   - Infer input types from Eden Treaty; do not define manual API types.
2. Implement dialog separation:
   - Parent: owns `editingEntity` state, mutation hooks, side effects.
   - Dialog: owns form UI + form state, uses `initialData`, submits via `onSubmit`.
3. Form rules:
   - Zod schema is the single source of truth.
   - Use TanStack Form + `zodValidator`.
   - Store ISO strings for dates in form state.
4. Commit checkpoints:
   - Slice 1: dialog shell + open/close state (`feat(web): add <entity> dialog shell`)
   - Slice 2: form fields + validation (`feat(web): add <entity> form fields`)
   - Slice 3: submit wiring + side effects (`feat(web): wire <entity> dialog mutations`)
5. Verify:
   - `bun run check-types`
   - `bun run lint`

