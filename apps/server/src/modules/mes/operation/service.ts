import { Prisma, StationType, type PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	operationCreateSchema,
	operationListQuerySchema,
	operationUpdateSchema,
} from "./schema";

type OperationCreateInput = Static<typeof operationCreateSchema>;
type OperationUpdateInput = Static<typeof operationUpdateSchema>;
type OperationListQuery = Static<typeof operationListQuerySchema>;

type OperationRecord = Prisma.OperationGetPayload<{
	include: {
		operationMappings: {
			select: { sourceSystem: true };
		};
	};
}>;

export type OperationDetail = {
	id: string;
	code: string;
	name: string;
	defaultType: "MANUAL" | "AUTO" | "BATCH" | "TEST";
	isKeyQuality: boolean;
	meta: Prisma.JsonValue | null;
	source: "ERP" | "MES" | "SEED";
	createdAt: string;
	updatedAt: string;
};

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

const toOptionalJsonValue = (value: unknown) => {
	if (value === undefined) return undefined;
	if (value === null) return Prisma.DbNull;
	return toJsonValue(value);
};

const normalizeCode = (code: string) => code.trim().toUpperCase();
const normalizeName = (name: string) => name.trim();

/**
 * Derive source from Operation record:
 * - If has OperationMapping, it's ERP
 * - Otherwise check meta.source if exists, default to SEED
 */
const deriveSource = (op: OperationRecord): "ERP" | "MES" | "SEED" => {
	if (op.operationMappings.length > 0) {
		return "ERP";
	}
	const meta = op.meta as Record<string, unknown> | null;
	if (meta?.source === "MES") {
		return "MES";
	}
	return "SEED";
};

const toDetail = (op: OperationRecord): OperationDetail => ({
	id: op.id,
	code: op.code,
	name: op.name,
	defaultType: op.defaultType as OperationDetail["defaultType"],
	isKeyQuality: op.isKeyQuality,
	meta: op.meta ?? null,
	source: deriveSource(op),
	createdAt: op.createdAt.toISOString(),
	updatedAt: op.updatedAt.toISOString(),
});

const buildOrderBy = (
	sortBy: OperationListQuery["sortBy"] | undefined,
	sortDir: OperationListQuery["sortDir"] | undefined,
): Prisma.OperationOrderByWithRelationInput[] => {
	const primary = sortBy ?? "updatedAt";
	const direction = sortDir ?? (primary === "code" || primary === "name" ? "asc" : "desc");

	switch (primary) {
		case "code":
			return [{ code: direction }, { updatedAt: "desc" }, { id: "asc" }];
		case "name":
			return [{ name: direction }, { updatedAt: "desc" }, { id: "asc" }];
		case "createdAt":
			return [{ createdAt: direction }, { id: "asc" }];
		default:
			return [{ updatedAt: direction }, { id: "asc" }];
	}
};

export const listOperations = async (db: PrismaClient, query: OperationListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);

	const where: Prisma.OperationWhereInput = {};
	if (query.code) where.code = { contains: query.code };
	if (query.name) where.name = { contains: query.name };
	if (query.defaultType) where.defaultType = query.defaultType as StationType;

	// Note: source filter is applied post-query for SQLite compatibility
	// (SQLite doesn't support JSON path queries well)
	const orderBy = buildOrderBy(query.sortBy, query.sortDir);

	// For source filtering, we need to fetch more and filter in memory
	// This is acceptable for Operation which is a small master data table
	const allItems = await db.operation.findMany({
		where,
		include: {
			operationMappings: {
				select: { sourceSystem: true },
				take: 1,
			},
		},
		orderBy,
	});

	// Apply source filter in memory
	let filteredItems = allItems;
	if (query.source) {
		filteredItems = allItems.filter((op) => deriveSource(op) === query.source);
	}

	const total = filteredItems.length;
	const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

	return {
		items: paginatedItems.map(toDetail),
		total,
		page,
		pageSize,
	};
};

export const getOperation = async (
	db: PrismaClient,
	operationId: string,
): Promise<ServiceResult<OperationDetail>> => {
	const op = await db.operation.findUnique({
		where: { id: operationId },
		include: {
			operationMappings: {
				select: { sourceSystem: true },
				take: 1,
			},
		},
	});

	if (!op) {
		return {
			success: false,
			code: "OPERATION_NOT_FOUND",
			message: "Operation not found",
			status: 404,
		};
	}

	return { success: true, data: toDetail(op) };
};

export const createOperation = async (
	db: PrismaClient,
	input: OperationCreateInput,
): Promise<ServiceResult<OperationDetail>> => {
	const code = normalizeCode(input.code);
	const name = normalizeName(input.name);

	if (!code) {
		return { success: false, code: "CODE_REQUIRED", message: "Code is required", status: 400 };
	}
	if (!name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.operation.findUnique({
			where: { code },
			select: { id: true },
		});
		if (existing) {
			return {
				success: false,
				code: "OPERATION_CODE_DUPLICATE",
				message: "Operation code already exists",
				status: 409,
			};
		}

		const op = await tx.operation.create({
			data: {
				code,
				name,
				defaultType: input.defaultType as StationType,
				isKeyQuality: input.isKeyQuality ?? false,
				meta: toOptionalJsonValue({ ...((input.meta as object) ?? {}), source: "MES" }),
			},
			include: {
				operationMappings: {
					select: { sourceSystem: true },
					take: 1,
				},
			},
		});

		return { success: true, data: toDetail(op) };
	});
};

export const updateOperation = async (
	db: PrismaClient,
	operationId: string,
	input: OperationUpdateInput,
): Promise<ServiceResult<OperationDetail>> => {
	const name = input.name === undefined ? undefined : normalizeName(input.name);
	if (name !== undefined && !name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.operation.findUnique({
			where: { id: operationId },
			include: {
				operationMappings: {
					select: { sourceSystem: true },
					take: 1,
				},
			},
		});
		if (!existing) {
			return {
				success: false,
				code: "OPERATION_NOT_FOUND",
				message: "Operation not found",
				status: 404,
			};
		}

		// Only MES-Native operations can be updated
		const source = deriveSource(existing);
		if (source === "ERP") {
			return {
				success: false,
				code: "OPERATION_ERP_READONLY",
				message: "ERP operations cannot be modified",
				status: 403,
			};
		}

		const op = await tx.operation.update({
			where: { id: operationId },
			data: {
				name,
				defaultType: input.defaultType as StationType | undefined,
				isKeyQuality: input.isKeyQuality,
				meta:
					input.meta !== undefined
						? toOptionalJsonValue({
								...((existing.meta as object) ?? {}),
								...((input.meta as object) ?? {}),
							})
						: undefined,
			},
			include: {
				operationMappings: {
					select: { sourceSystem: true },
					take: 1,
				},
			},
		});

		return { success: true, data: toDetail(op) };
	});
};
