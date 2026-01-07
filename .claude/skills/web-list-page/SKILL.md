---
name: web-list-page
description: "Build or update a web list page (列表页/list page/table/card view/DataListLayout). Use when implementing list routes in apps/web with filtering, presets, pagination, and sorting."
---

# Web List Page

## Goal

Build a list page that follows the repo's list pattern: FilterToolbar + QueryPresetBar + server pagination, with both table and card views.

## Required References

- `agent_docs/02_frontend/data_list_pattern.md`
- `agent_docs/02_frontend/list_sorting.md`

## Canonical Example

- `apps/web/src/routes/_authenticated/mes/runs/index.tsx`

## Workflow

0. Preflight:
   - Run `git status` and call out a dirty tree.
1. Route skeleton first:
   - Add the route file and `validateSearch` for URL params.
2. Implement DataListLayout in server mode:
   - `mode="server"`, provide `pageCount`, sync pagination with URL search.
   - Implement both table view and card view (mandatory).
   - Ensure `viewPreferencesKey` is consistent across toolbar + list view.
3. Sorting:
   - Provide sane default sorting (`initialSorting`) and keep it stable.
   - If sorting is server-driven, pass it through and map to backend orderBy.
4. Commit checkpoints:
   - Slice 1: route + layout skeleton (`feat(web): add <entity> list page skeleton`)
   - Slice 2: filters + presets (`feat(web): add filters/presets for <entity> list`)
   - Slice 3: card view + polish (`feat(web): add card view for <entity> list`)
5. Verify:
   - `bun run check-types`
   - `bun run lint`

