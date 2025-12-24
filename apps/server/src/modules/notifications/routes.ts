import { Elysia } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
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
			detail: { tags: ["Notifications"] },
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
			detail: { tags: ["Notifications"] },
		},
	)
	.patch(
		"/read-all",
		async ({ db, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const unreadCount = await db.notification.count({
				where: { recipientId: user.id, status: "unread" },
			});
			const result = await markAllAsRead(db, user.id);
			await recordAuditEvent(db, {
				entityType: AuditEntityType.NOTIFICATION,
				entityId: user.id,
				entityDisplay: user.email ?? user.id,
				action: "NOTIFICATIONS_READ_ALL",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: { unreadCount },
			});
			return result;
		},
		{
			isAuth: true,
			detail: { tags: ["Notifications"] },
		},
	)
	.patch(
		"/:id/read",
		async ({ db, params, user, set, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.notification.findFirst({
				where: { id: params.id, recipientId: user.id },
			});
			const result = await markAsRead(db, params.id, user.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.NOTIFICATION,
					entityId: before?.id ?? params.id,
					entityDisplay: params.id,
					action: "NOTIFICATION_READ",
					actor,
					status: "FAIL",
					errorCode: "NOT_FOUND",
					errorMessage: "Notification not found",
					before,
					request: requestMeta,
				});
				set.status = 404;
				return { message: "Notification not found" };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.NOTIFICATION,
				entityId: result.data.id,
				entityDisplay: result.data.id,
				action: "NOTIFICATION_READ",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});
			return result.data;
		},
		{
			isAuth: true,
			params: notificationParamsSchema,
			detail: { tags: ["Notifications"] },
		},
	)
	.delete(
		"/:id",
		async ({ db, params, user, set, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.notification.findFirst({
				where: { id: params.id, recipientId: user.id },
			});
			const result = await deleteNotification(db, params.id, user.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.NOTIFICATION,
					entityId: before?.id ?? params.id,
					entityDisplay: params.id,
					action: "NOTIFICATION_DELETE",
					actor,
					status: "FAIL",
					errorCode: "NOT_FOUND",
					errorMessage: "Notification not found",
					before,
					request: requestMeta,
				});
				set.status = 404;
				return { message: "Notification not found" };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.NOTIFICATION,
				entityId: before?.id ?? params.id,
				entityDisplay: params.id,
				action: "NOTIFICATION_DELETE",
				actor,
				status: "SUCCESS",
				before,
				after: null,
				request: requestMeta,
			});
			return { message: "Deleted" };
		},
		{
			isAuth: true,
			params: notificationParamsSchema,
			detail: { tags: ["Notifications"] },
		},
	);
