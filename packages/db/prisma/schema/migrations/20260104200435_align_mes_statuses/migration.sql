-- Align legacy MES status values to SMP v2.4 enums
UPDATE "Run" SET "status" = 'PREP' WHERE "status" = 'FAI_PENDING';
UPDATE "Run" SET "status" = 'IN_PROGRESS' WHERE "status" = 'RUNNING';
UPDATE "Run" SET "status" = 'COMPLETED' WHERE "status" IN ('FINISHING', 'ARCHIVED');
UPDATE "Run" SET "status" = 'SCRAPPED' WHERE "status" = 'CANCELLED';

UPDATE "Unit" SET "status" = 'QUEUED' WHERE "status" IN ('OUT_PASSED', 'REWORK');
UPDATE "Unit" SET "status" = 'ON_HOLD' WHERE "status" = 'HOLD';

UPDATE "WorkOrder" SET "status" = 'COMPLETED' WHERE "status" IN ('CANCELLED', 'CLOSED');
