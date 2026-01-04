# Plan: Loading Verify + Integration APIs (Revised)

> **Worktree**: `feature/mes-loading-integration`
> **Scope**: Task 2.4 (Loading Verify) + Task 2.6 (Integration APIs, excluding 2.6.4)
> **Revised**: 2026-01-04 (based on code review findings)

---

## Summary

Implement material loading verification (上料防错) for SMT feeders and integration endpoints for receiving stencil/solder paste status from external systems (TPM/WMS).

---

## Revision Summary

Based on code review, the following issues were identified and addressed:

| Issue | Problem | Solution |
|-------|---------|----------|
| H1 | `FeederSlot.expectedMaterialCode` overwritten by multiple Runs | New `RunSlotExpectation` table |
| H2 | Stencil/SolderPaste records not bound to line | New `LineStencil` / `LineSolderPaste` binding tables |
| M1 | Missing alarm lock/retry control | Add locking fields to `FeederSlot` |
| M2 | BOM has no slot/position fields | New `SlotMaterialMapping` config table |
| M3 | Missing stencil/solder paste fields | Add `version`, `lastCleanedAt`, `thawedAt`, `stirredAt` |
| M4 | Independent tables vs IntegrationMessage | Hybrid: both for audit + business queries |

---

## Phase 1: Prisma Schema (P0)

**File**: `packages/db/prisma/schema/schema.prisma`

### 1.1 New Enums

```prisma
enum LoadingRecordStatus { LOADED, UNLOADED, REPLACED }
enum LoadingVerifyResult { PASS, FAIL, WARNING }
enum StencilStatus { READY, NOT_READY, MAINTENANCE }
enum SolderPasteStatus { COMPLIANT, NON_COMPLIANT, EXPIRED }
enum IntegrationSource { AUTO, MANUAL }
```

Extend `ReadinessItemType`: add `STENCIL`, `SOLDER_PASTE`, `LOADING`

### 1.2 FeederSlot Model (with locking fields - M1)

```prisma
model FeederSlot {
  id                   String   @id @default(cuid())
  lineId               String
  slotCode             String           // e.g., "F01"
  slotName             String?
  position             Int

  // Runtime state (M1 - alarm lock/retry)
  currentMaterialLotId String?          // Currently loaded material lot
  isLocked             Boolean  @default(false)  // Lock after 3 failures
  failedAttempts       Int      @default(0)      // Consecutive failures
  lockedAt             DateTime?
  lockedReason         String?

  meta                 Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  line                 Line                @relation(...)
  loadingRecords       LoadingRecord[]
  slotMappings         SlotMaterialMapping[]
  runExpectations      RunSlotExpectation[]

  @@unique([lineId, slotCode])
  @@index([lineId])
}
```

### 1.3 SlotMaterialMapping Model (NEW - M2 solution)

Configuration table for defining which materials go to which slots for a given product/route:

```prisma
model SlotMaterialMapping {
  id              String   @id @default(cuid())
  productCode     String?          // Optional: specific product
  routingId       String?          // Optional: specific routing
  slotId          String
  materialCode    String           // Expected material code for this slot
  priority        Int      @default(1)   // For alternates: lower = preferred
  isAlternate     Boolean  @default(false)

  meta            Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  slot            FeederSlot @relation(...)
  routing         Routing?   @relation(...)

  @@unique([slotId, materialCode])
  @@index([productCode])
  @@index([routingId])
  @@index([slotId])
}
```

### 1.4 RunSlotExpectation Model (NEW - H1 solution)

Run-specific slot expectations, populated when a Run starts from SlotMaterialMapping:

```prisma
model RunSlotExpectation {
  id                   String   @id @default(cuid())
  runId                String
  slotId               String
  expectedMaterialCode String           // Copied from SlotMaterialMapping
  alternates           Json?            // Array of alternate material codes
  status               String   @default("PENDING")  // PENDING | LOADED | MISMATCH
  loadedMaterialCode   String?          // Actual loaded material
  loadedAt             DateTime?
  loadedBy             String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  run                  Run        @relation(...)
  slot                 FeederSlot @relation(...)

  @@unique([runId, slotId])
  @@index([runId])
  @@index([slotId])
}
```

