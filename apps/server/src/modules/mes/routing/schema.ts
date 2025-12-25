import { t } from "elysia";
import { StationType } from "@better-app/db";
import * as Prismabox from "@better-app/db/prismabox";

export const routingCodeParamsSchema = t.Object({
	routingCode: t.String(),
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
