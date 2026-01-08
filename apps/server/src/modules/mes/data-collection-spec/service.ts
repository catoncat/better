import { Prisma, type PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	dataCollectionSpecCreateSchema,
	dataCollectionSpecListQuerySchema,
	dataCollectionSpecUpdateSchema,
} from "./schema";

type DataCollectionSpecCreateInput = Static<typeof dataCollectionSpecCreateSchema>;
type DataCollectionSpecUpdateInput = Static<typeof dataCollectionSpecUpdateSchema>;
type DataCollectionSpecListQuery = Static<typeof dataCollectionSpecListQuerySchema>;

type DataCollectionSpecRecord = Prisma.DataCollectionSpecGetPayload<{
	include: {
		operation: {
			select: { id: true; code: true; name: true };
		};
	};
}>;

export type DataCollectionSpecDetail = {
	id: string;
	operationId: string;
	operationCode: string;
	operationName: string;
	name: string;
	itemType: "KEY" | "OBSERVATION";
	dataType: "NUMBER" | "TEXT" | "BOOLEAN" | "JSON";
	method: "AUTO" | "MANUAL";
	triggerType: "EVENT" | "TIME" | "EACH_UNIT" | "EACH_CARRIER";
	triggerRule: Prisma.JsonValue | null;
	spec: Prisma.JsonValue | null;
	alarm: Prisma.JsonValue | null;
	isRequired: boolean;
	isActive: boolean;
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

const normalizeName = (name: string) => name.trim();

const toDetail = (spec: DataCollectionSpecRecord): DataCollectionSpecDetail => ({
	id: spec.id,
	operationId: spec.operationId,
	operationCode: spec.operation.code,
	operationName: spec.operation.name,
	name: spec.name,
	itemType: spec.itemType as DataCollectionSpecDetail["itemType"],
	dataType: spec.dataType as DataCollectionSpecDetail["dataType"],
	method: spec.method as DataCollectionSpecDetail["method"],
	triggerType: spec.triggerType as DataCollectionSpecDetail["triggerType"],
	triggerRule: spec.triggerRule ?? null,
	spec: spec.spec ?? null,
	alarm: spec.alarm ?? null,
	isRequired: spec.isRequired,
	isActive: spec.isActive,
	createdAt: spec.createdAt.toISOString(),
	updatedAt: spec.updatedAt.toISOString(),
});

const buildOrderBy = (
	sortBy: DataCollectionSpecListQuery["sortBy"] | undefined,
	sortDir: DataCollectionSpecListQuery["sortDir"] | undefined,
): Prisma.DataCollectionSpecOrderByWithRelationInput[] => {
	const primary = sortBy ?? "updatedAt";
	const direction = sortDir ?? (primary === "name" ? "asc" : "desc");

	switch (primary) {
		case "name":
			return [{ name: direction }, { updatedAt: "desc" }, { id: "asc" }];
		case "createdAt":
			return [{ createdAt: direction }, { id: "asc" }];
		default:
			return [{ updatedAt: direction }, { id: "asc" }];
	}
};

export const listDataCollectionSpecs = async (
	db: PrismaClient,
	query: DataCollectionSpecListQuery,
) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);

	const where: Prisma.DataCollectionSpecWhereInput = {};
	if (query.operationId) where.operationId = query.operationId;
	if (query.name) where.name = { contains: query.name };
	if (query.isActive) where.isActive = query.isActive === "true";

	const orderBy = buildOrderBy(query.sortBy, query.sortDir);

	const [items, total] = await Promise.all([
		db.dataCollectionSpec.findMany({
			where,
			include: { operation: { select: { id: true, code: true, name: true } } },
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.dataCollectionSpec.count({ where }),
	]);

	return {
		items: items.map(toDetail),
		total,
		page,
		pageSize,
	};
};

export const getDataCollectionSpec = async (
	db: PrismaClient,
	specId: string,
): Promise<ServiceResult<DataCollectionSpecDetail>> => {
	const spec = await db.dataCollectionSpec.findUnique({
		where: { id: specId },
		include: { operation: { select: { id: true, code: true, name: true } } },
	});

	if (!spec) {
		return {
			success: false,
			code: "DATA_SPEC_NOT_FOUND",
			message: "Data collection spec not found",
			status: 404,
		};
	}

	return { success: true, data: toDetail(spec) };
};

export const createDataCollectionSpec = async (
	db: PrismaClient,
	input: DataCollectionSpecCreateInput,
): Promise<ServiceResult<DataCollectionSpecDetail>> => {
	const name = normalizeName(input.name);
	if (!name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const operation = await tx.operation.findUnique({
			where: { id: input.operationId },
			select: { id: true },
		});
		if (!operation) {
			return {
				success: false,
				code: "OPERATION_NOT_FOUND",
				message: "Operation not found",
				status: 404,
			};
		}

		const existing = await tx.dataCollectionSpec.findFirst({
			where: { operationId: input.operationId, name },
			select: { id: true },
		});
		if (existing) {
			return {
				success: false,
				code: "DATA_SPEC_NAME_DUPLICATE",
				message: "Data collection spec name already exists for this operation",
				status: 409,
			};
		}

		const spec = await tx.dataCollectionSpec.create({
			data: {
				operationId: input.operationId,
				name,
				itemType: input.itemType,
				dataType: input.dataType,
				method: input.method,
				triggerType: input.triggerType,
				triggerRule: toOptionalJsonValue(input.triggerRule),
				spec: toOptionalJsonValue(input.spec),
				alarm: toOptionalJsonValue(input.alarm),
				isRequired: input.isRequired ?? false,
				isActive: input.isActive ?? true,
			},
			include: { operation: { select: { id: true, code: true, name: true } } },
		});

		return { success: true, data: toDetail(spec) };
	});
};

export const updateDataCollectionSpec = async (
	db: PrismaClient,
	specId: string,
	input: DataCollectionSpecUpdateInput,
): Promise<ServiceResult<DataCollectionSpecDetail>> => {
	const name = input.name === undefined ? undefined : normalizeName(input.name);
	if (name !== undefined && !name) {
		return { success: false, code: "NAME_REQUIRED", message: "Name is required", status: 400 };
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.dataCollectionSpec.findUnique({
			where: { id: specId },
			select: { id: true, operationId: true, name: true },
		});
		if (!existing) {
			return {
				success: false,
				code: "DATA_SPEC_NOT_FOUND",
				message: "Data collection spec not found",
				status: 404,
			};
		}

		if (name && name !== existing.name) {
			const duplicate = await tx.dataCollectionSpec.findFirst({
				where: {
					operationId: existing.operationId,
					name,
					NOT: { id: specId },
				},
				select: { id: true },
			});
			if (duplicate) {
				return {
					success: false,
					code: "DATA_SPEC_NAME_DUPLICATE",
					message: "Data collection spec name already exists for this operation",
					status: 409,
				};
			}
		}

		const spec = await tx.dataCollectionSpec.update({
			where: { id: specId },
			data: {
				name,
				itemType: input.itemType,
				dataType: input.dataType,
				method: input.method,
				triggerType: input.triggerType,
				triggerRule: toOptionalJsonValue(input.triggerRule),
				spec: toOptionalJsonValue(input.spec),
				alarm: toOptionalJsonValue(input.alarm),
				isRequired: input.isRequired,
				isActive: input.isActive,
			},
			include: { operation: { select: { id: true, code: true, name: true } } },
		});

		return { success: true, data: toDetail(spec) };
	});
};