### 1.5 LoadingRecord Model

```prisma
model LoadingRecord {
  id                   String              @id @default(cuid())
  runId                String
  slotId               String
  runSlotExpectationId String?             // Link to run expectation
  materialLotId        String
  materialCode         String              // Actual scanned material
  expectedCode         String?             // Expected at time of scan
  status               LoadingRecordStatus @default(LOADED)
  verifyResult         LoadingVerifyResult
  failReason           String?
  loadedAt             DateTime            @default(now())
  loadedBy             String
  unloadedAt           DateTime?
  unloadedBy           String?

  meta                 Json?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  run                  Run                 @relation(...)
  slot                 FeederSlot          @relation(...)
  materialLot          MaterialLot         @relation(...)
  expectation          RunSlotExpectation? @relation(...)

  @@index([runId])
  @@index([slotId])
  @@index([materialLotId])
  @@index([loadedAt])
}
```

### 1.6 LineStencil & LineSolderPaste Binding Models (NEW - H2 solution)

```prisma
model LineStencil {
  id          String   @id @default(cuid())
  lineId      String
  stencilId   String           // External stencil ID
  isCurrent   Boolean  @default(true)  // Only one current per line
  boundAt     DateTime @default(now())
  boundBy     String?
  unboundAt   DateTime?
  unboundBy   String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  line        Line     @relation(...)

  @@unique([lineId, stencilId, boundAt])
  @@index([lineId, isCurrent])
  @@index([stencilId])
}

model LineSolderPaste {
  id          String   @id @default(cuid())
  lineId      String
  lotId       String           // Solder paste lot ID
  isCurrent   Boolean  @default(true)
  boundAt     DateTime @default(now())
  boundBy     String?
  unboundAt   DateTime?
  unboundBy   String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  line        Line     @relation(...)

  @@unique([lineId, lotId, boundAt])
  @@index([lineId, isCurrent])
  @@index([lotId])
}
```

### 1.7 StencilStatusRecord (M3 fields added)

```prisma
model StencilStatusRecord {
  id             String            @id @default(cuid())
  eventId        String            @unique  // Idempotency
  eventTime      DateTime
  stencilId      String
  version        String?           // M3: version field
  status         StencilStatus
  tensionValue   Float?
  lastCleanedAt  DateTime?         // M3: last cleaned time
  source         IntegrationSource
  operatorId     String?
  receivedAt     DateTime          @default(now())
  meta           Json?

  @@index([stencilId])
  @@index([eventTime])
}
```

### 1.8 SolderPasteStatusRecord (M3 fields added)

```prisma
model SolderPasteStatusRecord {
  id          String             @id @default(cuid())
  eventId     String             @unique  // Idempotency
  eventTime   DateTime
  lotId       String
  status      SolderPasteStatus
  expiresAt   DateTime?
  thawedAt    DateTime?          // M3: thaw time
  stirredAt   DateTime?          // M3: stir time
  source      IntegrationSource
  operatorId  String?
  receivedAt  DateTime           @default(now())
  meta        Json?

  @@index([lotId])
  @@index([eventTime])
}
```

### 1.9 Line.meta Readiness Config

```typescript
// Line.meta structure for readiness configuration
interface LineMeta {
  readinessChecks?: {
    enabled: Array<'STENCIL' | 'SOLDER_PASTE' | 'LOADING' | 'EQUIPMENT' | 'MATERIAL' | 'ROUTE'>;
    rules?: {
      loadingRequired?: boolean;
      stencilRequired?: boolean;
      solderPasteRequired?: boolean;
    };
  };
}
```

### 1.10 IntegrationMessage Audit Log (2.6.1)

- Verify existing `IntegrationMessage` fields cover inbound stencil/solder status (`direction`, `system`, `entityType`, `status`, `dedupeKey`).
- Use `dedupeKey = eventId`, `businessKey = stencilId/lotId`.
- Store `source` (AUTO/MANUAL) in payload/meta unless a dedicated column is required.

---

