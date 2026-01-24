-- CreateTable
CREATE TABLE "mes_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" DATETIME,
    "processedAt" DATETIME,
    "occurredAt" DATETIME,
    "idempotencyKey" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "runId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "retentionUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- CreateIndex
CREATE UNIQUE INDEX "mes_events_idempotencyKey_key" ON "mes_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "mes_events_status_nextAttemptAt_idx" ON "mes_events"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "mes_events_eventType_idx" ON "mes_events"("eventType");

-- CreateIndex
CREATE INDEX "mes_events_runId_idx" ON "mes_events"("runId");

-- CreateIndex
CREATE INDEX "mes_events_entityType_entityId_idx" ON "mes_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "mes_events_retentionUntil_idx" ON "mes_events"("retentionUntil");
