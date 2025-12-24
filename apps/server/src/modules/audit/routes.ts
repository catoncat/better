import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { UserRole } from "../../types/prisma-enums";
import {
	auditEventSchema,
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
				return { code: "FORBIDDEN", message: "无法查看其他用户的审计记录" };
			}

			const result = await listAuditEvents(db, query, allowAll ? undefined : user.id);
			return result;
		},
		{
			isAuth: true,
			query: auditListQuerySchema,
			response: auditListResponseSchema,
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
				return { code: "NOT_FOUND", message: "未找到审计记录" };
			}
			if (!allowAll && record.actorId && record.actorId !== user.id) {
				set.status = 403;
				return { code: "FORBIDDEN", message: "无法查看其他用户的审计记录" };
			}
			return record;
		},
		{
			isAuth: true,
			params: auditParamsSchema,
			response: auditEventSchema,
			detail: { tags: ["Audit Logs"] },
		},
	);
