-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN "activeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_activeKey_key" ON "Inspection"("activeKey");
