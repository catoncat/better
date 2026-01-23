import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

// ==========================================
// Maintenance Record Schemas
// ==========================================

const maintenanceRecordSummarySchema = t.Object({
	id: t.String(),
	lineId: t.Nullable(t.String()),
	entityType: Prismabox.MaintenanceEntityType,
	entityId: t.String(),
	entityDisplay: t.Nullable(t.String()),
	maintenanceType: Prismabox.MaintenanceType,
	status: Prismabox.MaintenanceStatus,
	description: t.String(),
	reportedAt: t.String({ format: "date-time" }),
	reportedBy: t.String(),
	completedAt: t.Nullable(t.String({ format: "date-time" })),
	completedBy: t.Nullable(t.String()),
});

const maintenanceRecordDetailSchema = t.Object({
	id: t.String(),
	lineId: t.Nullable(t.String()),
	entityType: Prismabox.MaintenanceEntityType,
	entityId: t.String(),
	entityDisplay: t.Nullable(t.String()),
	maintenanceType: Prismabox.MaintenanceType,
	status: Prismabox.MaintenanceStatus,
	description: t.String(),
	resolution: t.Nullable(t.String()),
	partsReplaced: t.Nullable(t.String()),
	cost: t.Nullable(t.Number()),
	reportedAt: t.String({ format: "date-time" }),
	startedAt: t.Nullable(t.String({ format: "date-time" })),
	completedAt: t.Nullable(t.String({ format: "date-time" })),
	reportedBy: t.String(),
	assignedTo: t.Nullable(t.String()),
	completedBy: t.Nullable(t.String()),
	verifiedBy: t.Nullable(t.String()),
	verifiedAt: t.Nullable(t.String({ format: "date-time" })),
	remark: t.Nullable(t.String()),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const maintenanceListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
	lineId: t.Optional(t.String()),
	entityType: t.Optional(Prismabox.MaintenanceEntityType),
	status: t.Optional(Prismabox.MaintenanceStatus),
	from: t.Optional(t.String({ format: "date-time" })),
	to: t.Optional(t.String({ format: "date-time" })),
	sort: t.Optional(t.String()),
});

export const maintenanceListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(maintenanceRecordSummarySchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const maintenanceResponseSchema = t.Object({
	ok: t.Boolean(),
	data: maintenanceRecordDetailSchema,
});

export const maintenanceIdParamSchema = t.Object({
	maintenanceId: t.String(),
});

export const maintenanceCreateSchema = t.Object({
	lineId: t.Optional(t.String()),
	entityType: Prismabox.MaintenanceEntityType,
	entityId: t.String({ minLength: 1 }),
	entityDisplay: t.Optional(t.String()),
	maintenanceType: Prismabox.MaintenanceType,
	description: t.String({ minLength: 1 }),
	reportedAt: t.Optional(t.String({ format: "date-time" })),
	assignedTo: t.Optional(t.String()),
	remark: t.Optional(t.String()),
});

export const maintenanceUpdateSchema = t.Object({
	assignedTo: t.Optional(t.String()),
	resolution: t.Optional(t.String()),
	partsReplaced: t.Optional(t.String()),
	cost: t.Optional(t.Number()),
	startedAt: t.Optional(t.String({ format: "date-time" })),
	remark: t.Optional(t.String()),
});

export const maintenanceCompleteSchema = t.Object({
	resolution: t.String({ minLength: 1 }),
	partsReplaced: t.Optional(t.String()),
	cost: t.Optional(t.Number()),
	remark: t.Optional(t.String()),
});

export const maintenanceVerifySchema = t.Object({
	remark: t.Optional(t.String()),
});

export const errorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
