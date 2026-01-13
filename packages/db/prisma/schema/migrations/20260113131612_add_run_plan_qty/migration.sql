-- AlterTable
ALTER TABLE "Run" ADD COLUMN "planQty" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows (keep legacy behavior: inherit from work order plannedQty)
UPDATE "Run"
SET "planQty" = CAST(
	COALESCE((SELECT "plannedQty" FROM "WorkOrder" WHERE "WorkOrder"."id" = "Run"."woId"), 0)
	AS INTEGER
)
WHERE "planQty" = 0;

-- Safety: ensure positive planQty (service/UI enforces >= 1)
UPDATE "Run" SET "planQty" = 1 WHERE "planQty" < 1;

