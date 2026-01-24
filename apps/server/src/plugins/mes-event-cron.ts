import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { processMesEvents } from "../modules/mes/event/processor";
import { getTimezoneIana } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";

const mesEventCronEnabled = process.env.MES_EVENT_CRON_ENABLED !== "false";
const cronPattern = process.env.MES_EVENT_CRON_PATTERN ?? "*/30 * * * * *";

export const mesEventCronPlugin = new Elysia({
	name: "mes-event-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "mes-event-processor",
			pattern: cronPattern,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				if (!mesEventCronEnabled) return;

				const db = prisma;
				const startedAt = new Date().toISOString();

				try {
					const result = await processMesEvents(db);
					await db.systemLog.create({
						data: {
							action: "CRON_MES_EVENT_PROCESS",
							module: "MesEvent",
							status: "SUCCESS",
							details: {
								startedAt,
								finishedAt: new Date().toISOString(),
								processed: result.processed,
								completed: result.completed,
								failed: result.failed,
								skipped: result.skipped,
								pattern: cronPattern,
							},
						},
					});
				} catch (error) {
					await db.systemLog.create({
						data: {
							action: "CRON_MES_EVENT_PROCESS",
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
