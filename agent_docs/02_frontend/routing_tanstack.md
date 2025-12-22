# TanStack Router (Quick Reference)

## Goal
- Provide a minimal, project-aligned reference for route files and common hooks.

## When to Use
- Creating or modifying routes.
- Syncing URL search params.

## Route Definition
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-page")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    search: String(search.search || ""),
  }),
  component: MyPageComponent,
});
```

## Common Hooks
```tsx
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";

const navigate = useNavigate();
const params = useParams({ from: "/_authenticated/instruments/$instrumentId" });
const search = useSearch({ from: "/_authenticated/instruments" });
```

## Link Usage
```tsx
import { Link } from "@tanstack/react-router";

<Link to="/instruments">Instruments</Link>
<Link to="/instruments/$instrumentId" params={{ instrumentId: "123" }}>Detail</Link>
<Link to="/instruments" search={{ calibrationType: "internal" }}>Filtered</Link>
```

## File Naming Conventions
- `route.tsx`: normal route file.
- `$param.tsx`: dynamic params.
- `_layout.tsx`: layout route.
- `index.tsx`: index route.
- `-folder/`: private folder (no route generated).

## Project Path
- Routes live in `apps/web/src/routes/`.
