-- DropIndex
DROP INDEX "DataCollectionSpec_operationId_idx";

-- CreateTable
CREATE TABLE "FeederSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT NOT NULL,
    "slotCode" TEXT NOT NULL,
    "slotName" TEXT,
    "position" INTEGER NOT NULL,
    "currentMaterialLotId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" DATETIME,
    "lockedReason" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeederSlot_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SlotMaterialMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productCode" TEXT,
    "routingId" TEXT,
    "slotId" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isAlternate" BOOLEAN NOT NULL DEFAULT false,
    "unitConsumption" REAL,
    "isCommonMaterial" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SlotMaterialMapping_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "FeederSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SlotMaterialMapping_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunSlotExpectation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "expectedMaterialCode" TEXT NOT NULL,
    "alternates" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loadedMaterialCode" TEXT,
    "loadedAt" DATETIME,
    "loadedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunSlotExpectation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RunSlotExpectation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "FeederSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "runSlotExpectationId" TEXT,
    "materialLotId" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "expectedCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LOADED',
    "verifyResult" TEXT NOT NULL,
    "failReason" TEXT,
    "loadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadedBy" TEXT NOT NULL,
    "packageQty" INTEGER,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "unloadedAt" DATETIME,
    "unloadedBy" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadingRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadingRecord_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "FeederSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadingRecord_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadingRecord_runSlotExpectationId_fkey" FOREIGN KEY ("runSlotExpectationId") REFERENCES "RunSlotExpectation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineStencil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT NOT NULL,
    "stencilId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "boundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boundBy" TEXT,
    "unboundAt" DATETIME,
    "unboundBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LineStencil_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineSolderPaste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "boundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boundBy" TEXT,
    "unboundAt" DATETIME,
    "unboundBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LineSolderPaste_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StencilStatusRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL,
    "stencilId" TEXT NOT NULL,
    "version" TEXT,
    "status" TEXT NOT NULL,
    "tensionValue" REAL,
    "lastCleanedAt" DATETIME,
    "source" TEXT NOT NULL,
    "operatorId" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB
);

-- CreateTable
CREATE TABLE "SolderPasteStatusRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL,
    "lotId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "thawedAt" DATETIME,
    "stirredAt" DATETIME,
    "source" TEXT NOT NULL,
    "operatorId" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB
);

