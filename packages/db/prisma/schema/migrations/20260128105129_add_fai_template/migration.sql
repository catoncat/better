-- CreateTable
CREATE TABLE "FaiTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "processType" TEXT NOT NULL DEFAULT 'SMT',
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FaiTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemSpec" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaiTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FaiTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'MES',
    "sourceKey" TEXT,
    "productCode" TEXT,
    "faiTemplateId" TEXT,
    "processType" TEXT NOT NULL DEFAULT 'SMT',
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Routing_faiTemplateId_fkey" FOREIGN KEY ("faiTemplateId") REFERENCES "FaiTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Routing" ("code", "createdAt", "effectiveFrom", "effectiveTo", "id", "isActive", "meta", "name", "processType", "productCode", "sourceKey", "sourceSystem", "updatedAt", "version") SELECT "code", "createdAt", "effectiveFrom", "effectiveTo", "id", "isActive", "meta", "name", "processType", "productCode", "sourceKey", "sourceSystem", "updatedAt", "version" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_code_key" ON "Routing"("code");
CREATE INDEX "Routing_sourceSystem_sourceKey_idx" ON "Routing"("sourceSystem", "sourceKey");
CREATE INDEX "Routing_faiTemplateId_idx" ON "Routing"("faiTemplateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FaiTemplate_code_key" ON "FaiTemplate"("code");

-- CreateIndex
CREATE INDEX "FaiTemplate_productCode_idx" ON "FaiTemplate"("productCode");

-- CreateIndex
CREATE INDEX "FaiTemplate_processType_isActive_idx" ON "FaiTemplate"("processType", "isActive");

-- CreateIndex
CREATE INDEX "FaiTemplateItem_templateId_idx" ON "FaiTemplateItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "FaiTemplateItem_templateId_seq_key" ON "FaiTemplateItem"("templateId", "seq");
