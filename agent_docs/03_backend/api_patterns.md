# API Design Standards & Architecture Patterns

> **Status**: Authoritative Source
> **Audience**: LLMs, Architects, Senior Developers
> **Scope**: All Backend Modules (`apps/server/src/modules/**`)

This document defines the **mandatory** patterns for building APIs in this repository. It assumes a "clean slate" approach—any existing code violating these patterns should be refactored.

---

## 1. The Iron Rules (Non-Negotiables)

1.  **Envelope Always**: Every API response MUST be wrapped in `{ ok: boolean, data?: T, error?: E }`.
2.  **ServiceResult Pattern**: Domain logic MUST be decoupled from HTTP. Services return `ServiceResult<T>`, NOT `Response` objects.
3.  **Explicit Audit**: Business state changes MUST be audited explicitly in the Controller to capture "Before/After" diffs.
4.  **Type Safety**: All inputs/outputs MUST be validated using `Elysia.t` (TypeBox).
5.  **Transactions**: Multi-step writes MUST use `db.$transaction`.

---

## 2. Architecture Patterns

We follow a strict **Controller-Service** separation.

### 2.1 Service Layer (`service.ts`)
**Goal**: Pure business logic. Agnostic of HTTP, Headers, or Auth Context.
**Input**: Parsed data (from body/params) + DB Client (Prisma).
**Output**: `Promise<ServiceResult<T>>`.

**Standard Type**:
```typescript
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string; status?: number }; // status is a hint
```

**Template**:
```typescript
export const executeLogic = async (db: PrismaClient, input: InputType): Promise<ServiceResult<Output>> => {
  // 1. Validation
  if (invalid) return { success: false, code: "BAD_RULE", message: "...", status: 400 };

  // 2. Transaction
  return await db.$transaction(async (tx) => {
    // ... logic ...
    return { success: true, data: result };
  });
};
```

### 2.2 Controller Layer (`routes.ts`)
**Goal**: HTTP Interface. Handles Auth, Context, Audit, and Response Mapping.
**Tooling**: Use `elysia`'s `error()` helper for type-safe error returns.

**Template**:
```typescript
import { error } from "elysia";

// ... inside a route handler
.post("/", async ({ db, body, user, request }) => {
  // 1. Prepare Context (Audit)
  const actor = buildAuditActor(user);
  const meta = buildAuditRequestMeta(request);
  const before = await db.entity.findUnique(...) // Capture state for audit

  // 2. Call Service
  const result = await myService.execute(db, body);

  // 3. Handle Failure
  if (!result.success) {
    // 3.1 Audit Failure (Mandatory for MES writes)
    await recordAuditEvent(db, {
      action: "ENTITY_CREATE",
      status: "FAIL",
      actor, request: meta,
      errorCode: result.code, errorMessage: result.message
    });
    
    // 3.2 Return Error Envelope
    return error(result.status ?? 400, {
      ok: false,
      error: { code: result.code, message: result.message }
    });
  }

  // 4. Handle Success
  await recordAuditEvent(db, {
    action: "ENTITY_CREATE",
    status: "SUCCESS",
    actor, request: meta,
    before, // Diff will be generated automatically
    after: result.data
  });

  // 5. Return Success Envelope
  return { ok: true, data: result.data };
})
```

---

## 3. MES Core Requirements

### 3.1 Audit Logging Strategy
**Requirement**: Use `recordAuditEvent` helper in `routes.ts` for all writes.
-   Generic access logs (latency, IP) are handled by global plugins.
-   Business data audit (what changed) must be handled in the controller to capture intent and data context.

### 3.2 Idempotency

MES uses two idempotency mechanisms depending on the API type:

| API Type | Mechanism | Examples |
|----------|-----------|----------|
| MES Core Operations | `Idempotency-Key` header | TrackIn/Out, WO receive |
| External System Push | `eventId` field in body | TPM/WMS/SCADA integration |

**MES Core Operations** (TrackIn/Out, Work Order actions):
*   **Client**: Sends `Idempotency-Key` header.
*   **Service**: Checks key existence in `db.$transaction`.

**External System Push** (TPM stencil status, WMS solder paste, SCADA inspection):
*   **Client**: Includes `eventId` field in request body as business idempotency key.
*   **Service**: Uses `eventId` for deduplication (no HTTP header required).
*   **Rationale**: External systems (PLCs, SCADA) often cannot set custom HTTP headers.

---

## 4. API Contract (Wire Format)

### 4.1 Response Envelopes

**Success (2xx)**:
```json
{ "ok": true, "data": { ... } }
```

**Error (4xx/5xx)**:
```json
{
  "ok": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND", // UpperSnakeCase
    "message": "Instrument 'I-001' does not exist."
  }
}
```

### 4.2 Standard Error Codes
*   `BAD_REQUEST` (400): Validation / Logic.
*   `UNAUTHORIZED` (401): Not logged in.
*   `FORBIDDEN` (403): Perms.
*   `NOT_FOUND` (404).
*   `CONFLICT` (409): Duplicates.
*   `INTERNAL_ERROR` (500).

---

## 5. Schema Definitions (`schema.ts`)

Use `Elysia.t` (TypeBox) to define strict contracts.

```typescript
import { t } from "elysia";

// 1. Define Data Shape
export const myDataSchema = t.Object({
  id: t.String(),
  name: t.String()
});

// 2. Define Response Envelope
export const myResponseSchema = t.Object({
  ok: t.Boolean(),
  data: myDataSchema
});
```

## 6. Implementation Checklist

1.  [ ] **Service**: Returns `ServiceResult`, throws NO logical errors.
2.  [ ] **Controller**: Handles `!result.success` -> `error()`.
3.  [ ] **Audit**: `recordAuditEvent` called for both Success/Fail paths.
4.  [ ] **Envelope**: Response schema wraps data in `ok/data`.