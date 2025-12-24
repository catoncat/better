import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { archiveAuditEvents } from "../modules/audit/archive";
import { getTimezoneIana } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";

const auditArchiveEnabled = process.env.AUDIT_ARCHIVE_ENABLED === "true";
const archivePattern = process.env.AUDIT_ARCHIVE_CRON ?? "0 3 1 * *"; // monthly at 03:00
const cutoffDays = Number(process.env.AUDIT_ARCHIVE_CUTOFF_DAYS ?? "90");
const batchSize = Number(process.env.AUDIT_ARCHIVE_BATCH_SIZE ?? "1000");
const outputDir = process.env.AUDIT_ARCHIVE_DIR ?? "data/audit-archives";

export const auditArchiveCronPlugin = new Elysia({
	name: "audit-archive-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "audit-log-archive",
			pattern: archivePattern,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				if (!auditArchiveEnabled) return;
				const db = prisma;
				const startedAt = new Date().toISOString();

				try {
					const result = await archiveAuditEvents(db, {
						cutoffDays,
						batchSize,
						outputDir,
					});

					await db.systemLog.create({
						data: {
							action: "CRON_AUDIT_ARCHIVE",
							module: "Audit",
							status: "SUCCESS",
							details: {
								startedAt,
								archived: result.archived,
								filePath: result.filePath,
								checksum: result.checksum,
							},
						},
					});
				} catch (error) {
					await db.systemLog.create({
						data: {
							action: "CRON_AUDIT_ARCHIVE",
							module: "Audit",
							status: "ERROR",
							details: {
								startedAt,
								error: error instanceof Error ? error.message : String(error),
							},
						},
					});
				}
			},
		}),
	);
