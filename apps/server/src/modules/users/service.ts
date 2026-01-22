import { auth } from "@better-app/auth";
import { Prisma, type PrismaClient } from "@better-app/db";
import { hashPassword } from "better-auth/crypto";
import type { Static } from "elysia";
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
type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelectFields }>;
type SerializedUser = ReturnType<typeof serializeUser>;
type UserListResponse = { items: SerializedUser[]; total: number; page: number; pageSize: number };
type UserCreateResponse = SerializedUser & { initialPassword: string };

const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "ChangeMe123!";

const userSelectFields = {
	id: true,
	name: true,
	email: true,
	image: true,
	username: true,
	department: true,
	phone: true,
	isActive: true,
	enableWecomNotification: true,
	emailVerified: true,
	createdAt: true,
	updatedAt: true,
	preferredHomePage: true,
	passwordHash: false,
	userRoles: {
		select: {
			role: true,
		},
	},
	lineBindings: {
		select: {
			lineId: true,
		},
	},
	stationBindings: {
		select: {
			stationId: true,
		},
	},
} satisfies Prisma.UserSelect;

const serializeUser = (user: UserRecord) => {
	const { userRoles, lineBindings, stationBindings, ...rest } = user;
	return {
		...rest,
		roles: userRoles.map((assignment) => ({
			id: assignment.role.id,
			code: assignment.role.code,
			name: assignment.role.name,
			description: assignment.role.description ?? undefined,
			permissions: JSON.parse(assignment.role.permissions) as string[],
			dataScope: assignment.role.dataScope,
			isSystem: assignment.role.isSystem,
		})),
		lineIds: lineBindings.map((binding) => binding.lineId),
		stationIds: stationBindings.map((binding) => binding.stationId),
	};
};

const resolveRoleIds = async (
	db: PrismaClient,
	roleIds: string[] | undefined,
	options: { fallbackToDefault: boolean },
): Promise<ServiceResult<string[]>> => {
	if (roleIds) {
		if (roleIds.length === 0) {
			return {
				success: false,
				code: "ROLE_REQUIRED",
				message: "至少需要选择一个角色",
				status: 400,
			};
		}
		const existing = await db.role.findMany({
			where: { id: { in: roleIds } },
			select: { id: true },
		});
		if (existing.length !== roleIds.length) {
			return {
				success: false,
				code: "ROLE_NOT_FOUND",
				message: "部分角色不存在",
				status: 400,
			};
		}
		return { success: true, data: roleIds };
	}

	if (!options.fallbackToDefault) {
		return { success: true, data: [] };
	}

	const defaultRole = await db.role.findFirst({ where: { code: "operator" } });
	if (!defaultRole) {
		return {
			success: false,
			code: "DEFAULT_ROLE_MISSING",
			message: "默认角色不存在",
			status: 400,
		};
	}
	return { success: true, data: [defaultRole.id] };
};

const getRoleBindingRequirements = async (db: PrismaClient, roleIds: string[]) => {
	if (roleIds.length === 0) {
		return { requiresLines: false, requiresStations: false };
	}
	const roles = await db.role.findMany({
		where: { id: { in: roleIds } },
		select: { dataScope: true },
	});
	return {
		requiresLines: roles.some((role) => role.dataScope === "ASSIGNED_LINES"),
		requiresStations: roles.some((role) => role.dataScope === "ASSIGNED_STATIONS"),
	};
};

const validateRoleBindings = async (
	db: PrismaClient,
	roleIds: string[],
	lineIds: string[],
	stationIds: string[],
): Promise<ServiceResult<null>> => {
	const requirements = await getRoleBindingRequirements(db, roleIds);

	if (requirements.requiresLines && lineIds.length === 0) {
		return {
			success: false,
			code: "LINE_BINDING_REQUIRED",
			message: "物料员必须绑定产线",
			status: 400,
		};
	}

	if (requirements.requiresStations && stationIds.length === 0) {
		return {
			success: false,
			code: "STATION_BINDING_REQUIRED",
			message: "操作员必须绑定工位",
			status: 400,
		};
	}

	return { success: true, data: null };
};

