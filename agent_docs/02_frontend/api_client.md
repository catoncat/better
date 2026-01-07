# API Client & Error Handling

## Goal
- Standardize how the frontend consumes backend APIs.
- Ensure consistent error handling and user feedback.

## When to Use
- Writing any `useQuery` or `useMutation` hook.
- Handling API errors in UI components.

## The `unwrap` Pattern

The backend wraps all responses in a standard envelope: `{ ok: boolean, data: T, error?: ... }`.
The frontend **MUST** use the `unwrap` utility to normalize this response.

`unwrap`:
- Converts `{ ok: false }` envelope failures into thrown errors.
- Normalizes `response.data.data` into the inner `T`.

### Usage in Hooks

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

// Query
useQuery({
  queryKey: ["items"],
  queryFn: async () => {
    const response = await client.api.items.get();
    return unwrap(response); // Returns T, or throws ApiError
  }
});

// Mutation
useMutation({
  mutationFn: async (data) => {
    const response = await client.api.items.post(data);
    return unwrap(response);
  }
});
```

## Error Handling Strategy

### 1. Global Fallback (Toast)
The global `QueryClient` is configured to catch unhandled errors from `unwrap` and show a **Toast notification**.
- **Network Errors**: "Network response was not ok"
- **Server Errors (500)**: "Internal Server Error"
- **Business Errors (ok: false)**: The `message` from the backend (e.g., "Instrument not found").

**Benefit**: You don't need to write `toast.error(err.message)` in every mutation unless you want custom behavior.

### 2. Specific Business Logic
If you need to handle a specific error code (e.g., set form errors on conflict), catch the `ApiError`.

```typescript
import { ApiError } from "@/lib/api-error";

try {
  await createMutation.mutateAsync(data);
} catch (error) {
  if (error instanceof ApiError && error.code === 'CONFLICT') {
    form.setError('name', { message: 'Name already exists' });
  } else {
    // Let global handler or generic toast handle it,
    // OR re-throw to trigger global handler if you haven't handled it.
    // Note: If you catch it here, global onError might still fire depending on setup.
    // The current global setup in `__root.tsx` fires for all failures.
  }
}
```

## ApiError
- Class: `apps/web/src/lib/api-error.ts`
- When you need custom handling, catch `ApiError` and branch on `code`.
