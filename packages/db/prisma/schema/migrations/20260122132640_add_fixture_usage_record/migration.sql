-- CreateTable
CREATE TABLE "FixtureUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "lineId" TEXT,
    "recordDate" DATETIME NOT NULL,
    "usageCount" INTEGER,
    "totalUsageCount" INTEGER,
    "usedBy" TEXT,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "lifeLimit" INTEGER,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FixtureUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReflowProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "zoneConfig" JSONB,
    "peakTempMin" REAL,
    "peakTempMax" REAL,
    "totalTimeMin" INTEGER,
    "totalTimeMax" INTEGER,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReflowProfileUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "runId" TEXT,
    "lineId" TEXT,
    "equipmentId" TEXT,
    "actualProgramName" TEXT NOT NULL,
    "actualPeakTemp" REAL,
    "actualTotalTime" INTEGER,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "mismatchReason" TEXT,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReflowProfileUsage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReflowProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoutingStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routingId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "sourceStepKey" TEXT,
    "operationId" TEXT NOT NULL,
    "stationGroupId" TEXT,
    "stationType" TEXT NOT NULL,
    "isLast" BOOLEAN NOT NULL DEFAULT false,
    "requiresFAI" BOOLEAN NOT NULL DEFAULT false,
    "expectedReflowProfileId" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoutingStep_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoutingStep_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoutingStep_stationGroupId_fkey" FOREIGN KEY ("stationGroupId") REFERENCES "StationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RoutingStep_expectedReflowProfileId_fkey" FOREIGN KEY ("expectedReflowProfileId") REFERENCES "ReflowProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RoutingStep" ("createdAt", "id", "isLast", "meta", "operationId", "requiresFAI", "routingId", "sourceStepKey", "stationGroupId", "stationType", "stepNo", "updatedAt") SELECT "createdAt", "id", "isLast", "meta", "operationId", "requiresFAI", "routingId", "sourceStepKey", "stationGroupId", "stationType", "stepNo", "updatedAt" FROM "RoutingStep";
DROP TABLE "RoutingStep";
ALTER TABLE "new_RoutingStep" RENAME TO "RoutingStep";
CREATE INDEX "RoutingStep_routingId_idx" ON "RoutingStep"("routingId");
CREATE INDEX "RoutingStep_sourceStepKey_idx" ON "RoutingStep"("sourceStepKey");
CREATE UNIQUE INDEX "RoutingStep_routingId_stepNo_key" ON "RoutingStep"("routingId", "stepNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FixtureUsageRecord_fixtureId_idx" ON "FixtureUsageRecord"("fixtureId");

-- CreateIndex
CREATE INDEX "FixtureUsageRecord_lineId_idx" ON "FixtureUsageRecord"("lineId");

-- CreateIndex
CREATE INDEX "FixtureUsageRecord_recordDate_idx" ON "FixtureUsageRecord"("recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReflowProfile_code_key" ON "ReflowProfile"("code");

-- CreateIndex
CREATE INDEX "ReflowProfile_status_idx" ON "ReflowProfile"("status");

-- CreateIndex
CREATE INDEX "ReflowProfileUsage_profileId_idx" ON "ReflowProfileUsage"("profileId");

-- CreateIndex
CREATE INDEX "ReflowProfileUsage_runId_idx" ON "ReflowProfileUsage"("runId");

-- CreateIndex
CREATE INDEX "ReflowProfileUsage_lineId_idx" ON "ReflowProfileUsage"("lineId");

-- CreateIndex
CREATE INDEX "ReflowProfileUsage_usedAt_idx" ON "ReflowProfileUsage"("usedAt");