## Phase 2: Loading Module (P0)

### 2.1 Create Loading Module

**New files to create**:
- `apps/server/src/modules/mes/loading/schema.ts`
- `apps/server/src/modules/mes/loading/service.ts`
- `apps/server/src/modules/mes/loading/routes.ts`

### 2.2 Service Functions

| Function | Description |
|----------|-------------|
| `loadSlotTable(runId)` | Populate `RunSlotExpectation` from `SlotMaterialMapping` |
| `verifyLoading(input)` | Resolve `RunSlotExpectation`, compare expected/alternates, update slot state + expectation, create `LoadingRecord` |
| `unlockSlot(slotId, by, reason)` | Manual unlock |
| `getRunLoadingRecords(runNo)` | Get loading records for run |
| `getRunLoadingExpectations(runNo)` | Get run-level slot expectations |
| `getFeederSlots(lineId)` | Get feeder slots for line |

### 2.3 Locking Logic (M1)

```
On FAIL:
  failedAttempts++
  if failedAttempts >= 3:
    isLocked = true
    lockedAt = now
    lockedReason = "3 consecutive failures"
  → Return FAIL with failReason

On PASS:
  failedAttempts = 0
  currentMaterialLotId = scannedLot
  → Update RunSlotExpectation.status = LOADED
  → Create LoadingRecord with verifyResult = PASS

If slot.isLocked:
  → Reject with SLOT_LOCKED, require manual unlock
```

### 2.4 API Endpoints

| Endpoint | Method | Permission |
|----------|--------|------------|
| `/loading/verify` | POST | `loading:verify` |
| `/runs/{runNo}/loading` | GET | `loading:view` |
| `/runs/{runNo}/loading/expectations` | GET | `loading:view` |
| `/runs/{runNo}/loading/load-table` | POST | `loading:verify` |
| `/lines/{lineId}/feeder-slots` | GET | `loading:view` |
| `/feeder-slots/{slotId}/unlock` | POST | `loading:config` |

---

## Phase 3: Integration Endpoints (P1)

**New files**:
- `apps/server/src/modules/mes/integration/stencil-service.ts`
- `apps/server/src/modules/mes/integration/solder-paste-service.ts`

**Modify**:
- `apps/server/src/modules/mes/integration/routes.ts`
- `apps/server/src/modules/mes/integration/schema.ts`

### 3.1 Status Endpoints

| Endpoint | Body Fields |
|----------|-------------|
| `POST /integration/stencil-status` | eventId, eventTime, stencilId, version, status, tensionValue, lastCleanedAt, source, operatorId |
| `POST /integration/solder-paste-status` | eventId, eventTime, lotId, status, expiresAt, thawedAt, stirredAt, source, operatorId |

### 3.2 Binding Endpoints

| Endpoint | Method | Permission |
|----------|--------|------------|
| `/lines/{lineId}/stencil/bind` | POST | `loading:config` |
| `/lines/{lineId}/stencil/unbind` | POST | `loading:config` |
| `/lines/{lineId}/solder-paste/bind` | POST | `loading:config` |
| `/lines/{lineId}/solder-paste/unbind` | POST | `loading:config` |

### 3.3 IntegrationMessage Audit Log (2.6.1)

- Write `IntegrationMessage` entries for inbound stencil/solder status (direction=IN, system=TPM/WMS, entityType=STENCIL_STATUS/SOLDER_PASTE_STATUS).
- Use `dedupeKey = eventId` for idempotency tracking and store the raw payload for audit.

### 3.4 Service Logic

- Check `eventId` exists → return existing record (idempotent)
- Validate input, create record
- Store in StencilStatusRecord / SolderPasteStatusRecord
- Allow manual fallback (`source: MANUAL`); require `operatorId` when manual
- Permission: `system:integration`

---

## Phase 4: Readiness Check Integration (P1)

**Modify**: `apps/server/src/modules/mes/readiness/service.ts`

### 4.1 New Check Functions

