-- AlterTable
ALTER TABLE "time_rule_instances" ADD COLUMN "activeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "time_rule_instances_activeKey_key" ON "time_rule_instances"("activeKey");
