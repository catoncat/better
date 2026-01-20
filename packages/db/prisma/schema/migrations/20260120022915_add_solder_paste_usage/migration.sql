-- CreateTable
CREATE TABLE "SolderPasteUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "lineId" TEXT,
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
    CONSTRAINT "SolderPasteUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ColdStorageTemperatureRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "measuredAt" DATETIME NOT NULL,
    "temperature" REAL NOT NULL,
    "measuredBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SolderPasteUsageRecord_lotId_idx" ON "SolderPasteUsageRecord"("lotId");

-- CreateIndex
CREATE INDEX "SolderPasteUsageRecord_lineId_idx" ON "SolderPasteUsageRecord"("lineId");

-- CreateIndex
CREATE INDEX "SolderPasteUsageRecord_receivedAt_idx" ON "SolderPasteUsageRecord"("receivedAt");

-- CreateIndex
CREATE INDEX "SolderPasteUsageRecord_issuedAt_idx" ON "SolderPasteUsageRecord"("issuedAt");

-- CreateIndex
CREATE INDEX "ColdStorageTemperatureRecord_measuredAt_idx" ON "ColdStorageTemperatureRecord"("measuredAt");
