-- CreateTable
CREATE TABLE "TpmEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "workshopCode" TEXT,
    "location" TEXT,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TpmStatusLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TpmMaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskNo" TEXT NOT NULL,
    "equipmentCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "startTime" DATETIME,
    "completedAt" DATETIME,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TpmEquipment_equipmentCode_key" ON "TpmEquipment"("equipmentCode");

-- CreateIndex
CREATE INDEX "TpmEquipment_status_idx" ON "TpmEquipment"("status");

-- CreateIndex
CREATE INDEX "TpmStatusLog_equipmentCode_idx" ON "TpmStatusLog"("equipmentCode");

-- CreateIndex
CREATE UNIQUE INDEX "TpmStatusLog_equipmentCode_startedAt_key" ON "TpmStatusLog"("equipmentCode", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TpmMaintenanceTask_taskNo_key" ON "TpmMaintenanceTask"("taskNo");

-- CreateIndex
CREATE INDEX "TpmMaintenanceTask_equipmentCode_status_idx" ON "TpmMaintenanceTask"("equipmentCode", "status");
