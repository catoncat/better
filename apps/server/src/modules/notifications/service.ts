import type { Prisma, PrismaClient } from "@better-app/db";
import { NotificationPriority, NotificationStatus } from "@better-app/db";
import type { ServiceResult } from "../../types/service-result";
import { getWecomConfig } from "../system/service";

export type NotificationType = "system";
type NotificationRecord = Prisma.NotificationGetPayload<Prisma.NotificationDefaultArgs>;

export interface DispatchNotificationParams {
	recipients: string[];
	type: NotificationType;
	title: string;
	message: string;
	priority?: "normal" | "urgent";
	data?: Record<string, unknown>;
	mentionAll?: boolean;
}

/**
 * Dispatch notification to multiple recipients
 * - Creates notification records in database
 * - Sends WeCom webhook if enabled
 */
export async function dispatchNotification(
	db: PrismaClient,
	params: DispatchNotificationParams,
): Promise<{ createdIds: string[]; wecomSent: boolean }> {
	const uniqueRecipients = [...new Set(params.recipients.filter(Boolean))];
	const createdIds: string[] = [];

	// Create notification records for each recipient
	if (uniqueRecipients.length > 0) {
		const notifications = await Promise.all(
			uniqueRecipients.map((recipientId) =>
				db.notification.create({
					data: {
						recipientId,
						type: params.type,
						title: params.title,
						message: params.message,
						status: NotificationStatus.unread,
						priority:
							params.priority === "urgent"
								? NotificationPriority.high
								: NotificationPriority.normal,
						data: (params.data as Prisma.InputJsonValue) ?? undefined,
						wecomSent: false,
					},
				}),
			),
		);
		createdIds.push(...notifications.map((n) => n.id));
	}

	// Send WeCom notification if enabled
	const wecomConfigResult = await getWecomConfig(db);
	const wecomConfig = wecomConfigResult.success ? wecomConfigResult.data : null;
	if (!wecomConfig?.enabled || !wecomConfig?.webhookUrl) {
		return { createdIds, wecomSent: false };
	}

	try {
		let markdown = `### ${params.title}\n\n${params.message}`;

		if (wecomConfig.mentionAll || params.mentionAll || params.priority === "urgent") {
			markdown += "\n\n<@所有人>";
		}

		const response = await fetch(wecomConfig.webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				msgtype: "markdown",
				markdown: { content: markdown },
			}),
		});

		const result = (await response.json()) as { errcode?: number };
		const wecomSent = result.errcode === 0;

		// Update notification records to mark WeCom sent
		if (wecomSent && createdIds.length > 0) {
			await db.notification.updateMany({
				where: { id: { in: createdIds } },
				data: { wecomSent: true, wecomSentAt: new Date() },
			});
		}

		return { createdIds, wecomSent };
	} catch (error) {
		console.error("Failed to send WeCom notification:", error);
		return { createdIds, wecomSent: false };
	}
}

/**
 * Get user IDs by role
 */
export async function listNotifications(
	db: PrismaClient,
	userId: string,
	query: {
		page?: number;
		limit?: number;
		status?: NotificationStatus;
		type?: string;
	},
) {
	const page = query.page || 1;
	const limit = query.limit || 20;
	const skip = (page - 1) * limit;

	const where: Prisma.NotificationWhereInput = {
		recipientId: userId,
	};

	if (query.status) {
		where.status = query.status;
	}

	if (query.type) {
		where.type = query.type;
	}

	const [items, total] = await Promise.all([
		db.notification.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				createdAt: "desc",
			},
		}),
		db.notification.count({ where }),
	]);

	const totalPages = Math.ceil(total / limit);

	// Convert dates to strings for JSON response if needed,
	// but Elysia usually handles Date objects fine.
	// We'll keep them as Date objects and let serialization handle it,
	// or the schema might expect strings.
	// Looking at other modules, returning Date objects is usually fine if schema says String (Elysia/TypeBox coerces).

	return {
		items: items.map((item) => ({
			...item,
			// Cast Prisma.JsonValue to the expected notification data structure
			// The data is stored as JSON in DB but conforms to notificationDataSchema
			data: item.data as Record<string, unknown> | null,
			createdAt: item.createdAt.toISOString(),
			readAt: item.readAt?.toISOString() || null,
			wecomSentAt: item.wecomSentAt?.toISOString() || null,
		})),
		total,
		page,
		limit,
		totalPages,
	};
}

export async function getUnreadCount(db: PrismaClient, userId: string) {
	const count = await db.notification.count({
		where: {
			recipientId: userId,
			status: NotificationStatus.unread,
		},
	});
	return { count };
}

export async function markAsRead(
	db: PrismaClient,
	id: string,
	userId: string,
): Promise<ServiceResult<NotificationRecord>> {
	const notification = await db.notification.findUnique({
		where: { id },
	});

	if (!notification || notification.recipientId !== userId) {
		return { success: false, code: "NOT_FOUND", message: "Notification not found", status: 404 };
	}

	const updated = await db.notification.update({
		where: { id },
		data: {
			status: NotificationStatus.read,
			readAt: new Date(),
		},
	});

	return { success: true, data: updated };
}

export async function markAllAsRead(db: PrismaClient, userId: string) {
	await db.notification.updateMany({
		where: {
			recipientId: userId,
			status: NotificationStatus.unread,
		},
		data: {
			status: NotificationStatus.read,
			readAt: new Date(),
		},
	});

	return { success: true };
}

export async function deleteNotification(
	db: PrismaClient,
	id: string,
	userId: string,
): Promise<ServiceResult<{ deleted: true }>> {
	const notification = await db.notification.findUnique({
		where: { id },
	});

	if (!notification || notification.recipientId !== userId) {
		return { success: false, code: "NOT_FOUND", message: "Notification not found", status: 404 };
	}

	await db.notification.delete({
		where: { id },
	});

	return { success: true, data: { deleted: true } };
}
