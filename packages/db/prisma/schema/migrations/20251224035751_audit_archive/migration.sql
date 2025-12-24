-- CreateTable
CREATE TABLE "audit_archives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "rangeStart" DATETIME NOT NULL,
    "rangeEnd" DATETIME NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "audit_archives_rangeStart_rangeEnd_idx" ON "audit_archives"("rangeStart", "rangeEnd");
