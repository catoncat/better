Context: quickfix for line-dialog.tsx runtime error.
Finding: formSchema uses z.object(...).satisfies<...>() which is not a zod method at runtime and throws TypeError.
Planned fix: replace with TypeScript satisfies operator or type annotation.
