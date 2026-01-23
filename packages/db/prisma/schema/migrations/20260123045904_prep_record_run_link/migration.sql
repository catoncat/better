-- CreateTable
CREATE TABLE "time_rule_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "warningMinutes" INTEGER,
    "startEvent" TEXT NOT NULL,
    "endEvent" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopeValue" TEXT,
    "requiresWashStep" BOOLEAN NOT NULL DEFAULT false,
    "isWaivable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "time_rule_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "definitionId" TEXT NOT NULL,
    "runId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityDisplay" TEXT,
    "startedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "warningAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completedAt" DATETIME,
    "expiredAt" DATETIME,
    "waivedAt" DATETIME,
    "waivedBy" TEXT,
    "waiveReason" TEXT,
    "readinessItemId" TEXT,
    "warningNotified" BOOLEAN NOT NULL DEFAULT false,
    "expiryNotified" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "time_rule_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "time_rule_definitions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "time_rule_instances_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BakeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "routingStepId" TEXT,
    "materialLotId" TEXT,
    "itemCode" TEXT NOT NULL,
    "bakeProcess" TEXT NOT NULL,
    "bakeQty" TEXT NOT NULL,
    "bakeTemperature" REAL,
    "durationHours" TEXT,
    "inAt" DATETIME NOT NULL,
    "inBy" TEXT NOT NULL,
    "outAt" DATETIME NOT NULL,
    "outBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BakeRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BakeRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BakeRecord_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BakeRecord" ("bakeProcess", "bakeQty", "bakeTemperature", "confirmedBy", "createdAt", "durationHours", "id", "inAt", "inBy", "itemCode", "materialLotId", "meta", "outAt", "outBy", "runId", "updatedAt") SELECT "bakeProcess", "bakeQty", "bakeTemperature", "confirmedBy", "createdAt", "durationHours", "id", "inAt", "inBy", "itemCode", "materialLotId", "meta", "outAt", "outBy", "runId", "updatedAt" FROM "BakeRecord";
DROP TABLE "BakeRecord";
ALTER TABLE "new_BakeRecord" RENAME TO "BakeRecord";
CREATE INDEX "BakeRecord_runId_idx" ON "BakeRecord"("runId");
CREATE INDEX "BakeRecord_routingStepId_idx" ON "BakeRecord"("routingStepId");
CREATE INDEX "BakeRecord_materialLotId_idx" ON "BakeRecord"("materialLotId");
CREATE INDEX "BakeRecord_itemCode_idx" ON "BakeRecord"("itemCode");
CREATE INDEX "BakeRecord_inAt_idx" ON "BakeRecord"("inAt");
CREATE INDEX "BakeRecord_outAt_idx" ON "BakeRecord"("outAt");
CREATE TABLE "new_FixtureUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "lineId" TEXT,
    "runId" TEXT,
    "routingStepId" TEXT,
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
    CONSTRAINT "FixtureUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FixtureUsageRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FixtureUsageRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FixtureUsageRecord" ("confirmedBy", "createdAt", "fixtureId", "id", "lifeLimit", "lineId", "meta", "recordDate", "remark", "totalUsageCount", "updatedAt", "usageCount", "usedBy") SELECT "confirmedBy", "createdAt", "fixtureId", "id", "lifeLimit", "lineId", "meta", "recordDate", "remark", "totalUsageCount", "updatedAt", "usageCount", "usedBy" FROM "FixtureUsageRecord";
