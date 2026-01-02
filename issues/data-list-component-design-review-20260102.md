# Data List Component Design Review (2026-01-02)

## Scope
Review data-list components and shared behaviors (pagination, loading, caching, presets, view preferences, date range contract) and propose best-practice solutions.

## 1) Server-side pagination row model
**Issue**: Manual/server pagination should not apply client-side pagination row model, or you can double-paginate current-page data.

**Best-practice direction (design)**
- Treat server pagination as “data already paged.” Do not slice again in the table layer.
- When `manualPagination: true`, omit `getPaginationRowModel` and rely on server-provided page data plus `rowCount`/`pageCount` to drive controls.

**Why (source-backed)**
- TanStack Table states that for server-side pagination, you do **not** need `getPaginationRowModel`, and `manualPagination: true` makes the table assume data is already paginated. This is the canonical contract to avoid double slicing.
  - Source: https://tanstack.com/table/latest/docs/guide/pagination

**Component-level UX note**
- When pagination is server-driven, the UI should prioritize clarity (e.g., “Page X / Y” reflects server counts) and avoid confusing empty tables on page > 1.

---

## 2) Loading vs background refresh indicator
**Issue**: Using `placeholderData` keeps content while refetching, but `isLoading` stays false, so users can’t tell data is refreshing.

**Best-practice direction (design)**
- Keep stale data visible and add a subtle “refreshing” indicator using `isFetching` (or a top progress bar). This preserves continuity and communicates background activity.
- Distinguish initial load (blocking/skeleton) from background fetch (non-blocking shimmer, toast, or inline chip).

**Why (source-backed)**
- TanStack Query explicitly recommends using `isFetching` for background indicators while keeping existing data visible.
  - Source: https://tanstack.com/query/v5/docs/react/guides/background-fetching-indicators
- `placeholderData` is “success state” data and doesn’t indicate pending; it’s meant to show UI while actual data loads in background.
  - Source: https://tanstack.com/query/v5/docs/react/guides/placeholder-query-data

**Component-level UX note**
- Provide a consistent, lightweight refresh affordance across all list pages to build user trust.

---

## 3) Preset matching for multi-select values
**Issue**: Preset matching is order-sensitive for arrays; equal sets in different order won’t match, leading to duplicate presets and inconsistent highlighting.

**Best-practice direction (design)**
- Normalize filters before comparison: sort arrays, drop empty values, and serialize deterministically. Match presets by the normalized representation.
- Align with deterministic key semantics: object key order should not matter, but array order does; therefore, normalize array order to match user intent.

**Why (source-backed)**
- TanStack Query notes that query keys are deterministically hashed for object key order, while array order matters. This is a good reference model for “stable identity” semantics.
  - Source: https://tanstack.com/query/v5/docs/react/guides/query-keys

**Component-level UX note**
- Preset “identity” should track user intent (selected set), not implementation order. This reduces accidental duplicate presets.

---

## 4) View preferences persistence scope
**Issue**: If a list page forgets `viewPreferencesKey`, all lists share `default` preferences, causing cross-page leakage. LocalStorage availability and eviction can also impact UX.

**Best-practice direction (design)**
- Require a unique, page-scoped `viewPreferencesKey` (e.g., route-based or list-namespace).
- Guard localStorage usage with availability checks and handle quota/eviction gracefully (fallback to defaults).

**Why (source-backed)**
- Web Storage is per-origin, string-only, and may be unavailable in some contexts; robust availability checks are recommended.
  - Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
- Storage has quotas and eviction behavior; data can be removed under storage pressure, so designs should tolerate missing preferences.
  - Source: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

**Component-level UX note**
- Treat view preferences as “best-effort” and avoid user surprise by falling back cleanly.

---

## 5) Date range filter contract clarity
**Issue**: The date-range filter relies on a special `__dateRange__` payload that consumers must interpret, but the contract is implicit and easy to break.

**Best-practice direction (design)**
- Make filter contracts explicit and consistent: define from/to keys and ISO 8601 expectations; keep date range semantics stable across pages.
- Align filter encoding with API conventions (query params, operator suffixes), and validate/handle invalid inputs predictably.

**Why (source-backed)**
- API filtering best practices recommend clear, consistent query parameter conventions and explicit operator usage for ranges (e.g., `*_gte` / `*_lte`).
  - Source: https://www.speakeasy.com/api-design/filtering-responses

**Component-level UX note**
- A visible, stable “contract” reduces hidden coupling and prevents filter UI regressions when new lists are added.

---

## Suggested follow-ups
- Add a short “DataList behavior contract” section to centralize: pagination mode, loading indicators, preset normalization, and date-range semantics.
- Provide small helper utilities for filter normalization and view-preference key generation.
