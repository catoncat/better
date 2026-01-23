import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

const lineSummarySchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	processType: Prismabox.ProcessType,
});

const lineDetailSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	processType: Prismabox.ProcessType,
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const lineListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(lineSummarySchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const lineResponseSchema = t.Object({
	ok: t.Boolean(),
	data: lineDetailSchema,
});

export const lineIdParamSchema = t.Object({
	lineId: t.String(),
});

export const lineUpdateSchema = t.Object({
	code: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
	name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
	processType: t.Optional(Prismabox.ProcessType),
});

export const lineProcessTypeUpdateSchema = t.Object({
	processType: Prismabox.ProcessType,
});

export const lineCreateSchema = t.Object({
	code: t.String({ minLength: 1, maxLength: 50 }),
	name: t.String({ minLength: 1, maxLength: 100 }),
	processType: Prismabox.ProcessType,
});

export const lineListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
	search: t.Optional(t.String()),
	processType: t.Optional(Prismabox.ProcessType),
	sort: t.Optional(t.String()),
});

export const lineDeleteResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		id: t.String(),
	}),
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
			// PREP_* 准备项检查（SMT Gap Phase 1）
			t.Literal("PREP_BAKE"),
			t.Literal("PREP_PASTE"),
			t.Literal("PREP_STENCIL_USAGE"),
			t.Literal("PREP_STENCIL_CLEAN"),
			t.Literal("PREP_SCRAPER"),
			t.Literal("PREP_FIXTURE"),
			t.Literal("PREP_PROGRAM"),
			// TIME_RULE 时间规则检查（SMT Gap Phase 2）
			t.Literal("TIME_RULE"),
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
