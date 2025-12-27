import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import type { UserRole } from "../../types/prisma-enums";
import {
	auditErrorResponseSchema,
	auditEventResponseSchema,
	auditListQuerySchema,
	auditListResponseSchema,
	auditParamsSchema,
} from "./schema";
import { getAuditEvent, listAuditEvents } from "./service";

const VIEW_ALL_ROLES = new Set<UserRole>();

const canViewAllAuditLogs = (role?: UserRole | null) => {
	if (!role) return false;
	return VIEW_ALL_ROLES.has(role);
};

export const auditModule = new Elysia({
	prefix: "/audit-logs",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query, user, set }) => {
			const allowAll = canViewAllAuditLogs(user.role as UserRole | undefined);
			if (!allowAll && query.actorId && query.actorId !== user.id) {
				set.status = 403;
				return {
					ok: false,
					error: { code: "FORBIDDEN", message: "无法查看其他用户的审计记录" },
				};
			}

			const result = await listAuditEvents(db, query, allowAll ? undefined : user.id);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			query: auditListQuerySchema,
			response: {
				200: auditListResponseSchema,
				403: auditErrorResponseSchema,
			},
			detail: { tags: ["Audit Logs"] },
		},
	)
	.get(
		"/:id",
		async ({ db, params, user, set }) => {
			const allowAll = canViewAllAuditLogs(user.role as UserRole | undefined);
			const record = await getAuditEvent(db, params.id);
			if (!record) {
				set.status = 404;
				return { ok: false, error: { code: "NOT_FOUND", message: "未找到审计记录" } };
			}
			if (!allowAll && record.actorId && record.actorId !== user.id) {
				set.status = 403;
				return {
					ok: false,
					error: { code: "FORBIDDEN", message: "无法查看其他用户的审计记录" },
				};
			}
			return { ok: true, data: record };
		},
		{
			isAuth: true,
			params: auditParamsSchema,
			response: {
				200: auditEventResponseSchema,
				403: auditErrorResponseSchema,
				404: auditErrorResponseSchema,
			},
			detail: { tags: ["Audit Logs"] },
		},
	);
