# Database Design (Prisma Schema)

Below is the complete `schema.prisma` designed for the MES domain, supporting production execution, data collection, and traceability.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum WorkOrderStatus {
  RECEIVED
  RELEASED
  IN_PROGRESS
  COMPLETED
  CLOSED
  CANCELLED
}

enum RunStatus {
  PREP
  FAI_PENDING
  AUTHORIZED
  RUNNING
  FINISHING
  ARCHIVED
  CANCELLED
}

enum StationType {
  MANUAL
  AUTO
  BATCH
  TEST
}

enum UnitStatus {
  QUEUED
  IN_STATION
  OUT_PASSED
  OUT_FAILED
  REWORK
  HOLD
  SCRAPPED
  DONE
}

enum TrackResult {
  PASS
  FAIL
}

enum TrackSource {
  MANUAL
  AUTO
  BATCH
  TEST
}

enum InspectionType {
  FAI
  IPQC
  FQC
  OQC
}

enum InspectionStatus {
  PENDING
  INSPECTING
  PASS
  FAIL
  CANCELLED
}

enum DispositionType {
  REWORK
  SCRAP
  HOLD
}

enum AuditEntityType {
  WORK_ORDER
  RUN
  UNIT
  TRACK
  INSPECTION
  DEFECT
  DISPOSITION
  DATA_VALUE
  MATERIAL_USE
  INTEGRATION
}

model WorkOrder {
  id            String          @id @default(cuid())
  woNo          String          @unique
  productCode   String
  plannedQty    Int
  routingId     String?
  status        WorkOrderStatus @default(RECEIVED)
  reviewStatus  String?         // e.g. "REVIEWED" | "UNREVIEWED"
  dueDate       DateTime?
  meta          Json?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  routing       Routing?        @relation(fields: [routingId], references: [id])
  runs          Run[]
  units         Unit[]
}

model Run {
  id            String     @id @default(cuid())
  runNo         String     @unique
  woId          String
  lineId        String?
  status        RunStatus  @default(PREP)
  shiftCode     String?
  changeoverNo  String?    // 换线/开班标识
  startedAt     DateTime?
  endedAt       DateTime?
  meta          Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  workOrder     WorkOrder  @relation(fields: [woId], references: [id])
  line          Line?      @relation(fields: [lineId], references: [id])
  prepChecks    PrepCheck[]
  inspections   Inspection[]  // 用 Inspection 统一承载 FAI/IPQC/FQC/OQC
  authorizations Authorization[]
  units         Unit[]
}

model Line {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  meta      Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stations  Station[]
  runs      Run[]
}

model StationGroup {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  meta      Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stations  Station[]
}

model Station {
  id            String      @id @default(cuid())
  code          String      @unique
  name          String
  lineId        String?
  groupId       String?
  stationType   StationType // 站点实际类型
  meta          Json?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  line          Line?       @relation(fields: [lineId], references: [id])
  group         StationGroup? @relation(fields: [groupId], references: [id])
  tracks        Track[]
}

model Operation {
  id            String      @id @default(cuid())
  code          String      @unique
  name          String
  defaultType   StationType
  isKeyQuality  Boolean     @default(false)
  meta          Json?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  steps         RoutingStep[]
  dcSpecs       DataCollectionSpec[]
}

model Routing {
  id          String        @id @default(cuid())
  code        String        @unique // routing code/version identifier
  name        String
  productCode String?
  version     String?
  isActive    Boolean       @default(true)
  meta        Json?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  steps       RoutingStep[]
  workOrders  WorkOrder[]
}

model RoutingStep {
  id            String      @id @default(cuid())
  routingId     String
  stepNo        Int
  operationId   String
  stationGroupId String?
  stationType   StationType // 推荐执行方式
  isLast        Boolean     @default(false)
  requiresFAI   Boolean     @default(false)
  meta          Json?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  routing       Routing     @relation(fields: [routingId], references: [id])
  operation     Operation   @relation(fields: [operationId], references: [id])
  stationGroup  StationGroup? @relation(fields: [stationGroupId], references: [id])

  @@unique([routingId, stepNo])
  @@index([routingId])
}

model Unit {
  id            String     @id @default(cuid())
  sn            String     @unique
  woId          String
  runId         String?
  status        UnitStatus @default(QUEUED)
  currentStepNo Int        @default(1)
  meta          Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  workOrder     WorkOrder  @relation(fields: [woId], references: [id])
  run           Run?       @relation(fields: [runId], references: [id])
  tracks        Track[]
  defects       Defect[]
  materialUses  MaterialUse[]
  traceSnapshot TraceSnapshot?
}

model Carrier {
  id          String   @id @default(cuid())
  carrierNo   String   @unique
  type        String   // e.g. "REFLOW_LOT" | "RACK" | "TRAY"
  status      String
  meta        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  loads       CarrierLoad[]
  tracks      CarrierTrack[]
}

model CarrierLoad {
  id        String   @id @default(cuid())
  carrierId String
  unitId    String
  loadedAt  DateTime @default(now())
  unloadedAt DateTime?
  meta      Json?

  carrier   Carrier  @relation(fields: [carrierId], references: [id])
  unit      Unit     @relation(fields: [unitId], references: [id])

  @@unique([carrierId, unitId, loadedAt])
  @@index([carrierId])
  @@index([unitId])
}

model Track {
  id          String      @id @default(cuid())
  unitId      String
  stepNo      Int
  stationId   String?
  source      TrackSource
  inAt        DateTime?
  outAt       DateTime?
  result      TrackResult?
  operatorId  String?
  meta        Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  unit        Unit        @relation(fields: [unitId], references: [id])
  station     Station?    @relation(fields: [stationId], references: [id])
  dataValues  DataValue[]
  defects     Defect[]

  @@index([unitId, stepNo])
  @@index([stationId])
}

