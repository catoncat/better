-- CreateTable
CREATE TABLE IF NOT EXISTS "ReadinessCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedBy" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadinessCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReadinessCheckItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failReason" TEXT,
    "evidenceJson" JSONB,
    "waivedAt" DATETIME,
    "waivedBy" TEXT,
    "waiveReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadinessCheckItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ReadinessCheck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheck_runId_idx" ON "ReadinessCheck"("runId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheck_type_status_idx" ON "ReadinessCheck"("type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheckItem_checkId_idx" ON "ReadinessCheckItem"("checkId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheckItem_itemType_status_idx" ON "ReadinessCheckItem"("itemType", "status");
