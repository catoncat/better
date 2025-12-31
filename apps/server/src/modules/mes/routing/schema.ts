import { StationType } from "@better-app/db";
import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

export const routingCodeParamsSchema = t.Object({
	routingCode: t.String(),
});

export const routeListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 30 })),
	search: t.Optional(t.String()),
	sourceSystem: t.Optional(t.String()),
});

const scopeTypeSchema = t.Union([
	t.Literal("ROUTE"),
	t.Literal("OPERATION"),
	t.Literal("STEP"),
	t.Literal("SOURCE_STEP"),
]);

export const executionConfigCreateSchema = t.Object({
	scopeType: scopeTypeSchema,
	stepNo: t.Optional(t.Number()),
	sourceStepKey: t.Optional(t.String()),
	operationCode: t.Optional(t.String()),
	stationType: t.Optional(t.Enum(StationType)),
	stationGroupCode: t.Optional(t.Union([t.String(), t.Null()])),
	allowedStationIds: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
	requiresFAI: t.Optional(t.Boolean()),
	requiresAuthorization: t.Optional(t.Boolean()),
	dataSpecIds: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
	ingestMapping: t.Optional(t.Union([t.Any(), t.Null()])),
	meta: t.Optional(t.Union([t.Any(), t.Null()])),
});

export const executionConfigUpdateSchema = t.Object({
	stationType: t.Optional(t.Enum(StationType)),
	stationGroupCode: t.Optional(t.Union([t.String(), t.Null()])),
	allowedStationIds: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
	requiresFAI: t.Optional(t.Boolean()),
	requiresAuthorization: t.Optional(t.Boolean()),
	dataSpecIds: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
	ingestMapping: t.Optional(t.Union([t.Any(), t.Null()])),
	meta: t.Optional(t.Union([t.Any(), t.Null()])),
});

export const executionConfigListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(Prismabox.RouteExecutionConfig),
	}),
});

export const executionConfigResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.RouteExecutionConfig,
});

export const routeCompileResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.ExecutableRouteVersionPlain,
});

const routeSummarySchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	sourceSystem: t.String(),
	productCode: t.Union([t.String(), t.Null()]),
	version: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	effectiveFrom: t.Union([t.String({ format: "date-time" }), t.Null()]),
	effectiveTo: t.Union([t.String({ format: "date-time" }), t.Null()]),
	updatedAt: t.String({ format: "date-time" }),
	stepCount: t.Number(),
});

export const routeListResponseSchema = t.Object({
	items: t.Array(routeSummarySchema),
	total: t.Number(),
	page: t.Number(),
	pageSize: t.Number(),
});

const routeDetailSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	sourceSystem: t.String(),
	sourceKey: t.Union([t.String(), t.Null()]),
	productCode: t.Union([t.String(), t.Null()]),
	version: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	effectiveFrom: t.Union([t.String({ format: "date-time" }), t.Null()]),
	effectiveTo: t.Union([t.String({ format: "date-time" }), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

const routeStepDetailSchema = t.Object({
	stepNo: t.Number(),
	sourceStepKey: t.Union([t.String(), t.Null()]),
	operationCode: t.String(),
	operationName: t.String(),
	stationGroupCode: t.Union([t.String(), t.Null()]),
	stationGroupName: t.Union([t.String(), t.Null()]),
	stationType: t.String(),
	requiresFAI: t.Boolean(),
	isLast: t.Boolean(),
});

export const routeDetailResponseSchema = t.Object({
	route: routeDetailSchema,
	steps: t.Array(routeStepDetailSchema),
});

export const routeVersionListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(Prismabox.ExecutableRouteVersionPlain),
	}),
});

export const routeVersionResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.ExecutableRouteVersionPlain,
});

export const routeErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
