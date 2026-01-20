import { ProcessType } from "@better-app/db";
import { t } from "elysia";

const lineSummarySchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	processType: t.Enum(ProcessType),
});

export const lineListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(lineSummarySchema),
	}),
});

export const lineResponseSchema = t.Object({
	ok: t.Boolean(),
	data: lineSummarySchema,
});

export const lineIdParamSchema = t.Object({
	lineId: t.String(),
});

export const lineUpdateSchema = t.Object({
	processType: t.Enum(ProcessType),
});

// ReadinessItemType enum values as string array schema
export const readinessConfigSchema = t.Object({
	enabled: t.Array(
		t.Union([
			t.Literal("EQUIPMENT"),
			t.Literal("MATERIAL"),
			t.Literal("ROUTE"),
			t.Literal("STENCIL"),
			t.Literal("SOLDER_PASTE"),
			t.Literal("LOADING"),
		]),
		{
			description: "Enabled readiness check types for this line",
		},
	),
});

export const readinessConfigResponseSchema = t.Object({
	ok: t.Boolean(),
	data: readinessConfigSchema,
});

export const readinessConfigUpdateBodySchema = readinessConfigSchema;

export const errorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
