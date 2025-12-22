import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import {
	notificationListQuerySchema,
	notificationListResponseSchema,
	notificationParamsSchema,
	unreadCountResponseSchema,
} from "./schema";
import {
	deleteNotification,
	getUnreadCount,
	listNotifications,
	markAllAsRead,
	markAsRead,
} from "./service";

export const notificationModule = new Elysia({
	prefix: "/notifications",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query, user }) => {
			return listNotifications(db, user.id, query);
		},
		{
			isAuth: true,
			query: notificationListQuerySchema,
			response: notificationListResponseSchema,
		},
	)
	.get(
		"/unread-count",
		async ({ db, user }) => {
			return getUnreadCount(db, user.id);
		},
		{
			isAuth: true,
			response: unreadCountResponseSchema,
		},
	)
	.patch(
		"/read-all",
		async ({ db, user }) => {
			return markAllAsRead(db, user.id);
		},
		{
			isAuth: true,
		},
	)
	.patch(
		"/:id/read",
		async ({ db, params, user, set }) => {
			const result = await markAsRead(db, params.id, user.id);
			if (!result.success) {
				set.status = 404;
				return { message: "Notification not found" };
			}
			return result.data;
		},
		{
			isAuth: true,
			params: notificationParamsSchema,
		},
	)
	.delete(
		"/:id",
		async ({ db, params, user, set }) => {
			const result = await deleteNotification(db, params.id, user.id);
			if (!result.success) {
				set.status = 404;
				return { message: "Notification not found" };
			}
			return { message: "Deleted" };
		},
		{
			isAuth: true,
			params: notificationParamsSchema,
		},
	);
