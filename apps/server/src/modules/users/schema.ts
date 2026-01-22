import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

// --- Helpers ---
type SchemaType = Parameters<typeof t.Object>[0][string];

const createResponseSchema = <T extends SchemaType>(schema: T) =>
	t.Object({
		ok: t.Boolean(),
		data: schema,
	});

// --- Query Schemas ---
export const userListQuerySchema = t.Object({
	page: t.Optional(t.Number({ minimum: 1 })),
	pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
	search: t.Optional(t.String()),
	roleId: t.Optional(t.String()),
});

export const userParamsSchema = t.Object({
	id: t.String(),
});

// --- Body Schemas ---
export const userCreateSchema = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String(),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	isActive: t.Boolean(),
	username: t.Optional(t.String()),
	enableWecomNotification: t.Optional(t.Boolean()),
	roleIds: t.Array(t.String(), { minItems: 1 }),
	lineIds: t.Optional(t.Array(t.String())),
	stationIds: t.Optional(t.Array(t.String())),
});

export const userUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	email: t.Optional(t.String()),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	isActive: t.Optional(t.Boolean()),
	enableWecomNotification: t.Optional(t.Boolean()),
	roleIds: t.Optional(t.Array(t.String(), { minItems: 1 })),
	lineIds: t.Optional(t.Array(t.String())),
	stationIds: t.Optional(t.Array(t.String())),
});

export const userProfileUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	email: t.Optional(t.String()),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	image: t.Optional(t.String()),
	enableWecomNotification: t.Optional(t.Boolean()),
});

export const changePasswordSchema = t.Object({
	currentPassword: t.String(),
	newPassword: t.String(),
});

// --- Response Schemas ---
const roleAssignmentSchema = t.Object({
	id: t.String(),
	code: t.String(),
	name: t.String(),
	description: t.Optional(t.String()),
	permissions: t.Array(t.String()),
	dataScope: t.Union([
		t.Literal("ALL"),
		t.Literal("ASSIGNED_LINES"),
		t.Literal("ASSIGNED_STATIONS"),
	]),
	isSystem: t.Boolean(),
});

// Use t.Composite to merge Prismabox schema with additional fields
// t.Composite merges into single Object, avoiding allOf + additionalProperties conflict
const userResponseItem = t.Composite(
	[
		t.Omit(Prismabox.UserPlain, ["passwordHash", "role"]),
		t.Object({
			roles: t.Array(roleAssignmentSchema),
			lineIds: t.Array(t.String()),
			stationIds: t.Array(t.String()),
		}),
	],
	{ additionalProperties: false },
);

export const userListResponseSchema = createResponseSchema(
	t.Object({
		items: t.Array(userResponseItem),
		total: t.Number(),
		page: t.Number(),
		pageSize: t.Number(),
	}),
);

export const userResponseSchema = createResponseSchema(userResponseItem);

// For create user, we might return the user with an initial password or just the user.
// The existing implementation returns { ...user, initialPassword: ... }
export const userCreateResponseSchema = createResponseSchema(
	t.Composite(
		[
			userResponseItem,
			t.Object({
				initialPassword: t.String(),
			}),
		],
		{ additionalProperties: false },
	),
);

export const successResponseSchema = createResponseSchema(
	t.Object({
		success: t.Boolean(),
	}),
);

export const userErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
