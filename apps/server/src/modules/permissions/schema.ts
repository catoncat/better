import { t } from "elysia";

const roleDefinitionSchema = t.Object({
	code: t.String(),
	name: t.String(),
	permissions: t.Array(t.String()),
	dataScope: t.Union([
		t.Literal("ALL"),
		t.Literal("ASSIGNED_LINES"),
		t.Literal("ASSIGNED_STATIONS"),
	]),
});

const userPermissionsSchema = t.Object({
	id: t.String(),
	roles: t.Array(roleDefinitionSchema),
	lineIds: t.Array(t.String()),
	stationIds: t.Array(t.String()),
});

export const permissionsMeResponseSchema = t.Object({
	ok: t.Boolean(),
	data: userPermissionsSchema,
});

export const permissionsErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
