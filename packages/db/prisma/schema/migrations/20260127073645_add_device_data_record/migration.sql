-- CreateTable
CREATE TABLE "DeviceDataRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "runNo" TEXT,
    "unitSn" TEXT,
    "stationCode" TEXT,
    "stepNo" INTEGER,
    "trackId" TEXT,
    "carrierTrackId" TEXT,
    "operationId" TEXT,
    "equipmentId" TEXT,
    "operatorId" TEXT,
    "data" JSONB NOT NULL,
    "meta" JSONB,
    "dataValuesCreated" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceDataRecord_eventId_key" ON "DeviceDataRecord"("eventId");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_runNo_idx" ON "DeviceDataRecord"("runNo");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_unitSn_idx" ON "DeviceDataRecord"("unitSn");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_stationCode_idx" ON "DeviceDataRecord"("stationCode");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_eventTime_idx" ON "DeviceDataRecord"("eventTime");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_trackId_idx" ON "DeviceDataRecord"("trackId");

-- CreateIndex
CREATE INDEX "DeviceDataRecord_carrierTrackId_idx" ON "DeviceDataRecord"("carrierTrackId");
