import { t } from "elysia";
import { AuditEntityType } from "../../types/prisma-enums";
import { auditDiffSchema } from "../../schemas/json-schemas";

export const auditEventSchema = t.Object({
	id: t.String(),
	entityType: t.Enum(AuditEntityType),
	entityId: t.String(),
	entityDisplay: t.Nullable(t.String()),
	action: t.String(),
	actorId: t.Nullable(t.String()),
	actorName: t.Nullable(t.String()),
	actorRole: t.Nullable(t.String()),
	actorType: t.Nullable(t.String()),
	status: t.String(),
	errorCode: t.Nullable(t.String()),
	errorMessage: t.Nullable(t.String()),
	diff: t.Nullable(auditDiffSchema),
	requestId: t.Nullable(t.String()),
	ip: t.Nullable(t.String()),
	userAgent: t.Nullable(t.String()),
	traceId: t.Nullable(t.String()),
	stationId: t.Nullable(t.String()),
	idempotencyKey: t.Nullable(t.String()),
	payload: t.Nullable(t.Any()),
	createdAt: t.String(),
});

export const auditListQuerySchema = t.Object({
	page: t.Optional(t.Number({ minimum: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
	actorId: t.Optional(t.String()),
	entityType: t.Optional(t.Enum(AuditEntityType)),
	entityId: t.Optional(t.String()),
	action: t.Optional(t.String()),
	status: t.Optional(t.String()),
	from: t.Optional(t.String()),
	to: t.Optional(t.String()),
});

export const auditListResponseSchema = t.Object({
	items: t.Array(auditEventSchema),
	total: t.Number(),
	page: t.Number(),
	pageSize: t.Number(),
});

export const auditParamsSchema = t.Object({
	id: t.String(),
});
