import "dotenv/config";
import prisma from "@better-app/db";
import { archiveAuditEvents } from "../src/modules/audit/archive";

const cutoffDays = Number(process.env.AUDIT_ARCHIVE_CUTOFF_DAYS ?? "90");
const batchSize = Number(process.env.AUDIT_ARCHIVE_BATCH_SIZE ?? "1000");
const outputDir = process.env.AUDIT_ARCHIVE_DIR ?? "data/audit-archives";

const run = async () => {
	const result = await archiveAuditEvents(prisma, {
		cutoffDays,
		batchSize,
		outputDir,
	});

	if (result.archived === 0) {
		console.log("[AuditArchive] No records to archive.");
		return;
	}

	console.log(
		`[AuditArchive] Archived ${result.archived} records to ${result.filePath} (checksum=${result.checksum}).`,
	);
};

run()
	.catch((error) => {
		console.error("[AuditArchive] Failed to archive audit logs:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
