-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "woNo" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "routingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "reviewStatus" TEXT,
    "dueDate" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrder_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runNo" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "lineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREP',
    "shiftCode" TEXT,
    "changeoverNo" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_woId_fkey" FOREIGN KEY ("woId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StationGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lineId" TEXT,
    "groupId" TEXT,
    "stationType" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Station_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Station_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultType" TEXT NOT NULL,
    "isKeyQuality" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Routing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productCode" TEXT,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoutingStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routingId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "operationId" TEXT NOT NULL,
    "stationGroupId" TEXT,
    "stationType" TEXT NOT NULL,
    "isLast" BOOLEAN NOT NULL DEFAULT false,
    "requiresFAI" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoutingStep_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoutingStep_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoutingStep_stationGroupId_fkey" FOREIGN KEY ("stationGroupId") REFERENCES "StationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sn" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "runId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "currentStepNo" INTEGER NOT NULL DEFAULT 1,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unit_woId_fkey" FOREIGN KEY ("woId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Unit_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CarrierLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "loadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unloadedAt" DATETIME,
    "meta" JSONB,
    CONSTRAINT "CarrierLoad_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CarrierLoad_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "stationId" TEXT,
    "source" TEXT NOT NULL,
    "inAt" DATETIME,
    "outAt" DATETIME,
    "result" TEXT,
    "operatorId" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Track_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarrierTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "stationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'BATCH',
    "inAt" DATETIME,
    "outAt" DATETIME,
    "result" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CarrierTrack_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CarrierTrack_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrepCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrepCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "decidedBy" TEXT,
    "decidedAt" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Authorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "authorizedBy" TEXT,
    "authorizedAt" DATETIME,
    "revokedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Authorization_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataCollectionSpec" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerRule" JSONB,
    "spec" JSONB,
    "alarm" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataCollectionSpec_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specId" TEXT NOT NULL,
    "trackId" TEXT,
    "carrierTrackId" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valueNumber" REAL,
    "valueText" TEXT,
    "valueJson" JSONB,
    "judge" TEXT,
    "alarmed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "meta" JSONB,
    CONSTRAINT "DataValue_specId_fkey" FOREIGN KEY ("specId") REFERENCES "DataCollectionSpec" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DataValue_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DataValue_carrierTrackId_fkey" FOREIGN KEY ("carrierTrackId") REFERENCES "CarrierTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "trackId" TEXT,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Defect_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Defect_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Disposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" DATETIME,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Disposition_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReworkTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispositionId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "fromStepNo" INTEGER NOT NULL,
    "toStepNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "doneBy" TEXT,
    "doneAt" DATETIME,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReworkTask_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "Disposition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReworkTask_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialCode" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "supplier" TEXT,
    "iqcResult" TEXT,
    "iqcDate" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MaterialUse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "materialLotId" TEXT NOT NULL,
    "position" TEXT,
    "isKeyPart" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaterialUse_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialUse_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraceSnapshot_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "stationId" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    "payload" JSONB
);

-- CreateTable
CREATE TABLE "IntegrationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "businessKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_woNo_key" ON "WorkOrder"("woNo");

-- CreateIndex
CREATE UNIQUE INDEX "Run_runNo_key" ON "Run"("runNo");

-- CreateIndex
CREATE UNIQUE INDEX "Line_code_key" ON "Line"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StationGroup_code_key" ON "StationGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_code_key" ON "Operation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Routing_code_key" ON "Routing"("code");

-- CreateIndex
CREATE INDEX "RoutingStep_routingId_idx" ON "RoutingStep"("routingId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingStep_routingId_stepNo_key" ON "RoutingStep"("routingId", "stepNo");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_sn_key" ON "Unit"("sn");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_carrierNo_key" ON "Carrier"("carrierNo");

-- CreateIndex
CREATE INDEX "CarrierLoad_carrierId_idx" ON "CarrierLoad"("carrierId");

-- CreateIndex
CREATE INDEX "CarrierLoad_unitId_idx" ON "CarrierLoad"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierLoad_carrierId_unitId_loadedAt_key" ON "CarrierLoad"("carrierId", "unitId", "loadedAt");

-- CreateIndex
CREATE INDEX "Track_unitId_stepNo_idx" ON "Track"("unitId", "stepNo");

-- CreateIndex
CREATE INDEX "Track_stationId_idx" ON "Track"("stationId");

-- CreateIndex
CREATE INDEX "CarrierTrack_carrierId_stepNo_idx" ON "CarrierTrack"("carrierId", "stepNo");

-- CreateIndex
CREATE INDEX "PrepCheck_runId_type_idx" ON "PrepCheck"("runId", "type");

-- CreateIndex
CREATE INDEX "Inspection_runId_type_idx" ON "Inspection"("runId", "type");

-- CreateIndex
CREATE INDEX "Authorization_runId_idx" ON "Authorization"("runId");

-- CreateIndex
CREATE INDEX "DataCollectionSpec_operationId_idx" ON "DataCollectionSpec"("operationId");

-- CreateIndex
CREATE INDEX "DataValue_specId_idx" ON "DataValue"("specId");

-- CreateIndex
CREATE INDEX "DataValue_trackId_idx" ON "DataValue"("trackId");

-- CreateIndex
CREATE INDEX "DataValue_carrierTrackId_idx" ON "DataValue"("carrierTrackId");

-- CreateIndex
CREATE INDEX "Defect_unitId_idx" ON "Defect"("unitId");

-- CreateIndex
CREATE INDEX "Defect_code_idx" ON "Defect"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Disposition_defectId_key" ON "Disposition"("defectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReworkTask_dispositionId_key" ON "ReworkTask"("dispositionId");

-- CreateIndex
CREATE INDEX "ReworkTask_unitId_idx" ON "ReworkTask"("unitId");

-- CreateIndex
CREATE INDEX "MaterialLot_materialCode_idx" ON "MaterialLot"("materialCode");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialLot_materialCode_lotNo_key" ON "MaterialLot"("materialCode", "lotNo");

-- CreateIndex
CREATE INDEX "MaterialUse_unitId_idx" ON "MaterialUse"("unitId");

-- CreateIndex
CREATE INDEX "MaterialUse_materialLotId_idx" ON "MaterialUse"("materialLotId");

-- CreateIndex
CREATE INDEX "MaterialUse_position_idx" ON "MaterialUse"("position");

-- CreateIndex
CREATE UNIQUE INDEX "TraceSnapshot_unitId_key" ON "TraceSnapshot"("unitId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_idempotencyKey_idx" ON "AuditEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IntegrationMessage_direction_system_idx" ON "IntegrationMessage"("direction", "system");

-- CreateIndex
CREATE INDEX "IntegrationMessage_businessKey_idx" ON "IntegrationMessage"("businessKey");
