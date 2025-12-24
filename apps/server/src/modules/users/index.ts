import { Prisma } from "@better-app/db";
import { hashPassword } from "better-auth/crypto";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { AuditEntityType, UserRole } from "../../types/prisma-enums";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";

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
} satisfies Prisma.UserSelect;

const userUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	email: t.Optional(t.String()),
	role: t.Optional(t.Enum(UserRole)),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	isActive: t.Optional(t.Boolean()),
	enableWecomNotification: t.Optional(t.Boolean()),
});

const selfUpdateSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1 })),
	email: t.Optional(t.String()),
	department: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	image: t.Optional(t.String()),
	enableWecomNotification: t.Optional(t.Boolean()),
});

export const usersModule = new Elysia({
	prefix: "/users",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ query, db }) => {
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

			return { items, total, page, pageSize };
		},
		{
			isAuth: true,
			query: t.Object({
				page: t.Optional(t.Number({ minimum: 1 })),
				pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
				search: t.Optional(t.String()),
				role: t.Optional(t.String()),
			}),
			detail: { tags: ["Users"] },
		},
	)
	.post(
		"/",
		async ({ body, db, set, user, auth, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			if (user.role !== UserRole.admin) {
				set.status = 403;
				return { code: "FORBIDDEN", message: "只有管理员可以创建用户" };
			}

			if (!body.email) {
				set.status = 400;
				return { code: "EMAIL_REQUIRED", message: "邮箱是必填项" };
			}

			try {
				await auth.api.signUpEmail({
					body: {
						email: body.email,
						password: DEFAULT_USER_PASSWORD,
						name: body.name,
					},
				});

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

				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: createdUser.id,
					entityDisplay: createdUser.email,
					action: "USER_CREATE",
					actor,
					status: "SUCCESS",
					before: null,
					after: createdUser,
					request: requestMeta,
				});

				return { ...createdUser, initialPassword: DEFAULT_USER_PASSWORD };
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) {
					if (error.code === "P2002") {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.USER,
							entityId: body.email,
							entityDisplay: body.email,
							action: "USER_CREATE",
							actor,
							status: "FAIL",
							errorCode: "CONFLICT",
							errorMessage: "邮箱或用户名已被占用",
							request: requestMeta,
						});
						set.status = 409;
						return { code: "CONFLICT", message: "邮箱或用户名已被占用" };
					}
				}

				console.error("Failed to create user", error);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: body.email,
					entityDisplay: body.email,
					action: "USER_CREATE",
					actor,
					status: "FAIL",
					errorCode: "INTERNAL_ERROR",
					errorMessage: error instanceof Error ? error.message : "创建用户失败",
					request: requestMeta,
				});
				set.status = 500;
				return { code: "INTERNAL_ERROR", message: "创建用户失败" };
			}
		},
		{
			isAuth: true,
			body: t.Object({
				name: t.String({ minLength: 1 }),
				email: t.String(),
				role: t.Enum(UserRole),
				department: t.Optional(t.String()),
				phone: t.Optional(t.String()),
				isActive: t.Boolean(),
				username: t.Optional(t.String()),
				enableWecomNotification: t.Optional(t.Boolean()),
			}),
			detail: { tags: ["Users"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, db, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			if (user.role !== UserRole.admin) {
				set.status = 403;
				return { code: "FORBIDDEN", message: "只有管理员可以更新用户信息" };
			}

			try {
				const before = await db.user.findUnique({
					where: { id: params.id },
					select: userSelectFields,
				});
				const updated = await db.user.update({
					where: { id: params.id },
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

				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: updated.id,
					entityDisplay: updated.email,
					action: "USER_UPDATE",
					actor,
					status: "SUCCESS",
					before,
					after: updated,
					request: requestMeta,
				});

				return updated;
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) {
					if (error.code === "P2025") {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.USER,
							entityId: params.id,
							entityDisplay: params.id,
							action: "USER_UPDATE",
							actor,
							status: "FAIL",
							errorCode: "NOT_FOUND",
							errorMessage: "用户不存在",
							request: requestMeta,
						});
						set.status = 404;
						return { code: "NOT_FOUND", message: "用户不存在" };
					}
					if (error.code === "P2002") {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.USER,
							entityId: params.id,
							entityDisplay: params.id,
							action: "USER_UPDATE",
							actor,
							status: "FAIL",
							errorCode: "CONFLICT",
							errorMessage: "邮箱或用户名已被占用",
							request: requestMeta,
						});
						set.status = 409;
						return { code: "CONFLICT", message: "邮箱或用户名已被占用" };
					}
				}

				console.error("Failed to update user", error);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: params.id,
					entityDisplay: params.id,
					action: "USER_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "INTERNAL_ERROR",
					errorMessage: error instanceof Error ? error.message : "更新用户失败",
					request: requestMeta,
				});
				set.status = 500;
				return { code: "INTERNAL_ERROR", message: "更新用户失败" };
			}
		},
		{
			isAuth: true,
			params: t.Object({
				id: t.String(),
			}),
			body: userUpdateSchema,
			detail: { tags: ["Users"] },
		},
	)
	.get(
		"/me",
		async ({ user, db }) => {
			return db.user.findUnique({
				where: { id: user.id },
				select: userSelectFields,
			});
		},
		{
			isAuth: true,
			detail: { tags: ["Users - Self"] },
		},
	)
	.patch(
		"/me",
		async ({ user, db, body, set, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			try {
				const before = await db.user.findUnique({
					where: { id: user.id },
					select: userSelectFields,
				});
				const updated = await db.user.update({
					where: { id: user.id },
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

				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: updated.id,
					entityDisplay: updated.email,
					action: "USER_PROFILE_UPDATE",
					actor,
					status: "SUCCESS",
					before,
					after: updated,
					request: requestMeta,
				});

				return updated;
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError) {
					if (error.code === "P2025") {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.USER,
							entityId: user.id,
							entityDisplay: user.id,
							action: "USER_PROFILE_UPDATE",
							actor,
							status: "FAIL",
							errorCode: "NOT_FOUND",
							errorMessage: "用户不存在",
							request: requestMeta,
						});
						set.status = 404;
						return { code: "NOT_FOUND", message: "用户不存在" };
					}
					if (error.code === "P2002") {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.USER,
							entityId: user.id,
							entityDisplay: user.id,
							action: "USER_PROFILE_UPDATE",
							actor,
							status: "FAIL",
							errorCode: "CONFLICT",
							errorMessage: "邮箱已被占用",
							request: requestMeta,
						});
						set.status = 409;
						return { code: "CONFLICT", message: "邮箱已被占用" };
					}
				}
				console.error("Failed to update profile", error);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: user.id,
					entityDisplay: user.id,
					action: "USER_PROFILE_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "INTERNAL_ERROR",
					errorMessage: error instanceof Error ? error.message : "更新个人资料失败",
					request: requestMeta,
				});
				set.status = 500;
				return { code: "INTERNAL_ERROR", message: "更新个人资料失败" };
			}
		},
		{
			isAuth: true,
			body: selfUpdateSchema,
			detail: { tags: ["Users - Self"] },
		},
	)
	.post(
		"/me/change-password",
		async ({ auth, request, body, set, db, user }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			try {
				// Handle legacy users that were created without a password (password column is null).
				const account = await db.account.findFirst({
					where: { userId: user.id },
				});

				if (!account) {
					set.status = 404;
					return { code: "ACCOUNT_NOT_FOUND", message: "账户不存在" };
				}

				if (!account.password) {
					const passwordHash = await hashPassword(body.newPassword);
					await db.account.update({
						where: { id: account.id },
						data: { password: passwordHash },
					});
				} else {
					await auth.api.changePassword({
						headers: request.headers,
						body: {
							currentPassword: body.currentPassword,
							newPassword: body.newPassword,
						},
					});
				}

				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: user.id,
					entityDisplay: user.email ?? user.id,
					action: "USER_PASSWORD_CHANGE",
					actor,
					status: "SUCCESS",
					request: requestMeta,
				});

				return { success: true };
			} catch (error) {
				console.error("Failed to change password", error);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.USER,
					entityId: user.id,
					entityDisplay: user.email ?? user.id,
					action: "USER_PASSWORD_CHANGE",
					actor,
					status: "FAIL",
					errorCode: "PASSWORD_CHANGE_FAILED",
					errorMessage: error instanceof Error ? error.message : "修改密码失败",
					request: requestMeta,
				});
				set.status = 400;
				return {
					code: "PASSWORD_CHANGE_FAILED",
					message: "修改密码失败，请确认当前密码是否正确",
				};
			}
		},
		{
			isAuth: true,
			body: t.Object({
				currentPassword: t.String(),
				newPassword: t.String(),
			}),
			detail: { tags: ["Users - Self"] },
		},
	);
