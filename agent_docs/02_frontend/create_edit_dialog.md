# Create/Edit Dialog Pattern

## Goal
- Provide a consistent create/edit dialog with end-to-end type safety.

## When to Use
- Any modal form that creates or edits an entity (instruments, users, configs, etc.).

## Responsibilities
### Parent Component
- Holds `editingEntity` state.
- Calls `useCreateXxx` / `useUpdateXxx`.
- Handles toast, refresh, navigation side effects.

### Dialog Component
- Owns form UI and form state.
- Uses `initialData` to reuse the same form for create and edit.
- Normalizes fields and submits via `onSubmit`.

## Type Rules (Mandatory)
- Infer input types from Eden Treaty. Do not define manual API types.
```ts
import type { client } from "@/lib/eden";

type CreateInput = Parameters<typeof client.api.instruments.post>[0];
```

## Form Schema
- Use Zod with `zodResolver`.
- Ensure the schema output is assignable to the API input type.
```ts
const formSchema = z
  .object({ name: z.string().min(1, "Required") })
  satisfies z.ZodType<CreateInput>;
```

## Date/Time (Mandatory)
- Store ISO strings in form state.
- Convert in the DatePicker:
```tsx
<DatePicker
  value={field.value ? new Date(field.value) : undefined}
  onChange={(date) => field.onChange(date ? date.toISOString() : undefined)}
/>
```

## Field Normalization
- Trim required fields.
- Optional string: empty -> `undefined` (create) or `null` (edit if API allows).
- Never submit empty string IDs.

## Reset Behavior
- `form.reset()` on close.
- Reset when `open` or `entity` changes.

## Related Docs
- `agent_docs/01_core/coding_standards.md`
- `agent_docs/01_core/datetime_handling.md`
- `agent_docs/02_frontend/form_building.md`
