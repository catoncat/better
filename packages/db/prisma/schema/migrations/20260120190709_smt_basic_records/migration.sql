-- CreateTable
CREATE TABLE "StencilUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stencilId" TEXT NOT NULL,
    "lineId" TEXT,
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
    CONSTRAINT "StencilUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StencilCleaningRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stencilId" TEXT NOT NULL,
    "lineId" TEXT,
    "cleanedAt" DATETIME NOT NULL,
    "cleanedBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StencilCleaningRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SqueegeeUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squeegeeId" TEXT NOT NULL,
    "lineId" TEXT,
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
    CONSTRAINT "SqueegeeUsageRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentInspectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT,
    "equipmentType" TEXT,
    "inspectedAt" DATETIME NOT NULL,
    "machineName" TEXT NOT NULL,
    "sampleModel" TEXT,
    "version" TEXT,
    "programName" TEXT,
    "result" TEXT,
    "inspector" TEXT NOT NULL,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EquipmentInspectionRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OvenProgramRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT,
    "equipmentId" TEXT,
    "recordDate" DATETIME NOT NULL,
    "productName" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "usedBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OvenProgramRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyQcRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT,
    "customer" TEXT,
    "station" TEXT,
    "assemblyNumber" TEXT,
    "jobNo" TEXT,
    "jobQty" INTEGER,
    "shiftCode" TEXT,
    "timeWindow" TEXT,
    "defectSummary" JSONB,
    "yellowCardNo" TEXT,
    "totalParts" INTEGER,
    "inspectedQty" INTEGER,
    "defectBoardQty" INTEGER,
    "defectBoardRate" REAL,
    "defectQty" INTEGER,
    "defectRate" REAL,
    "correctiveAction" TEXT,
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" DATETIME NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyQcRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionExceptionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineId" TEXT,
    "jobNo" TEXT,
    "assemblyNumber" TEXT,
    "revision" TEXT,
    "shipDate" DATETIME,
    "customer" TEXT,
    "qty" INTEGER,
    "lineNo" TEXT,
    "downtimeMinutes" INTEGER,
    "downtimeRange" TEXT,
    "impact" TEXT,
    "description" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "correctiveAction" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "remark" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionExceptionRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StencilUsageRecord_stencilId_idx" ON "StencilUsageRecord"("stencilId");

-- CreateIndex
CREATE INDEX "StencilUsageRecord_lineId_idx" ON "StencilUsageRecord"("lineId");

-- CreateIndex
CREATE INDEX "StencilUsageRecord_recordDate_idx" ON "StencilUsageRecord"("recordDate");

-- CreateIndex
CREATE INDEX "StencilCleaningRecord_stencilId_idx" ON "StencilCleaningRecord"("stencilId");

-- CreateIndex
CREATE INDEX "StencilCleaningRecord_lineId_idx" ON "StencilCleaningRecord"("lineId");

-- CreateIndex
CREATE INDEX "StencilCleaningRecord_cleanedAt_idx" ON "StencilCleaningRecord"("cleanedAt");

-- CreateIndex
CREATE INDEX "SqueegeeUsageRecord_squeegeeId_idx" ON "SqueegeeUsageRecord"("squeegeeId");

-- CreateIndex
CREATE INDEX "SqueegeeUsageRecord_lineId_idx" ON "SqueegeeUsageRecord"("lineId");

-- CreateIndex
CREATE INDEX "SqueegeeUsageRecord_recordDate_idx" ON "SqueegeeUsageRecord"("recordDate");

-- CreateIndex
CREATE INDEX "EquipmentInspectionRecord_lineId_idx" ON "EquipmentInspectionRecord"("lineId");

-- CreateIndex
CREATE INDEX "EquipmentInspectionRecord_inspectedAt_idx" ON "EquipmentInspectionRecord"("inspectedAt");

-- CreateIndex
CREATE INDEX "EquipmentInspectionRecord_machineName_idx" ON "EquipmentInspectionRecord"("machineName");

-- CreateIndex
CREATE INDEX "OvenProgramRecord_lineId_idx" ON "OvenProgramRecord"("lineId");

-- CreateIndex
CREATE INDEX "OvenProgramRecord_recordDate_idx" ON "OvenProgramRecord"("recordDate");

-- CreateIndex
CREATE INDEX "OvenProgramRecord_equipmentId_idx" ON "OvenProgramRecord"("equipmentId");

-- CreateIndex
CREATE INDEX "OvenProgramRecord_programName_idx" ON "OvenProgramRecord"("programName");

-- CreateIndex
CREATE INDEX "DailyQcRecord_lineId_idx" ON "DailyQcRecord"("lineId");

-- CreateIndex
CREATE INDEX "DailyQcRecord_inspectedAt_idx" ON "DailyQcRecord"("inspectedAt");

-- CreateIndex
CREATE INDEX "DailyQcRecord_jobNo_idx" ON "DailyQcRecord"("jobNo");

-- CreateIndex
CREATE INDEX "ProductionExceptionRecord_lineId_idx" ON "ProductionExceptionRecord"("lineId");

-- CreateIndex
CREATE INDEX "ProductionExceptionRecord_issuedAt_idx" ON "ProductionExceptionRecord"("issuedAt");

-- CreateIndex
CREATE INDEX "ProductionExceptionRecord_jobNo_idx" ON "ProductionExceptionRecord"("jobNo");
