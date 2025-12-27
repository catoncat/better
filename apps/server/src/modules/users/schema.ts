import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";
import { UserRole } from "../../types/prisma-enums";

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
	role: t.Optional(t.String()),
});

export const userParamsSchema = t.Object({
	id: t.String(),
});

// --- Body Schemas ---
export const userCreateSchema = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String(),
	role: t.Enum(UserRole),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	isActive: t.Boolean(),
	username: t.Optional(t.String()),
	enableWecomNotification: t.Optional(t.Boolean()),
});

export const userUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	email: t.Optional(t.String()),
	role: t.Optional(t.Enum(UserRole)),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	isActive: t.Optional(t.Boolean()),
	enableWecomNotification: t.Optional(t.Boolean()),
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
const userResponseItem = t.Omit(Prismabox.UserPlain, ["passwordHash"]);

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
	t.Intersect([
		userResponseItem,
		t.Object({
			initialPassword: t.String(),
		}),
	]),
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
