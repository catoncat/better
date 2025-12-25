-- AlterTable
ALTER TABLE "RoutingStep" ADD COLUMN "sourceStepKey" TEXT;

-- CreateTable
CREATE TABLE "OperationMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceProcessKey" TEXT NOT NULL,
    "sourceProcessName" TEXT,
    "operationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationMapping_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkCenterStationGroupMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceWorkCenter" TEXT,
    "sourceDepartment" TEXT,
    "stationGroupId" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkCenterStationGroupMapping_stationGroupId_fkey" FOREIGN KEY ("stationGroupId") REFERENCES "StationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteExecutionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routingId" TEXT,
    "routingStepId" TEXT,
    "sourceStepKey" TEXT,
    "operationId" TEXT,
    "stationType" TEXT,
    "stationGroupId" TEXT,
    "allowedStationIds" JSONB,
    "requiresFAI" BOOLEAN,
    "requiresAuthorization" BOOLEAN,
    "dataSpecIds" JSONB,
    "ingestMapping" JSONB,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RouteExecutionConfig_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RouteExecutionConfig_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RouteExecutionConfig_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RouteExecutionConfig_stationGroupId_fkey" FOREIGN KEY ("stationGroupId") REFERENCES "StationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutableRouteVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routingId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "errorsJson" JSONB,
    "compiledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExecutableRouteVersion_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErpRouteHeaderRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "headId" TEXT,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ErpRouteLineRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "lineNo" INTEGER,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntegrationSyncCursor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "lastSyncAt" DATETIME,
    "lastSeq" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntegrationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "businessKey" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_IntegrationMessage" ("businessKey", "createdAt", "direction", "error", "id", "payload", "status", "system", "updatedAt") SELECT "businessKey", "createdAt", "direction", "error", "id", "payload", "status", "system", "updatedAt" FROM "IntegrationMessage";
DROP TABLE "IntegrationMessage";
ALTER TABLE "new_IntegrationMessage" RENAME TO "IntegrationMessage";
CREATE INDEX "IntegrationMessage_direction_system_idx" ON "IntegrationMessage"("direction", "system");
CREATE INDEX "IntegrationMessage_system_entityType_idx" ON "IntegrationMessage"("system", "entityType");
CREATE INDEX "IntegrationMessage_businessKey_idx" ON "IntegrationMessage"("businessKey");
CREATE INDEX "IntegrationMessage_dedupeKey_idx" ON "IntegrationMessage"("dedupeKey");
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'MES',
    "sourceKey" TEXT,
    "productCode" TEXT,
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routing" ("code", "createdAt", "id", "isActive", "meta", "name", "productCode", "updatedAt", "version") SELECT "code", "createdAt", "id", "isActive", "meta", "name", "productCode", "updatedAt", "version" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_code_key" ON "Routing"("code");
CREATE INDEX "Routing_sourceSystem_sourceKey_idx" ON "Routing"("sourceSystem", "sourceKey");
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runNo" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "lineId" TEXT,
    "routeVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREP',
    "shiftCode" TEXT,
    "changeoverNo" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_woId_fkey" FOREIGN KEY ("woId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Run_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "ExecutableRouteVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("changeoverNo", "createdAt", "endedAt", "id", "lineId", "meta", "runNo", "shiftCode", "startedAt", "status", "updatedAt", "woId") SELECT "changeoverNo", "createdAt", "endedAt", "id", "lineId", "meta", "runNo", "shiftCode", "startedAt", "status", "updatedAt", "woId" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE UNIQUE INDEX "Run_runNo_key" ON "Run"("runNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OperationMapping_operationId_idx" ON "OperationMapping"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationMapping_sourceSystem_sourceProcessKey_key" ON "OperationMapping"("sourceSystem", "sourceProcessKey");

-- CreateIndex
CREATE INDEX "WorkCenterStationGroupMapping_sourceSystem_sourceWorkCenter_idx" ON "WorkCenterStationGroupMapping"("sourceSystem", "sourceWorkCenter");

-- CreateIndex
CREATE INDEX "WorkCenterStationGroupMapping_sourceSystem_sourceDepartment_idx" ON "WorkCenterStationGroupMapping"("sourceSystem", "sourceDepartment");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenterStationGroupMapping_sourceSystem_sourceWorkCenter_sourceDepartment_key" ON "WorkCenterStationGroupMapping"("sourceSystem", "sourceWorkCenter", "sourceDepartment");

-- CreateIndex
CREATE INDEX "RouteExecutionConfig_routingId_idx" ON "RouteExecutionConfig"("routingId");

-- CreateIndex
CREATE INDEX "RouteExecutionConfig_routingStepId_idx" ON "RouteExecutionConfig"("routingStepId");

-- CreateIndex
CREATE INDEX "RouteExecutionConfig_sourceStepKey_idx" ON "RouteExecutionConfig"("sourceStepKey");

-- CreateIndex
CREATE INDEX "RouteExecutionConfig_operationId_idx" ON "RouteExecutionConfig"("operationId");

-- CreateIndex
CREATE INDEX "ExecutableRouteVersion_routingId_idx" ON "ExecutableRouteVersion"("routingId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutableRouteVersion_routingId_versionNo_key" ON "ExecutableRouteVersion"("routingId", "versionNo");

-- CreateIndex
CREATE INDEX "ErpRouteHeaderRaw_sourceSystem_sourceKey_idx" ON "ErpRouteHeaderRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX "ErpRouteHeaderRaw_dedupeKey_idx" ON "ErpRouteHeaderRaw"("dedupeKey");

-- CreateIndex
CREATE INDEX "ErpRouteLineRaw_sourceSystem_sourceKey_idx" ON "ErpRouteLineRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX "ErpRouteLineRaw_dedupeKey_idx" ON "ErpRouteLineRaw"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncCursor_sourceSystem_entityType_key" ON "IntegrationSyncCursor"("sourceSystem", "entityType");

-- CreateIndex
CREATE INDEX "RoutingStep_sourceStepKey_idx" ON "RoutingStep"("sourceStepKey");
