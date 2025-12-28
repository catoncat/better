import { ALL_PERMISSIONS, PRESET_ROLES, type PrismaClient, type RoleDataScope } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../types/service-result";
import type { roleCreateSchema, roleUpdateSchema } from "./schema";

type RoleCreateInput = Static<typeof roleCreateSchema>;
type RoleUpdateInput = Static<typeof roleUpdateSchema>;

const serializeRole = (role: {
	id: string;
	code: string;
	name: string;
	description: string | null;
	permissions: string;
	dataScope: RoleDataScope;
	isSystem: boolean;
	createdAt: Date;
	updatedAt: Date;
}) => ({
	id: role.id,
	code: role.code,
	name: role.name,
	description: role.description ?? undefined,
	permissions: JSON.parse(role.permissions) as string[],
	dataScope: role.dataScope,
	isSystem: role.isSystem,
	createdAt: role.createdAt.toISOString(),
	updatedAt: role.updatedAt.toISOString(),
});

const validatePermissions = (permissions: string[]): ServiceResult<null> => {
	const invalid = permissions.filter(
		(perm) => !ALL_PERMISSIONS.includes(perm as (typeof ALL_PERMISSIONS)[number]),
	);
	if (invalid.length > 0) {
		return {
			success: false,
			code: "INVALID_PERMISSION",
			message: `Invalid permissions: ${invalid.join(", ")}`,
			status: 400,
		};
	}
	return { success: true, data: null };
};

export const listRoles = async (
	db: PrismaClient,
): Promise<ServiceResult<{ items: ReturnType<typeof serializeRole>[] }>> => {
	const roles = await db.role.findMany({
		orderBy: [{ isSystem: "desc" }, { code: "asc" }],
	});

	return {
		success: true,
		data: {
			items: roles.map(serializeRole),
		},
	};
};

export const createRole = async (
	db: PrismaClient,
	input: RoleCreateInput,
): Promise<ServiceResult<ReturnType<typeof serializeRole>>> => {
	const validation = validatePermissions(input.permissions);
	if (!validation.success) return validation;

	const presetCodes = new Set(PRESET_ROLES.map((role) => role.code));
	if (presetCodes.has(input.code)) {
		return {
			success: false,
			code: "ROLE_CODE_RESERVED",
			message: "角色代码已被系统角色占用",
			status: 400,
		};
	}

	const exists = await db.role.findUnique({ where: { code: input.code } });
	if (exists) {
		return {
			success: false,
			code: "ROLE_EXISTS",
			message: "角色代码已存在",
			status: 409,
		};
	}

	const role = await db.role.create({
		data: {
			code: input.code,
			name: input.name,
			description: input.description ?? null,
			permissions: JSON.stringify(input.permissions),
			dataScope: input.dataScope,
			isSystem: false,
		},
	});

	return { success: true, data: serializeRole(role) };
};

export const updateRole = async (
	db: PrismaClient,
	roleId: string,
	input: RoleUpdateInput,
): Promise<ServiceResult<ReturnType<typeof serializeRole>>> => {
	const role = await db.role.findUnique({ where: { id: roleId } });
	if (!role) {
		return { success: false, code: "NOT_FOUND", message: "角色不存在", status: 404 };
	}

	if (role.isSystem && (input.permissions || input.dataScope)) {
		return {
			success: false,
			code: "ROLE_SYSTEM_LOCKED",
			message: "系统预置角色不可修改权限或数据范围",
			status: 400,
		};
	}

	if (input.permissions) {
		const validation = validatePermissions(input.permissions);
		if (!validation.success) return validation;
	}

	const updated = await db.role.update({
		where: { id: roleId },
		data: {
			name: input.name ?? undefined,
			description: input.description ?? undefined,
			permissions: input.permissions ? JSON.stringify(input.permissions) : undefined,
			dataScope: input.dataScope ?? undefined,
		},
	});

	return { success: true, data: serializeRole(updated) };
};

export const deleteRole = async (
	db: PrismaClient,
	roleId: string,
): Promise<ServiceResult<{ success: true }>> => {
	const role = await db.role.findUnique({ where: { id: roleId } });
	if (!role) {
		return { success: false, code: "NOT_FOUND", message: "角色不存在", status: 404 };
	}

	if (role.isSystem) {
		return {
			success: false,
			code: "ROLE_SYSTEM_LOCKED",
			message: "系统预置角色不可删除",
			status: 400,
		};
	}

	await db.role.delete({ where: { id: roleId } });
	return { success: true, data: { success: true } };
};
