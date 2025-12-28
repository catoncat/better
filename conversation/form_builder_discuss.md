
## 2025-12-28 Form Builder Strategy Update

### 1. Unified `Field` Component
We introduced `apps/web/src/components/ui/form-field-wrapper.tsx` to standardize form field layout.

**Key Features:**
- **TanStack Form Integration**: Generic `Field` wrapper that accepts `form` instance and preserves type safety.
- **Compact Layout**: Uses `gap-1.5` and shared slots for Error/Description to save vertical space.
- **Layout Stability**: `reserveErrorSpace` prop (default true) prevents layout shifts.
- **Tooltip Support**: Built-in `tooltip` prop for static help text.

### 2. Type Safety Strategy (End-to-End)
- **Backend**: Eden Treaty provides exact input types (e.g., `RoleCreateInput`).
- **Schema**: Zod schemas must `satisfy` the Zod type of the API input.
  ```ts
  const schema = z.object({...}) satisfies z.ZodType<RoleCreateInput>;
  ```
- **Frontend Form**: `useForm` infers types from the validator (Zod adapter).
- **Field Component**: The `Field` wrapper uses generics `<TParentData, TName>` to ensure `name` prop is a valid path of the form data.

### 3. Usage Example
```tsx
<Field
  form={form}
  name="code"
  label="角色代码"
  tooltip="创建后不可修改"
  validators={{
    onChange: z.string().min(1, "必填"),
  }}
>
  {(field) => (
    <Input
      value={field.state.value}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
</Field>
```
