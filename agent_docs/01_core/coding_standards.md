# Coding Standards and Type Safety

## Goal
- Keep code style consistent and preserve end-to-end type safety.

## When to Use
- Before writing or reviewing any code.

## Core Rules
- TypeScript, ESM, strict mode.
- Indentation: tabs. Quotes: double. Trailing commas.
- Prefer `@/*` alias over deep relative imports.
- Avoid `any`, `skipLibCheck`, and `@ts-ignore/@ts-expect-error`.

## End-to-End Type Safety (Critical)
Never manually define API types in the frontend. Always infer from Eden Treaty.

### Forbidden
```ts
// Do not define manual API types.
interface CreateInstrumentInput {
  instrumentNo: string;
}
```

### Correct
```ts
import { client } from "@/lib/eden";

type ApiResponse = Awaited<ReturnType<typeof client.api.instruments.get>>["data"];
type InstrumentItem = NonNullable<ApiResponse>["items"][number];

type CreateInput = Parameters<typeof client.api.instruments.post>[0];
```

### Hyphenated Routes
```ts
const featureApi = client.api["some-feature"];
type FeatureResponse = Awaited<ReturnType<typeof featureApi.get>>["data"];
```

### Nested Routes
```ts
const calibrationsApi = client.api.instruments({ id: "instrument-id" }).calibrations;
type CalibrationListInput = Parameters<typeof calibrationsApi.get>[0];
```

## Localization and UI Text
- Do not hardcode enum label maps in components.
- Use `apps/web/src/lib/constants.ts`.
- See `agent_docs/02_frontend/localization_constants.md`.

## Related Docs
- `agent_docs/02_frontend/create_edit_dialog.md`
- `agent_docs/04_data/json_schema_types.md`
