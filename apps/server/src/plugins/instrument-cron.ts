import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { dispatchNotification } from "../modules/notifications/service";
import { getTimezoneIana, getTimezoneOffsetMinutes } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";

export const instrumentCronPlugin = new Elysia({
	name: "instrument-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "instrument-calibration-check",
			pattern: "0 8 * * *", // 每天 08:00 执行
			timezone: getTimezoneIana(),
			async run() {
				const db = prisma;
				const timezoneOffset = getTimezoneOffsetMinutes();

				// 获取今天的日期（基于配置的时区）
				// 注意：cron 触发时已经是目标时区的 08:00
				const now = new Date();
				const today = new Date(now.getTime() + timezoneOffset * 60 * 1000);
				today.setUTCHours(0, 0, 0, 0);

				console.log(
					`[InstrumentCron] Running check at ${now.toISOString()} (Local: ${today.toISOString()})`,
				);

				try {
					// 1. 获取所有活跃的、有下次校准时间且有负责人的仪器
					const instruments = await db.instrument.findMany({
						where: {
							status: {
								notIn: ["scrapped", "out_of_service"],
							},
							nextCalibrationDate: {
								not: null,
							},
							ownerId: {
								not: null,
							},
						},
						select: {
							id: true,
							instrumentNo: true,
							// name: true, // Instrument model doesn't have name
							nextCalibrationDate: true,
							reminderDays: true,
							ownerId: true,
						},
					});

					let notificationCount = 0;

					// 2. 遍历检查是否需要提醒
					for (const instrument of instruments) {
						if (!instrument.nextCalibrationDate || !instrument.ownerId) continue;

						const reminderDays = instrument.reminderDays ?? 15;
						const nextDate = new Date(instrument.nextCalibrationDate);
						nextDate.setUTCHours(0, 0, 0, 0); // 确保比较的是日期部分

						// 计算相差天数
						const diffTime = nextDate.getTime() - today.getTime();
						const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

						// 只有在正好等于提醒天数的那一天发送通知
						if (diffDays === reminderDays) {
							const formattedDate = instrument.nextCalibrationDate.toLocaleDateString("zh-CN");

							await dispatchNotification(db, {
								recipients: [instrument.ownerId],
								type: "system",
								title: "计量仪器即将到期提醒",
								message: `仪器 ${instrument.instrumentNo} 将于 ${formattedDate} 到期，请及时安排送检。`,
								priority: "normal",
								data: {
									entityType: "instrument",
									entityId: instrument.id,
									action: "view",
								},
							});

							notificationCount++;
						}
					}

					console.log(`[InstrumentCron] Check completed. Sent ${notificationCount} notifications.`);

					// 记录系统日志
					if (notificationCount > 0) {
						await db.systemLog.create({
							data: {
								action: "CRON_INSTRUMENT_CHECK",
								module: "Instrument",
								status: "SUCCESS",
								details: {
									sentCount: notificationCount,
								},
							},
						});
					}
				} catch (error) {
					console.error("[InstrumentCron] Failed to run check:", error);
					await db.systemLog.create({
						data: {
							action: "CRON_INSTRUMENT_CHECK",
							module: "Instrument",
							status: "ERROR",
							details: {
								error: error instanceof Error ? error.message : String(error),
							},
						},
					});
				}
			},
			catch: true, // 捕获未处理的异常
		}),
	);
