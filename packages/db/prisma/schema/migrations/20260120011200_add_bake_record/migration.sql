-- CreateTable
CREATE TABLE "BakeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
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
    CONSTRAINT "BakeRecord_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BakeRecord_runId_idx" ON "BakeRecord"("runId");

-- CreateIndex
CREATE INDEX "BakeRecord_materialLotId_idx" ON "BakeRecord"("materialLotId");

-- CreateIndex
CREATE INDEX "BakeRecord_itemCode_idx" ON "BakeRecord"("itemCode");

-- CreateIndex
CREATE INDEX "BakeRecord_inAt_idx" ON "BakeRecord"("inAt");

-- CreateIndex
CREATE INDEX "BakeRecord_outAt_idx" ON "BakeRecord"("outAt");
