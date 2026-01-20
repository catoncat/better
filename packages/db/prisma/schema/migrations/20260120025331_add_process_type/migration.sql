-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processType" TEXT NOT NULL DEFAULT 'SMT',
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Line" ("code", "createdAt", "id", "meta", "name", "updatedAt") SELECT "code", "createdAt", "id", "meta", "name", "updatedAt" FROM "Line";
DROP TABLE "Line";
ALTER TABLE "new_Line" RENAME TO "Line";
CREATE UNIQUE INDEX "Line_code_key" ON "Line"("code");
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'MES',
    "sourceKey" TEXT,
    "productCode" TEXT,
    "processType" TEXT NOT NULL DEFAULT 'SMT',
    "effectiveFrom" DATETIME,
    "effectiveTo" DATETIME,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routing" ("code", "createdAt", "effectiveFrom", "effectiveTo", "id", "isActive", "meta", "name", "productCode", "sourceKey", "sourceSystem", "updatedAt", "version") SELECT "code", "createdAt", "effectiveFrom", "effectiveTo", "id", "isActive", "meta", "name", "productCode", "sourceKey", "sourceSystem", "updatedAt", "version" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_code_key" ON "Routing"("code");
CREATE INDEX "Routing_sourceSystem_sourceKey_idx" ON "Routing"("sourceSystem", "sourceKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
