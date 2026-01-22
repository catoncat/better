import { ReadinessItemStatus, ReadinessItemType } from "@better-app/db";
import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import {
	findExpiredInstances,
	findWarningInstances,
	markInstanceExpired,
	markWarningNotified,
} from "../modules/mes/time-rule/service";
import { dispatchNotification } from "../modules/notifications/service";
import { getTimezoneIana } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";

const timeRuleCronEnabled = process.env.TIME_RULE_CRON_ENABLED !== "false";
const cronPattern = process.env.TIME_RULE_CRON_PATTERN ?? "* * * * *"; // every minute

const roleHasPermission = (permissionsJson: string, permission: string) => {
	try {
		const parsed = JSON.parse(permissionsJson) as unknown;
		return Array.isArray(parsed) && parsed.includes(permission);
	} catch {
		return false;
	}
};

export const timeRuleCronPlugin = new Elysia({
	name: "time-rule-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "time-rule-check",
			pattern: cronPattern,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				if (!timeRuleCronEnabled) return;

				const db = prisma;
				const startedAt = new Date().toISOString();

				try {
					// Process expired instances
					const expiredInstances = await findExpiredInstances(db);
					let expiredCount = 0;

					for (const instance of expiredInstances) {
						// Mark as expired
						await markInstanceExpired(db, instance.id);
						expiredCount++;

						// Get definition for details
						const definition = await db.timeRuleDefinition.findUnique({
							where: { id: instance.definitionId },
						});

						// Get run for notification context
						const run = instance.runId
							? await db.run.findUnique({
									where: { id: instance.runId },
									select: { runNo: true, lineId: true },
								})
							: null;

						// Create a FAILED ReadinessCheckItem for the latest readiness check
						if (instance.runId) {
							const latestCheck = await db.readinessCheck.findFirst({
								where: { runId: instance.runId },
								orderBy: { createdAt: "desc" },
							});

							if (latestCheck) {
								const readinessItem = await db.readinessCheckItem.create({
									data: {
										checkId: latestCheck.id,
										itemType: ReadinessItemType.TIME_RULE,
										itemKey: `${definition?.code ?? "UNKNOWN"}:${instance.entityId}`,
										status: ReadinessItemStatus.FAILED,
										failReason: `时间规则超时: ${definition?.name ?? "未知规则"} - ${instance.entityDisplay ?? instance.entityId}`,
										evidenceJson: {
											instanceId: instance.id,
											definitionCode: definition?.code,
											entityType: instance.entityType,
											entityId: instance.entityId,
											startedAt: instance.startedAt.toISOString(),
											expiredAt: new Date().toISOString(),
										},
									},
								});

								// Link readiness item to instance
								await db.timeRuleInstance.update({
									where: { id: instance.id },
									data: { readinessItemId: readinessItem.id },
								});
							}
						}

						// Create notification for supervisors
						if (run?.lineId) {
							const line = await db.line.findUnique({
								where: { id: run.lineId },
								select: { code: true, name: true },
							});

							// Get supervisors for the line
							const supervisorBindings = await db.userLineBinding.findMany({
								where: { lineId: run.lineId },
								include: {
									user: {
										include: {
											userRoles: {
												include: { role: true },
											},
										},
									},
								},
							});

							for (const binding of supervisorBindings) {
								// Check if user has supervisor-like permissions
								const hasPermission = binding.user.userRoles.some((ur) =>
									roleHasPermission(ur.role.permissions, "READINESS_OVERRIDE"),
								);
								if (!hasPermission) continue;

								await dispatchNotification(db, {
									recipients: [binding.userId],
									type: "system",
									title: `时间规则超时: ${definition?.name}`,
									message: `Run ${run.runNo} 在产线 ${line?.name ?? line?.code} 的时间规则已超时。实体: ${instance.entityDisplay ?? instance.entityId}`,
									priority: "urgent",
									data: {
										notificationType: "TIME_RULE_EXPIRED",
										instanceId: instance.id,
										runNo: run.runNo,
										lineCode: line?.code,
										definitionCode: definition?.code,
										entityType: instance.entityType,
										entityId: instance.entityId,
									},
								});
							}
						}
					}

					// Process warning instances
					const warningInstances = await findWarningInstances(db);
					let warningCount = 0;

					for (const instance of warningInstances) {
						await markWarningNotified(db, instance.id);
						warningCount++;

						const definition = await db.timeRuleDefinition.findUnique({
							where: { id: instance.definitionId },
						});

						const run = instance.runId
							? await db.run.findUnique({
									where: { id: instance.runId },
									select: { runNo: true, lineId: true },
								})
							: null;

						if (run?.lineId) {
							const line = await db.line.findUnique({
								where: { id: run.lineId },
								select: { code: true, name: true },
							});

							// Calculate remaining time
							const remainingMs = instance.expiresAt.getTime() - Date.now();
							const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

							// Get operators and supervisors for the line
							const lineBindings = await db.userLineBinding.findMany({
								where: { lineId: run.lineId },
								include: { user: true },
							});

							for (const binding of lineBindings) {
								await dispatchNotification(db, {
									recipients: [binding.userId],
									type: "system",
									title: `时间规则预警: ${definition?.name}`,
									message: `Run ${run.runNo} 在产线 ${line?.name ?? line?.code} 的时间规则将在 ${remainingMinutes} 分钟后超时。实体: ${instance.entityDisplay ?? instance.entityId}`,
									priority: "normal",
									data: {
										notificationType: "TIME_RULE_WARNING",
										instanceId: instance.id,
										runNo: run.runNo,
										lineCode: line?.code,
										definitionCode: definition?.code,
										entityType: instance.entityType,
										entityId: instance.entityId,
										remainingMinutes,
									},
								});
							}
						}
					}

					// Log success if there was any activity
					if (expiredCount > 0 || warningCount > 0) {
						await db.systemLog.create({
							data: {
								action: "CRON_TIME_RULE_CHECK",
								module: "TimeRule",
								status: "SUCCESS",
								details: {
									startedAt,
									expiredCount,
									warningCount,
								},
							},
						});
					}
				} catch (error) {
					await db.systemLog.create({
						data: {
							action: "CRON_TIME_RULE_CHECK",
							module: "TimeRule",
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
