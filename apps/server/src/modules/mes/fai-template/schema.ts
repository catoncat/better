import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

const nullableJsonSchema = t.Union([t.Any(), t.Null()]);

export const faiTemplateIdParamsSchema = t.Object({
	templateId: t.String(),
});

const faiTemplateItemInputSchema = t.Object({
	seq: t.Integer({ minimum: 1 }),
	itemName: t.String({ minLength: 1 }),
	itemSpec: t.Optional(t.String()),
	required: t.Optional(t.Boolean()),
	meta: t.Optional(nullableJsonSchema),
});

export const faiTemplateCreateSchema = t.Object({
	code: t.String({ minLength: 1 }),
	name: t.String({ minLength: 1 }),
	productCode: t.String({ minLength: 1 }),
	processType: Prismabox.ProcessType,
	version: t.Optional(t.String()),
	isActive: t.Optional(t.Boolean({ default: true })),
	meta: t.Optional(nullableJsonSchema),
	items: t.Array(faiTemplateItemInputSchema, { minItems: 1 }),
});

export const faiTemplateUpdateSchema = t.Object({
	code: t.Optional(t.String({ minLength: 1 })),
	name: t.Optional(t.String({ minLength: 1 })),
	productCode: t.Optional(t.String({ minLength: 1 })),
	processType: t.Optional(Prismabox.ProcessType),
	version: t.Optional(t.String()),
	isActive: t.Optional(t.Boolean()),
	meta: t.Optional(nullableJsonSchema),
	items: t.Optional(t.Array(faiTemplateItemInputSchema, { minItems: 1 })),
});

export const faiTemplateListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 30 })),
	search: t.Optional(t.String()),
	productCode: t.Optional(t.String()),
	processType: t.Optional(Prismabox.ProcessType),
	isActive: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
});

const faiTemplateItemSchema = t.Object({
	id: t.String(),
	templateId: t.String(),
	seq: t.Number(),
	itemName: t.String(),
	itemSpec: t.Union([t.String(), t.Null()]),
	required: t.Boolean(),
	meta: nullableJsonSchema,
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

const faiTemplateSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	productCode: t.String(),
	processType: Prismabox.ProcessType,
	version: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	meta: nullableJsonSchema,
	items: t.Array(faiTemplateItemSchema),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

const faiTemplateSummarySchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	productCode: t.String(),
	processType: Prismabox.ProcessType,
	version: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	itemCount: t.Number(),
	updatedAt: t.String({ format: "date-time" }),
});

export const faiTemplateListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(faiTemplateSummarySchema),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
});

export const faiTemplateResponseSchema = t.Object({
	ok: t.Boolean(),
	data: faiTemplateSchema,
});

export const faiTemplateErrorResponseSchema = t.Object({
	ok: t.Literal(false),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
