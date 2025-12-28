import { t } from "elysia";

const roleDataScopeSchema = t.Union([
	t.Literal("ALL"),
	t.Literal("ASSIGNED_LINES"),
	t.Literal("ASSIGNED_STATIONS"),
]);

const roleItemSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	description: t.Optional(t.String()),
	permissions: t.Array(t.String()),
	dataScope: roleDataScopeSchema,
	isSystem: t.Boolean(),
	createdAt: t.String(),
	updatedAt: t.String(),
});

export const roleCreateSchema = t.Object({
	code: t.String({ minLength: 1 }),
	name: t.String({ minLength: 1 }),
	description: t.Optional(t.String()),
	permissions: t.Array(t.String()),
	dataScope: roleDataScopeSchema,
});

export const roleUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	description: t.Optional(t.String()),
	permissions: t.Optional(t.Array(t.String())),
	dataScope: t.Optional(roleDataScopeSchema),
});

export const roleParamsSchema = t.Object({
	id: t.String(),
});

export const roleListResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		items: t.Array(roleItemSchema),
	}),
});

export const roleResponseSchema = t.Object({
	ok: t.Boolean(),
	data: roleItemSchema,
});

export const roleErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
