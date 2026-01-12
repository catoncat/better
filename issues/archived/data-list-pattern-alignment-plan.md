> **✅ 已完成 / COMPLETED**
>
> 本计划已在 2026-01 完成实施。详见 `data-list-implement.md` 的完成总结。
>
> **清理日期**：2026-01-12（任务 3.1.3）

---

# Data List Pattern Alignment Plan

## Scope
- Align list implementations with the documented data list pattern.
- Produce a clear, actionable checklist for future code changes.

## Current Gaps (Observed)
- Canonical reference in `agent_docs/02_frontend/data_list_pattern.md` points to a missing file (`/apps/web/src/routes/_authenticated/instruments/index.tsx`).
- List pages render table and card views from separate definitions instead of a shared field meta source.
- Filter clear action label differs from the spec (spec says "clear filters"; UI uses a different label).
- Inconsistent `viewPreferencesKey` usage in at least one list page.

## Proposed Plan
1. Choose the new canonical reference list page (an existing, stable list route).
2. Define shared field metadata per list page and derive table columns and card fields from it.
3. Standardize filter reset label to match the spec.
4. Align `viewPreferencesKey` values so `FilterToolbar` and `DataListView` share the same key.

## Acceptance Criteria
- `agent_docs/02_frontend/data_list_pattern.md` references an existing list page.
- At least one list page demonstrates shared field metadata driving both table and card views.
- Filter reset label matches the spec.
- `viewPreferencesKey` is consistent within each list page.

## Notes
- No behavior changes beyond the alignment described above.
- Follow existing UI and routing patterns; no new dependencies.
