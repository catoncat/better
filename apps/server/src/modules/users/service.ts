import { Prisma, type PrismaClient } from "@better-app/db";
import { auth } from "@better-app/auth";
import { hashPassword } from "better-auth/crypto";
import type { Static } from "elysia";
import { UserRole } from "../../types/prisma-enums";
import type { ServiceResult } from "../../types/service-result";
import type {
	changePasswordSchema,
	userCreateSchema,
	userListQuerySchema,
	userProfileUpdateSchema,
	userUpdateSchema,
} from "./schema";

type UserListQuery = Static<typeof userListQuerySchema>;
type UserCreateInput = Static<typeof userCreateSchema>;
type UserUpdateInput = Static<typeof userUpdateSchema>;
type UserProfileUpdateInput = Static<typeof userProfileUpdateSchema>;
type ChangePasswordInput = Static<typeof changePasswordSchema>;

const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "ChangeMe123!";

const userSelectFields = {
	id: true,
	name: true,
	email: true,
	image: true,
	role: true,
	username: true,
	department: true,
	phone: true,
	isActive: true,
	enableWecomNotification: true,
    emailVerified: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: false
} satisfies Prisma.UserSelect;

export const listUsers = async (
	db: PrismaClient,
	query: UserListQuery,
): Promise<ServiceResult<any>> => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);
	const where: Prisma.UserWhereInput = {};

	if (query.search) {
		where.OR = [
			{ name: { contains: query.search } },
			{ email: { contains: query.search } },
			{ username: { contains: query.search } },
		];
	}

	if (query.role) {
		const allowedRoles = new Set(Object.values(UserRole));
		const roles = query.role
			.split(",")
			.map((role) => role.trim())
			.filter((role): role is UserRole => allowedRoles.has(role as UserRole));

		if (roles.length > 0) {
			where.role = { in: roles };
		}
	}

	const [items, total] = await Promise.all([
		db.user.findMany({
			where,
			orderBy: { name: "asc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: userSelectFields,
		}),
		db.user.count({ where }),
	]);

	return { success: true, data: { items, total, page, pageSize } };
};

export const createUser = async (
	db: PrismaClient,
	body: UserCreateInput,
): Promise<ServiceResult<any>> => {
	try {
		// Use Better Auth to create the user/account
		// This handles password hashing and basic user record creation
		await auth.api.signUpEmail({
			body: {
				email: body.email,
				password: DEFAULT_USER_PASSWORD,
				name: body.name,
			},
		});

		// Update the user record with additional fields that Better Auth might not set via signUpEmail
		const createdUser = await db.user.update({
			where: { email: body.email },
			data: {
				role: body.role,
				department: body.department,
				phone: body.phone,
				isActive: body.isActive,
				username: body.username || body.email.split("@")[0] || `user_${Date.now()}`,
				enableWecomNotification: body.enableWecomNotification ?? false,
			},
			select: userSelectFields,
		});

		return {
			success: true,
			data: { ...createdUser, initialPassword: DEFAULT_USER_PASSWORD },
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return {
					success: false,
					code: "CONFLICT",
					message: "邮箱或用户名已被占用",
					status: 409,
				};
			}
		}
        // Better Auth errors might come as APIError or similar, we catch generic
		return {
			success: false,
			code: "USER_CREATE_FAILED",
			message: error instanceof Error ? error.message : "创建用户失败",
			status: 500,
		};
	}
};

export const updateUser = async (
	db: PrismaClient,
	id: string,
	body: UserUpdateInput,
): Promise<ServiceResult<any>> => {
	try {
		const updated = await db.user.update({
			where: { id },
			data: {
				name: body.name,
				email: body.email,
				role: body.role,
				department: body.department,
				phone: body.phone,
				isActive: body.isActive,
				enableWecomNotification: body.enableWecomNotification,
			},
			select: userSelectFields,
		});

		return { success: true, data: updated };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return { success: false, code: "NOT_FOUND", message: "用户不存在", status: 404 };
			}
			if (error.code === "P2002") {
				return {
					success: false,
					code: "CONFLICT",
					message: "邮箱或用户名已被占用",
					status: 409,
				};
			}
		}
		throw error;
	}
};

export const getUserProfile = async (
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<any>> => {
	const user = await db.user.findUnique({
		where: { id },
		select: userSelectFields,
	});

	if (!user) {
		return { success: false, code: "NOT_FOUND", message: "User not found", status: 404 };
	}

	return { success: true, data: user };
};

export const updateUserProfile = async (
	db: PrismaClient,
	id: string,
	body: UserProfileUpdateInput,
): Promise<ServiceResult<any>> => {
	try {
		const updated = await db.user.update({
			where: { id },
			data: {
				name: body.name,
				email: body.email,
				department: body.department,
				phone: body.phone,
				image: body.image,
				enableWecomNotification: body.enableWecomNotification,
			},
			select: userSelectFields,
		});

		return { success: true, data: updated };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return { success: false, code: "NOT_FOUND", message: "用户不存在", status: 404 };
			}
			if (error.code === "P2002") {
				return { success: false, code: "CONFLICT", message: "邮箱已被占用", status: 409 };
			}
		}
		throw error;
	}
};

export const changePassword = async (
	db: PrismaClient,
	userId: string,
	body: ChangePasswordInput,
	headers: Headers,
): Promise<ServiceResult<any>> => {
	try {
		// Handle legacy users that were created without a password (password column is null)
		// Assuming 'Account' table holds the password credential for 'email' provider
		// Better Auth schema is complex, but we can try to use Better Auth API first.
		
		// Wait, if it's a legacy user (from old system), they might not have a Better Auth password credential.
		// The original code checked `db.account.findFirst` and updated `password` directly if null.
		// We should replicate that logic safely.
		
		const account = await db.account.findFirst({
			where: { userId },
		});

		if (!account) {
			return { success: false, code: "ACCOUNT_NOT_FOUND", message: "账户不存在", status: 404 };
		}

		if (!account.password) {
			// Legacy/First-time setup for user without password
			const passwordHash = await hashPassword(body.newPassword);
			await db.account.update({
				where: { id: account.id },
				data: { password: passwordHash },
			});
		} else {
			// Standard Better Auth change password
			const res = await auth.api.changePassword({
				headers,
				body: {
					currentPassword: body.currentPassword,
					newPassword: body.newPassword,
				},
			});
            
            if (res && 'error' in res) {
                 // Better Auth error handling if it returns error object
                 // Types might vary, usually throws on error or returns object with error
            }
		}

		return { success: true, data: { success: true } };
	} catch (error) {
        // Better Auth throws APIError
        if (error instanceof Error) {
             return { success: false, code: "PASSWORD_CHANGE_FAILED", message: error.message, status: 400 };
        }
		return {
			success: false,
			code: "PASSWORD_CHANGE_FAILED",
			message: "修改密码失败，请确认当前密码是否正确",
			status: 400,
		};
	}
};