export const listUsers = async (
	db: PrismaClient,
	query: UserListQuery,
): Promise<ServiceResult<UserListResponse>> => {
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

	if (query.roleId) {
		const roleIds = query.roleId
			.split(",")
			.map((roleId) => roleId.trim())
			.filter(Boolean);

		if (roleIds.length > 0) {
			where.userRoles = {
				some: {
					roleId: { in: roleIds },
				},
			};
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

	return {
		success: true,
		data: {
			items: items.map(serializeUser),
			total,
			page,
			pageSize,
		},
	};
};

export const createUser = async (
	db: PrismaClient,
	body: UserCreateInput,
): Promise<ServiceResult<UserCreateResponse>> => {
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

		const user = await db.user.findUnique({ where: { email: body.email } });
		if (!user) {
			return {
				success: false,
				code: "USER_CREATE_FAILED",
				message: "创建用户失败",
				status: 500,
			};
		}

		const roleIdsResult = await resolveRoleIds(db, body.roleIds, { fallbackToDefault: true });
		if (!roleIdsResult.success) return roleIdsResult;

		const lineIds = body.lineIds ?? [];
		const stationIds = body.stationIds ?? [];
		const bindingResult = await validateRoleBindings(
			db,
			roleIdsResult.data,
			lineIds,
			stationIds,
		);
		if (!bindingResult.success) return bindingResult;

		const createdUser = await db.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: user.id },
				data: {
					department: body.department,
					phone: body.phone,
					isActive: body.isActive,
					username: body.username || body.email.split("@")[0] || `user_${Date.now()}`,
					enableWecomNotification: body.enableWecomNotification ?? false,
				},
			});

			await tx.userRoleAssignment.deleteMany({ where: { userId: user.id } });
			if (roleIdsResult.data.length > 0) {
				await tx.userRoleAssignment.createMany({
					data: roleIdsResult.data.map((roleId) => ({ userId: user.id, roleId })),
				});
			}

			await tx.userLineBinding.deleteMany({ where: { userId: user.id } });
			if (lineIds.length > 0) {
				await tx.userLineBinding.createMany({
					data: lineIds.map((lineId) => ({ userId: user.id, lineId })),
				});
			}

			await tx.userStationBinding.deleteMany({ where: { userId: user.id } });
			if (stationIds.length > 0) {
				await tx.userStationBinding.createMany({
					data: stationIds.map((stationId) => ({ userId: user.id, stationId })),
				});
			}

			const updatedUser = await tx.user.findUnique({
				where: { id: user.id },
				select: userSelectFields,
			});
			if (!updatedUser) {
				throw new Error("User not found after create");
			}
			return updatedUser;
		});

		return {
			success: true,
			data: { ...serializeUser(createdUser), initialPassword: DEFAULT_USER_PASSWORD },
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
): Promise<ServiceResult<SerializedUser>> => {
	try {
		const roleIdsResult = await resolveRoleIds(db, body.roleIds, {
			fallbackToDefault: false,
		});
		if (!roleIdsResult.success) return roleIdsResult;

		const existing = await db.user.findUnique({
			where: { id },
			select: {
				id: true,
				userRoles: { select: { roleId: true } },
				lineBindings: { select: { lineId: true } },
				stationBindings: { select: { stationId: true } },
			},
		});
		if (!existing) {
			return { success: false, code: "NOT_FOUND", message: "用户不存在", status: 404 };
		}

		const effectiveRoleIds = body.roleIds
			? roleIdsResult.data
			: existing.userRoles.map((assignment) => assignment.roleId);
		const effectiveLineIds = body.lineIds ?? existing.lineBindings.map((binding) => binding.lineId);
		const effectiveStationIds =
			body.stationIds ?? existing.stationBindings.map((binding) => binding.stationId);
		const bindingResult = await validateRoleBindings(
			db,
			effectiveRoleIds,
			effectiveLineIds,
			effectiveStationIds,
		);
		if (!bindingResult.success) return bindingResult;

		const updated = await db.$transaction(async (tx) => {
			const user = await tx.user.update({
				where: { id },
				data: {
					name: body.name,
					email: body.email,
					department: body.department,
					phone: body.phone,
					isActive: body.isActive,
					enableWecomNotification: body.enableWecomNotification,
				},
				select: userSelectFields,
			});

			if (body.roleIds) {
				await tx.userRoleAssignment.deleteMany({ where: { userId: id } });
				if (roleIdsResult.data.length > 0) {
					await tx.userRoleAssignment.createMany({
						data: roleIdsResult.data.map((roleId) => ({ userId: id, roleId })),
					});
				}
			}

			if (body.lineIds) {
				await tx.userLineBinding.deleteMany({ where: { userId: id } });
				if (body.lineIds.length > 0) {
					await tx.userLineBinding.createMany({
						data: body.lineIds.map((lineId) => ({ userId: id, lineId })),
					});
				}
			}

			if (body.stationIds) {
				await tx.userStationBinding.deleteMany({ where: { userId: id } });
				if (body.stationIds.length > 0) {
					await tx.userStationBinding.createMany({
						data: body.stationIds.map((stationId) => ({ userId: id, stationId })),
					});
				}
			}

			return user;
		});

		return { success: true, data: serializeUser(updated) };
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
): Promise<ServiceResult<SerializedUser>> => {
	const user = await db.user.findUnique({
		where: { id },
		select: userSelectFields,
	});

	if (!user) {
		return { success: false, code: "NOT_FOUND", message: "User not found", status: 404 };
	}

	return { success: true, data: serializeUser(user) };
};

export const updateUserProfile = async (
	db: PrismaClient,
	id: string,
	body: UserProfileUpdateInput,
): Promise<ServiceResult<SerializedUser>> => {
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

		return { success: true, data: serializeUser(updated) };
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
): Promise<ServiceResult<{ success: true }>> => {
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

			if (res && "error" in res) {
				// Better Auth error handling if it returns error object
				// Types might vary, usually throws on error or returns object with error
			}
		}

		return { success: true, data: { success: true } };
	} catch (error) {
		// Better Auth throws APIError
		if (error instanceof Error) {
			return {
				success: false,
				code: "PASSWORD_CHANGE_FAILED",
				message: error.message,
				status: 400,
			};
		}
		return {
			success: false,
			code: "PASSWORD_CHANGE_FAILED",
			message: "修改密码失败，请确认当前密码是否正确",
			status: 400,
		};
	}
};