DROP TABLE "FixtureUsageRecord";
ALTER TABLE "new_FixtureUsageRecord" RENAME TO "FixtureUsageRecord";
CREATE INDEX "FixtureUsageRecord_fixtureId_idx" ON "FixtureUsageRecord"("fixtureId");
CREATE INDEX "FixtureUsageRecord_lineId_idx" ON "FixtureUsageRecord"("lineId");
CREATE INDEX "FixtureUsageRecord_runId_idx" ON "FixtureUsageRecord"("runId");
CREATE INDEX "FixtureUsageRecord_routingStepId_idx" ON "FixtureUsageRecord"("routingStepId");
CREATE INDEX "FixtureUsageRecord_recordDate_idx" ON "FixtureUsageRecord"("recordDate");
CREATE TABLE "new_SolderPasteUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "lineId" TEXT,
    "runId" TEXT,
    "routingStepId" TEXT,
    "receivedAt" DATETIME,
    "expiresAt" DATETIME,
    "receivedQty" INTEGER,
    "thawedAt" DATETIME,
    "issuedAt" DATETIME,
    "returnedAt" DATETIME,
    "isReturned" BOOLEAN,
    "usedBy" TEXT,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolderPasteUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SolderPasteUsageRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SolderPasteUsageRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SolderPasteUsageRecord" ("createdAt", "expiresAt", "id", "isReturned", "issuedAt", "lineId", "lotId", "meta", "receivedAt", "receivedQty", "remark", "returnedAt", "thawedAt", "updatedAt", "usedBy") SELECT "createdAt", "expiresAt", "id", "isReturned", "issuedAt", "lineId", "lotId", "meta", "receivedAt", "receivedQty", "remark", "returnedAt", "thawedAt", "updatedAt", "usedBy" FROM "SolderPasteUsageRecord";
DROP TABLE "SolderPasteUsageRecord";
ALTER TABLE "new_SolderPasteUsageRecord" RENAME TO "SolderPasteUsageRecord";
CREATE INDEX "SolderPasteUsageRecord_lotId_idx" ON "SolderPasteUsageRecord"("lotId");
CREATE INDEX "SolderPasteUsageRecord_lineId_idx" ON "SolderPasteUsageRecord"("lineId");
CREATE INDEX "SolderPasteUsageRecord_runId_idx" ON "SolderPasteUsageRecord"("runId");
CREATE INDEX "SolderPasteUsageRecord_routingStepId_idx" ON "SolderPasteUsageRecord"("routingStepId");
CREATE INDEX "SolderPasteUsageRecord_receivedAt_idx" ON "SolderPasteUsageRecord"("receivedAt");
CREATE INDEX "SolderPasteUsageRecord_issuedAt_idx" ON "SolderPasteUsageRecord"("issuedAt");
CREATE TABLE "new_SqueegeeUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squeegeeId" TEXT NOT NULL,
    "lineId" TEXT,
    "runId" TEXT,
    "routingStepId" TEXT,
    "recordDate" DATETIME NOT NULL,
    "productModel" TEXT,
    "squeegeeSpec" TEXT,
    "printCount" INTEGER,
    "totalPrintCount" INTEGER,
    "replacedAt" DATETIME,
    "checkSurface" BOOLEAN,
    "checkEdge" BOOLEAN,
    "checkFlatness" BOOLEAN,
    "usedBy" TEXT,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "lifeLimit" INTEGER,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SqueegeeUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SqueegeeUsageRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SqueegeeUsageRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SqueegeeUsageRecord" ("checkEdge", "checkFlatness", "checkSurface", "confirmedBy", "createdAt", "id", "lifeLimit", "lineId", "meta", "printCount", "productModel", "recordDate", "remark", "replacedAt", "squeegeeId", "squeegeeSpec", "totalPrintCount", "updatedAt", "usedBy") SELECT "checkEdge", "checkFlatness", "checkSurface", "confirmedBy", "createdAt", "id", "lifeLimit", "lineId", "meta", "printCount", "productModel", "recordDate", "remark", "replacedAt", "squeegeeId", "squeegeeSpec", "totalPrintCount", "updatedAt", "usedBy" FROM "SqueegeeUsageRecord";
DROP TABLE "SqueegeeUsageRecord";
ALTER TABLE "new_SqueegeeUsageRecord" RENAME TO "SqueegeeUsageRecord";
CREATE INDEX "SqueegeeUsageRecord_squeegeeId_idx" ON "SqueegeeUsageRecord"("squeegeeId");
CREATE INDEX "SqueegeeUsageRecord_lineId_idx" ON "SqueegeeUsageRecord"("lineId");
CREATE INDEX "SqueegeeUsageRecord_runId_idx" ON "SqueegeeUsageRecord"("runId");
CREATE INDEX "SqueegeeUsageRecord_routingStepId_idx" ON "SqueegeeUsageRecord"("routingStepId");
CREATE INDEX "SqueegeeUsageRecord_recordDate_idx" ON "SqueegeeUsageRecord"("recordDate");
CREATE TABLE "new_StencilCleaningRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stencilId" TEXT NOT NULL,
    "lineId" TEXT,
    "runId" TEXT,
    "routingStepId" TEXT,
    "cleanedAt" DATETIME NOT NULL,
    "cleanedBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StencilCleaningRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StencilCleaningRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StencilCleaningRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StencilCleaningRecord" ("cleanedAt", "cleanedBy", "confirmedBy", "createdAt", "id", "lineId", "meta", "remark", "stencilId", "updatedAt") SELECT "cleanedAt", "cleanedBy", "confirmedBy", "createdAt", "id", "lineId", "meta", "remark", "stencilId", "updatedAt" FROM "StencilCleaningRecord";
