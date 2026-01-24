-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityDisplay" TEXT,
    "maintenanceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "partsReplaced" TEXT,
    "cost" REAL,
    "reportedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "reportedBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "completedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ingest_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT,
    "runNo" TEXT,
    "unitId" TEXT,
    "stationCode" TEXT,
    "lineCode" TEXT,
    "carrierCode" TEXT,
    "sn" TEXT,
    "snList" JSONB,
    "result" TEXT,
    "testResultId" TEXT,
    "payload" JSONB NOT NULL,
    "normalized" JSONB,
    "meta" JSONB,
    CONSTRAINT "ingest_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ingest_events_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MaintenanceRecord_lineId_idx" ON "MaintenanceRecord"("lineId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_entityType_entityId_idx" ON "MaintenanceRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_status_idx" ON "MaintenanceRecord"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_reportedAt_idx" ON "MaintenanceRecord"("reportedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_completedAt_idx" ON "MaintenanceRecord"("completedAt");

-- CreateIndex
CREATE INDEX "ingest_events_eventType_occurredAt_idx" ON "ingest_events"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "ingest_events_runId_idx" ON "ingest_events"("runId");

-- CreateIndex
CREATE INDEX "ingest_events_runNo_idx" ON "ingest_events"("runNo");

-- CreateIndex
CREATE INDEX "ingest_events_unitId_idx" ON "ingest_events"("unitId");

-- CreateIndex
CREATE INDEX "ingest_events_sn_idx" ON "ingest_events"("sn");

-- CreateIndex
CREATE INDEX "ingest_events_stationCode_idx" ON "ingest_events"("stationCode");

-- CreateIndex
CREATE INDEX "ingest_events_lineCode_idx" ON "ingest_events"("lineCode");

-- CreateIndex
CREATE INDEX "ingest_events_carrierCode_idx" ON "ingest_events"("carrierCode");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_events_sourceSystem_dedupeKey_key" ON "ingest_events"("sourceSystem", "dedupeKey");