```typescript
// Query LineStencil → StencilStatusRecord, verify READY
checkStencil(run) → CheckItemResult[]

// Query LineSolderPaste → SolderPasteStatusRecord, verify COMPLIANT
checkSolderPaste(run) → CheckItemResult[]

// Query RunSlotExpectation, verify all slots LOADED
checkLoading(run) → CheckItemResult[]
```

### 4.2 Update performCheck

Add new checks to the parallel execution, respecting `Line.meta.readinessChecks.enabled`.

### 4.3 Gate Behavior (2.4.11)

`authorizeRun` already calls readiness checks; once `checkLoading` is added and enabled per line, authorization is blocked until loading passes.

---

## Phase 5: Permissions (P1)

**Modify**: `packages/db/src/permissions/permissions.ts`

```typescript
// Add to Permission object
LOADING_VIEW: "loading:view",
LOADING_VERIFY: "loading:verify",
LOADING_CONFIG: "loading:config",

// Add to PERMISSION_GROUPS
loading: {
  label: "上料管理",
  permissions: [
    { value: Permission.LOADING_VIEW, label: "查看上料记录" },
    { value: Permission.LOADING_VERIFY, label: "执行上料验证" },
    { value: Permission.LOADING_CONFIG, label: "管理站位配置" },
  ],
},
```

---

## Phase 6: Configuration APIs (P2)

### 6.1 Feeder Slot Config

| Endpoint | Method | Permission |
|----------|--------|------------|
| `/lines/{lineId}/feeder-slots` | POST | `loading:config` |
| `/lines/{lineId}/feeder-slots/{slotId}` | PUT | `loading:config` |
| `/lines/{lineId}/feeder-slots/{slotId}` | DELETE | `loading:config` |

### 6.2 Slot Material Mapping Config

| Endpoint | Method | Permission |
|----------|--------|------------|
| `/slot-mappings` | GET | `loading:view` |
| `/slot-mappings` | POST | `loading:config` |
| `/slot-mappings/{id}` | PUT | `loading:config` |
| `/slot-mappings/{id}` | DELETE | `loading:config` |

---

## Phase 7: Acceptance Scenarios (P2)

**File**: `domain_docs/mes/tests/01_acceptance_scenarios.md`

Add the following scenarios:

### Loading Verification
- **Scenario 8**: Loading verification - happy path (correct material → PASS)
- **Scenario 9**: Loading verification - mismatch (wrong material → FAIL)
- **Scenario 10**: Slot locking after 3 consecutive failures
- **Scenario 11**: Loading readiness gate (block authorization until loading complete)

### Stencil Integration
- **Scenario 12**: Stencil status integration - auto mode (TPM → MES)
- **Scenario 13**: Stencil readiness - not ready (block on MAINTENANCE status)

### Solder Paste Integration
- **Scenario 14**: Solder paste status integration (WMS → MES)
- **Scenario 15**: Solder paste - expired (block on EXPIRED status)
- **Scenario 16**: Manual fallback mode (source: MANUAL + operatorId)

---

## Phase 8: UI (Deferred)

> **Decision**: Backend APIs only. UI deferred to separate task.

- Deferred UI tasks:
  - 2.4.13 上料防错执行页（扫码界面）
  - 2.4.14 上料记录查看（Run 详情页标签）
  - 2.4.15 站位表配置页（可选）

---

## Parallelization Plan

### Dependency Graph (ASCII)

```
Phase 1: Schema (must finish first)
  |--> Group A: Loading + Config APIs
  |--> Group B: Integration + Binding APIs
  |--> Group C: Permissions + Scenarios
  \--> Phase 4: Readiness (after Group A + Group B)
```

### Group A: Loading Mainline

| Task | Content |
|------|---------|
| Phase 2.1 | `loading/schema.ts` - request/response schemas (Elysia.t) |
| Phase 2.2 | `loading/service.ts` - loadSlotTable, verifyLoading, unlockSlot |
| Phase 2.3 | `loading/routes.ts` - verify + query APIs |
| Phase 6.1 | FeederSlot CRUD APIs |
| Phase 6.2 | SlotMaterialMapping CRUD APIs |

### Group B: Integration Mainline

