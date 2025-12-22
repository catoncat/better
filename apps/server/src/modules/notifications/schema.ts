import { t } from "elysia";
import { notificationDataSchema } from "../../schemas/json-schemas";
import { NotificationPriority, NotificationStatus } from "../../types/prisma-enums";

// Re-export for backward compatibility
export { notificationDataSchema };

export const notificationSchema = t.Object({
	id: t.String(),
	recipientId: t.String(),
	type: t.String(),
	title: t.String(),
	message: t.String(),
	status: t.Enum(NotificationStatus),
	priority: t.Nullable(t.Enum(NotificationPriority)),
	data: t.Nullable(notificationDataSchema),
	createdAt: t.String(), // Dates are usually strings in JSON
	readAt: t.Nullable(t.String()),
});

export const notificationListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	limit: t.Optional(t.Numeric({ default: 20 })),
	status: t.Optional(t.Enum(NotificationStatus)),
	type: t.Optional(t.String()),
});

export const notificationParamsSchema = t.Object({
	id: t.String(),
});

export const notificationListResponseSchema = t.Object({
	items: t.Array(notificationSchema),
	total: t.Number(),
	page: t.Number(),
	limit: t.Number(),
	totalPages: t.Number(),
});

export const unreadCountResponseSchema = t.Object({
	count: t.Number(),
});