DROP TABLE "StencilCleaningRecord";
ALTER TABLE "new_StencilCleaningRecord" RENAME TO "StencilCleaningRecord";
CREATE INDEX "StencilCleaningRecord_stencilId_idx" ON "StencilCleaningRecord"("stencilId");
CREATE INDEX "StencilCleaningRecord_lineId_idx" ON "StencilCleaningRecord"("lineId");
CREATE INDEX "StencilCleaningRecord_runId_idx" ON "StencilCleaningRecord"("runId");
CREATE INDEX "StencilCleaningRecord_routingStepId_idx" ON "StencilCleaningRecord"("routingStepId");
CREATE INDEX "StencilCleaningRecord_cleanedAt_idx" ON "StencilCleaningRecord"("cleanedAt");
CREATE TABLE "new_StencilUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stencilId" TEXT NOT NULL,
    "lineId" TEXT,
    "runId" TEXT,
    "routingStepId" TEXT,
    "recordDate" DATETIME NOT NULL,
    "stencilThickness" REAL,
    "productModel" TEXT,
    "printCount" INTEGER,
    "totalPrintCount" INTEGER,
    "replacedAt" DATETIME,
    "checkDeform" BOOLEAN,
    "checkHoleDamage" BOOLEAN,
    "checkSealIntact" BOOLEAN,
    "tensionValues" JSONB,
    "usedBy" TEXT,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "lifeLimit" INTEGER,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StencilUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StencilUsageRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StencilUsageRecord_routingStepId_fkey" FOREIGN KEY ("routingStepId") REFERENCES "RoutingStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StencilUsageRecord" ("checkDeform", "checkHoleDamage", "checkSealIntact", "confirmedBy", "createdAt", "id", "lifeLimit", "lineId", "meta", "printCount", "productModel", "recordDate", "remark", "replacedAt", "stencilId", "stencilThickness", "tensionValues", "totalPrintCount", "updatedAt", "usedBy") SELECT "checkDeform", "checkHoleDamage", "checkSealIntact", "confirmedBy", "createdAt", "id", "lifeLimit", "lineId", "meta", "printCount", "productModel", "recordDate", "remark", "replacedAt", "stencilId", "stencilThickness", "tensionValues", "totalPrintCount", "updatedAt", "usedBy" FROM "StencilUsageRecord";
DROP TABLE "StencilUsageRecord";
ALTER TABLE "new_StencilUsageRecord" RENAME TO "StencilUsageRecord";
CREATE INDEX "StencilUsageRecord_stencilId_idx" ON "StencilUsageRecord"("stencilId");
CREATE INDEX "StencilUsageRecord_lineId_idx" ON "StencilUsageRecord"("lineId");
CREATE INDEX "StencilUsageRecord_runId_idx" ON "StencilUsageRecord"("runId");
CREATE INDEX "StencilUsageRecord_routingStepId_idx" ON "StencilUsageRecord"("routingStepId");
CREATE INDEX "StencilUsageRecord_recordDate_idx" ON "StencilUsageRecord"("recordDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "time_rule_definitions_code_key" ON "time_rule_definitions"("code");

-- CreateIndex
CREATE INDEX "time_rule_instances_status_idx" ON "time_rule_instances"("status");

-- CreateIndex
CREATE INDEX "time_rule_instances_expiresAt_idx" ON "time_rule_instances"("expiresAt");

-- CreateIndex
CREATE INDEX "time_rule_instances_runId_idx" ON "time_rule_instances"("runId");

-- CreateIndex
CREATE INDEX "time_rule_instances_entityType_entityId_idx" ON "time_rule_instances"("entityType", "entityId");