| Task | Content |
|------|---------|
| Phase 3.1 | `stencil-service.ts` - stencil status receive |
| Phase 3.2 | `solder-paste-service.ts` - solder paste status receive |
| Phase 3.3 | Integration routes + schema updates |
| Phase 3.4 | Binding APIs (`/lines/{lineId}/stencil/bind` etc.) |

### Group C: Cross-Cutting (parallel anytime)

| Task | Content | Notes |
|------|---------|-------|
| Phase 5 | Permissions config | Can start after Phase 1 |
| Phase 7 | Acceptance scenarios | Documentation-only |

### Merge Point: Phase 4 Readiness

| Task | Content |
|------|---------|
| 4.1 | checkStencil() - needs LineStencil + StencilStatusRecord |
| 4.2 | checkSolderPaste() - needs LineSolderPaste + SolderPasteStatusRecord |
| 4.3 | checkLoading() - needs RunSlotExpectation |
| 4.4 | update performCheck() |

### Timeline (Suggested)

Day 1: Phase 1 Schema
Day 2-3: Group A + Group B in parallel, Group C interleaved
Day 4: Phase 4 Readiness (merge point)

---

## Progress

### Phase 1 - Schema
- [x] Added enums and models to `packages/db/prisma/schema/schema.prisma`

### Group A - Loading Mainline
- [x] Phase 2.1: `loading/schema.ts`
- [x] Phase 2.2: `loading/service.ts`
- [x] Phase 2.3: `loading/routes.ts`
- [x] Phase 6.1: FeederSlot CRUD APIs
- [x] Phase 6.2: SlotMaterialMapping CRUD APIs

### Group C - Permissions & Scenarios
- [x] Phase 5: Permissions config
- [x] Phase 7: Acceptance scenarios

---

## Critical Files

| Category | Path | Action |
|----------|------|--------|
| Schema | `packages/db/prisma/schema/schema.prisma` | Add 8 models + 5 enums + IntegrationMessage review |
| Service | `apps/server/src/modules/mes/loading/service.ts` | Create |
| Routes | `apps/server/src/modules/mes/loading/routes.ts` | Create |
| Schema | `apps/server/src/modules/mes/loading/schema.ts` | Create |
| Integration | `apps/server/src/modules/mes/integration/routes.ts` | Extend |
| Integration | `apps/server/src/modules/mes/integration/schema.ts` | Extend |
| Integration | `apps/server/src/modules/mes/integration/stencil-service.ts` | Create |
| Integration | `apps/server/src/modules/mes/integration/solder-paste-service.ts` | Create |
| Readiness | `apps/server/src/modules/mes/readiness/service.ts` | Extend |
| Permission | `packages/db/src/permissions/permissions.ts` | Extend |
| MES Routes | `apps/server/src/modules/mes/routes.ts` | Register loading module |
| Tests | `domain_docs/mes/tests/01_acceptance_scenarios.md` | Add 9 scenarios |

---

## Implementation Order

1. **Phase 1**: Schema migration (`bun db:migrate`)
2. **Parallel**: Group A (Phase 2 + Phase 6), Group B (Phase 3), Group C (Phase 5 + Phase 7)
3. **Phase 4**: Readiness check extensions (merge point)
4. **Phase 8**: UI deferred (no action in this worktree)

---

## Key Design Decisions

- **Run-Slot Expectations**: `RunSlotExpectation` table stores per-run slot expectations, avoiding multi-run overwrite issues
- **Manual Slot Mapping**: `SlotMaterialMapping` table for manual slot-material configuration (BOM lacks position data)
- **Line Binding**: `LineStencil` and `LineSolderPaste` tables for indirect stencil/solder paste to line association
- **Slot Locking**: Lock after 3 consecutive failures, require manual unlock via `loading:config` permission
- **Readiness Config**: Stored in `Line.meta.readinessChecks.enabled` array
- **Idempotency**: All integration endpoints use `eventId` field (not HTTP header)
- **Manual Fallback**: `source: MANUAL` + `operatorId` for offline mode
- **Audit Trail**: `LoadingRecord` stores both `materialCode` and `expectedCode` for historical audit
