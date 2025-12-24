/*
  Warnings:

  - Added the required column `status` to the `AuditEvent` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityDisplay" TEXT,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "actorType" TEXT,
    "stationId" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "diff" JSONB,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "traceId" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    "payload" JSONB
);
INSERT INTO "new_AuditEvent" ("actorId", "at", "entityId", "entityType", "eventType", "id", "idempotencyKey", "payload", "stationId") SELECT "actorId", "at", "entityId", "entityType", "eventType", "id", "idempotencyKey", "payload", "stationId" FROM "AuditEvent";
DROP TABLE "AuditEvent";
ALTER TABLE "new_AuditEvent" RENAME TO "AuditEvent";
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");
CREATE INDEX "AuditEvent_idempotencyKey_idx" ON "AuditEvent"("idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
