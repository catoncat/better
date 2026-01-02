-- CreateTable
CREATE TABLE IF NOT EXISTS "ErpWorkOrderRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ErpMaterialRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ErpBomRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ErpWorkCenterRaw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceSystem" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "woNo" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "plannedQty" REAL NOT NULL,
    "routingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "erpStatus" TEXT,
    "erpPickStatus" TEXT,
    "pickStatus" TEXT,
    "dueDate" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrder_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("createdAt", "dueDate", "erpPickStatus", "erpStatus", "id", "meta", "pickStatus", "plannedQty", "productCode", "routingId", "status", "updatedAt", "woNo")
SELECT "createdAt", "dueDate", "erpPickStatus", "erpStatus", "id", "meta", "pickStatus", "plannedQty", "productCode", "routingId", "status", "updatedAt", "woNo" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE UNIQUE INDEX "WorkOrder_woNo_key" ON "WorkOrder"("woNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpWorkOrderRaw_sourceSystem_sourceKey_idx" ON "ErpWorkOrderRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpWorkOrderRaw_dedupeKey_idx" ON "ErpWorkOrderRaw"("dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpMaterialRaw_sourceSystem_sourceKey_idx" ON "ErpMaterialRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpMaterialRaw_dedupeKey_idx" ON "ErpMaterialRaw"("dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpBomRaw_sourceSystem_sourceKey_idx" ON "ErpBomRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpBomRaw_dedupeKey_idx" ON "ErpBomRaw"("dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpWorkCenterRaw_sourceSystem_sourceKey_idx" ON "ErpWorkCenterRaw"("sourceSystem", "sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErpWorkCenterRaw_dedupeKey_idx" ON "ErpWorkCenterRaw"("dedupeKey");