model CarrierTrack {
  id          String      @id @default(cuid())
  carrierId   String
  stepNo      Int
  stationId   String?
  source      TrackSource @default(BATCH)
  inAt        DateTime?
  outAt       DateTime?
  result      TrackResult?
  meta        Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  carrier     Carrier     @relation(fields: [carrierId], references: [id])
  station     Station?    @relation(fields: [stationId], references: [id])
  dataValues  DataValue[]

  @@index([carrierId, stepNo])
}

model PrepCheck {
  id        String   @id @default(cuid())
  runId     String
  type      String   // EQUIP/MATERIAL/DOC/QUALIFICATION/...
  status    String   // PASS/FAIL
  remark    String?
  meta      Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  run       Run      @relation(fields: [runId], references: [id])

  @@index([runId, type])
}

model Inspection {
  id        String           @id @default(cuid())
  runId     String
  type      InspectionType
  status    InspectionStatus @default(PENDING)
  data      Json?
  decidedBy String?
  decidedAt DateTime?
  remark    String?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  run       Run              @relation(fields: [runId], references: [id])

  @@index([runId, type])
}

model Authorization {
  id          String   @id @default(cuid())
  runId       String
  status      String   // AUTHORIZED/REVOKED
  authorizedBy String?
  authorizedAt DateTime?
  revokedAt   DateTime?
  meta        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  run         Run      @relation(fields: [runId], references: [id])

  @@index([runId])
}

model DataCollectionSpec {
  id           String   @id @default(cuid())
  operationId  String
  name         String
  itemType     String   // KEY/OBSERVATION
  dataType     String   // NUMBER/TEXT/BOOLEAN/JSON
  method       String   // AUTO/MANUAL
  triggerType  String   // EVENT/TIME/EACH_UNIT/EACH_CARRIER
  triggerRule  Json?
  spec         Json?
  alarm        Json?
  isRequired   Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  operation    Operation @relation(fields: [operationId], references: [id])
  dataValues   DataValue[]

  @@index([operationId])
}

model DataValue {
  id            String   @id @default(cuid())
  specId        String
  trackId       String?
  carrierTrackId String?
  collectedAt   DateTime @default(now())
  valueNumber   Float?
  valueText     String?
  valueJson     Json?
  judge         String?  // PASS/FAIL/NA
  alarmed       Boolean  @default(false)
  source        TrackSource
  meta          Json?

  spec          DataCollectionSpec @relation(fields: [specId], references: [id])
  track         Track?             @relation(fields: [trackId], references: [id])
  carrierTrack  CarrierTrack?      @relation(fields: [carrierTrackId], references: [id])

  @@index([specId])
  @@index([trackId])
  @@index([carrierTrackId])
}

model Defect {
  id          String   @id @default(cuid())
  unitId      String
  trackId     String?
  code        String
  location    String?
  qty         Int      @default(1)
  status      String   // RECORDED/DISPOSITIONED/CLOSED
  meta        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  unit        Unit     @relation(fields: [unitId], references: [id])
  track       Track?   @relation(fields: [trackId], references: [id])
  disposition Disposition?

  @@index([unitId])
  @@index([code])
}

model Disposition {
  id          String          @id @default(cuid())
  defectId    String          @unique
  type        DispositionType
  decidedBy   String?
  decidedAt   DateTime?
  reason      String?
  meta        Json?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  defect      Defect          @relation(fields: [defectId], references: [id])
  reworkTask  ReworkTask?
}

model ReworkTask {
  id          String   @id @default(cuid())
  dispositionId String @unique
  unitId      String
  fromStepNo  Int
  toStepNo    Int
  status      String   // OPEN/DONE/CANCELLED
  doneBy      String?
  doneAt      DateTime?
  remark      String?
  meta        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  disposition Disposition @relation(fields: [dispositionId], references: [id])
  unit        Unit        @relation(fields: [unitId], references: [id])

  @@index([unitId])
}

model MaterialLot {
  id           String   @id @default(cuid())
  materialCode String
  lotNo        String
  supplier     String?
  iqcResult    String?
  iqcDate      DateTime?
  meta         Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  materialUses MaterialUse[]

  @@unique([materialCode, lotNo])
  @@index([materialCode])
}

model MaterialUse {
  id          String   @id @default(cuid())
  unitId      String
  materialLotId String
  position    String?
  isKeyPart   Boolean  @default(false)
  meta        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  unit        Unit       @relation(fields: [unitId], references: [id])
  materialLot MaterialLot @relation(fields: [materialLotId], references: [id])

  @@index([unitId])
  @@index([materialLotId])
  @@index([position])
}

model TraceSnapshot {
  id          String   @id @default(cuid())
  unitId      String   @unique
  snapshot    Json
  generatedAt DateTime @default(now())

  unit        Unit     @relation(fields: [unitId], references: [id])
}

model AuditEvent {
  id          String         @id @default(cuid())
  entityType  AuditEntityType
  entityId    String
  eventType   String
  actorId     String?
  stationId   String?
  at          DateTime       @default(now())
  idempotencyKey String?
  payload     Json?

  @@index([entityType, entityId])
  @@index([idempotencyKey])
}

model IntegrationMessage {
  id          String   @id @default(cuid())
  direction   String   // IN/OUT
  system      String   // ERP/APS/TEST/EQUIP/...
  businessKey String
  status      String   // NEW/SUCCESS/FAILED/RETRYING
  payload     Json
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([direction, system])
  @@index([businessKey])
}
```
