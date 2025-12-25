-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "model" TEXT,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentCode" TEXT NOT NULL,
    "childCode" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "unit" TEXT,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentCode" TEXT,
    "departmentName" TEXT,
    "sourceUpdatedAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_code_idx" ON "Material"("code");

-- CreateIndex
CREATE INDEX "BomItem_parentCode_idx" ON "BomItem"("parentCode");

-- CreateIndex
CREATE UNIQUE INDEX "BomItem_parentCode_childCode_key" ON "BomItem"("parentCode", "childCode");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_code_key" ON "WorkCenter"("code");

-- CreateIndex
CREATE INDEX "WorkCenter_departmentCode_idx" ON "WorkCenter"("departmentCode");
