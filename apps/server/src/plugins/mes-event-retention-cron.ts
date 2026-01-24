import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { cleanupMesEvents } from "../modules/mes/event/retention";
import { getTimezoneIana } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";

const retentionCronEnabled = process.env.MES_EVENT_RETENTION_ENABLED !== "false";
const cronPattern = process.env.MES_EVENT_RETENTION_CRON ?? "0 3 * * *";
const retentionDays = Number(process.env.MES_EVENT_RETENTION_DAYS ?? "30");

export const mesEventRetentionCronPlugin = new Elysia({
	name: "mes-event-retention-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "mes-event-retention",
			pattern: cronPattern,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				if (!retentionCronEnabled) return;

				const db = prisma;
				const startedAt = new Date().toISOString();

				try {
					const result = await cleanupMesEvents(db, retentionDays);
					await db.systemLog.create({
						data: {
							action: "CRON_MES_EVENT_RETENTION",
							module: "MesEvent",
							status: "SUCCESS",
							details: {
								startedAt,
								deleted: result.deleted,
								cutoff: result.cutoff,
								retentionDays,
								pattern: cronPattern,
							},
						},
					});
				} catch (error) {
					await db.systemLog.create({
						data: {
							action: "CRON_MES_EVENT_RETENTION",
							module: "MesEvent",
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
