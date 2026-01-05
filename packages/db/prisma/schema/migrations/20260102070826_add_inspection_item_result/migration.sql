/*
  Warnings:

  - You are about to drop the column `reviewStatus` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN "failedQty" INTEGER;
ALTER TABLE "Inspection" ADD COLUMN "inspectorId" TEXT;
ALTER TABLE "Inspection" ADD COLUMN "passedQty" INTEGER;
ALTER TABLE "Inspection" ADD COLUMN "sampleQty" INTEGER;
ALTER TABLE "Inspection" ADD COLUMN "startedAt" DATETIME;

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

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "unitSn" TEXT,
    "itemName" TEXT NOT NULL,
    "itemSpec" TEXT,
    "actualValue" TEXT,
    "result" TEXT NOT NULL,
    "defectCode" TEXT,
    "remark" TEXT,
    "inspectedBy" TEXT,
    "inspectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
INSERT INTO "new_WorkOrder" ("createdAt", "dueDate", "erpPickStatus", "erpStatus", "id", "meta", "plannedQty", "productCode", "routingId", "status", "updatedAt", "woNo") SELECT "createdAt", "dueDate", "erpPickStatus", "erpStatus", "id", "meta", "plannedQty", "productCode", "routingId", "status", "updatedAt", "woNo" FROM "WorkOrder";
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheck_runId_idx" ON "ReadinessCheck"("runId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheck_type_status_idx" ON "ReadinessCheck"("type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheckItem_checkId_idx" ON "ReadinessCheckItem"("checkId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReadinessCheckItem_itemType_status_idx" ON "ReadinessCheckItem"("itemType", "status");

-- CreateIndex
CREATE INDEX "InspectionItem_inspectionId_idx" ON "InspectionItem"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionItem_unitSn_idx" ON "InspectionItem"("unitSn");