-- CreateTable
CREATE TABLE "OqcSamplingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productCode" TEXT,
    "lineId" TEXT,
    "routingId" TEXT,
    "samplingType" TEXT NOT NULL,
    "sampleValue" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OqcSamplingRule_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OqcSamplingRule_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionResultRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL,
    "runNo" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "unitSn" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "defects" JSONB,
    "rawData" JSONB,
    "source" TEXT NOT NULL,
    "equipmentId" TEXT,
    "operatorId" TEXT,
    "trackId" TEXT,
    "defectIds" JSONB,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runNo" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "lineId" TEXT,
    "routeVersionId" TEXT,
    "planQty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREP',
    "shiftCode" TEXT,
    "changeoverNo" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parentRunId" TEXT,
    "reworkType" TEXT,
    "authorizationType" TEXT,
    "mrbDecisionId" TEXT,
    "mrbAuthorizedBy" TEXT,
    "mrbAuthorizedAt" DATETIME,
    "mrbFaiWaiver" BOOLEAN,
    "mrbWaiverReason" TEXT,
    CONSTRAINT "Run_woId_fkey" FOREIGN KEY ("woId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Run_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "ExecutableRouteVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Run_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("changeoverNo", "createdAt", "endedAt", "id", "lineId", "meta", "planQty", "routeVersionId", "runNo", "shiftCode", "startedAt", "status", "updatedAt", "woId") SELECT "changeoverNo", "createdAt", "endedAt", "id", "lineId", "meta", "planQty", "routeVersionId", "runNo", "shiftCode", "startedAt", "status", "updatedAt", "woId" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE UNIQUE INDEX "Run_runNo_key" ON "Run"("runNo");
CREATE INDEX "Run_parentRunId_idx" ON "Run"("parentRunId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FeederSlot_lineId_idx" ON "FeederSlot"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "FeederSlot_lineId_slotCode_key" ON "FeederSlot"("lineId", "slotCode");

-- CreateIndex
CREATE INDEX "SlotMaterialMapping_productCode_idx" ON "SlotMaterialMapping"("productCode");

-- CreateIndex
CREATE INDEX "SlotMaterialMapping_routingId_idx" ON "SlotMaterialMapping"("routingId");

-- CreateIndex
CREATE INDEX "SlotMaterialMapping_slotId_idx" ON "SlotMaterialMapping"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotMaterialMapping_slotId_materialCode_key" ON "SlotMaterialMapping"("slotId", "materialCode");

-- CreateIndex
CREATE INDEX "RunSlotExpectation_runId_idx" ON "RunSlotExpectation"("runId");

-- CreateIndex
CREATE INDEX "RunSlotExpectation_slotId_idx" ON "RunSlotExpectation"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "RunSlotExpectation_runId_slotId_key" ON "RunSlotExpectation"("runId", "slotId");

-- CreateIndex
CREATE INDEX "LoadingRecord_runId_idx" ON "LoadingRecord"("runId");

-- CreateIndex
CREATE INDEX "LoadingRecord_slotId_idx" ON "LoadingRecord"("slotId");

-- CreateIndex
CREATE INDEX "LoadingRecord_materialLotId_idx" ON "LoadingRecord"("materialLotId");

-- CreateIndex
CREATE INDEX "LoadingRecord_loadedAt_idx" ON "LoadingRecord"("loadedAt");

-- CreateIndex
CREATE INDEX "LineStencil_lineId_isCurrent_idx" ON "LineStencil"("lineId", "isCurrent");

-- CreateIndex
CREATE INDEX "LineStencil_stencilId_idx" ON "LineStencil"("stencilId");

-- CreateIndex
CREATE UNIQUE INDEX "LineStencil_lineId_stencilId_boundAt_key" ON "LineStencil"("lineId", "stencilId", "boundAt");

-- CreateIndex
CREATE INDEX "LineSolderPaste_lineId_isCurrent_idx" ON "LineSolderPaste"("lineId", "isCurrent");

-- CreateIndex
CREATE INDEX "LineSolderPaste_lotId_idx" ON "LineSolderPaste"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "LineSolderPaste_lineId_lotId_boundAt_key" ON "LineSolderPaste"("lineId", "lotId", "boundAt");

-- CreateIndex
CREATE UNIQUE INDEX "StencilStatusRecord_eventId_key" ON "StencilStatusRecord"("eventId");

-- CreateIndex
CREATE INDEX "StencilStatusRecord_stencilId_idx" ON "StencilStatusRecord"("stencilId");

-- CreateIndex
CREATE INDEX "StencilStatusRecord_eventTime_idx" ON "StencilStatusRecord"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "SolderPasteStatusRecord_eventId_key" ON "SolderPasteStatusRecord"("eventId");

-- CreateIndex
CREATE INDEX "SolderPasteStatusRecord_lotId_idx" ON "SolderPasteStatusRecord"("lotId");

-- CreateIndex
CREATE INDEX "SolderPasteStatusRecord_eventTime_idx" ON "SolderPasteStatusRecord"("eventTime");

-- CreateIndex
CREATE INDEX "OqcSamplingRule_productCode_idx" ON "OqcSamplingRule"("productCode");

-- CreateIndex
CREATE INDEX "OqcSamplingRule_lineId_idx" ON "OqcSamplingRule"("lineId");

-- CreateIndex
CREATE INDEX "OqcSamplingRule_routingId_idx" ON "OqcSamplingRule"("routingId");

-- CreateIndex
CREATE INDEX "OqcSamplingRule_isActive_priority_idx" ON "OqcSamplingRule"("isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionResultRecord_eventId_key" ON "InspectionResultRecord"("eventId");

-- CreateIndex
CREATE INDEX "InspectionResultRecord_runNo_idx" ON "InspectionResultRecord"("runNo");

-- CreateIndex
CREATE INDEX "InspectionResultRecord_unitSn_idx" ON "InspectionResultRecord"("unitSn");

-- CreateIndex
CREATE INDEX "InspectionResultRecord_stationCode_idx" ON "InspectionResultRecord"("stationCode");

-- CreateIndex
CREATE INDEX "InspectionResultRecord_eventTime_idx" ON "InspectionResultRecord"("eventTime");

-- CreateIndex
CREATE INDEX "InspectionResultRecord_inspectionType_result_idx" ON "InspectionResultRecord"("inspectionType", "result");

-- CreateIndex
CREATE INDEX "DataCollectionSpec_operationId_isActive_idx" ON "DataCollectionSpec"("operationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DataCollectionSpec_operationId_name_key" ON "DataCollectionSpec"("operationId", "name");
