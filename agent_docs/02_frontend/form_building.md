# Form Building Guide

## Goal
- Build accessible, type-safe, and visually consistent forms.

## Form Engineering Rules (Mandatory)

### Single Source of Truth
- **Schema**: Zod schema defines validation AND types.
- **Form state**: TanStack Form (`useForm`) with `zodValidator`.
- Type inference: `z.infer<typeof schema>` - never manual types.

### Field Rules
| Rule | Implementation |
|------|----------------|
| All inputs | `className="w-full"` |
| Relationship fields | Must use Selector/Combobox (never raw ID input) |
| Validation messages | Fixed height container (`min-h-[20px]`) to prevent layout shift |
| Required indicator | Asterisk in label, not placeholder |

### Canonical Pattern
```tsx
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "请输入名称"),
  instrumentId: z.string().min(1, "请选择仪器"),
});

const form = useForm({
  defaultValues: { name: "", instrumentId: "" },
  validatorAdapter: zodValidator(schema),
});

<form.Field name="instrumentId">
  {(field) => (
    <FormFieldWrapper label="仪器" required error={field.state.meta.errors[0]}>
      <InstrumentSelect
        value={field.state.value}
        onChange={field.handleChange}
        className="w-full"
      />
    </FormFieldWrapper>
  )}
</form.Field>
```

## Layout Best Practices
- **Vertical (Default)**: Standard for single column or dense grids.
- **Horizontal**: Use `orientation="horizontal"` for row-based alignment.
- **Responsive**: Use `orientation="responsive"` paired with `@container/field-group` for layout shifts.

### Reserved Space
To prevent layout shifts during validation, use the `reserve` prop on `FormDescription` or `FormMessage` (if implemented in project `ui/form.tsx`) or ensure container heights are stable.

### Tooltips for Metadata
For long hints that don't need to be visible all the time, prefer a `Tooltip` next to the `FormLabel` instead of a long `FormDescription`.

## Core References
- **Field Component**: `agent_docs/99_reference/shadcn.field.llm.txt`
- **TanStack Form**: `agent_docs/99_reference/shadcn.tanstack_form.llm.txt`
