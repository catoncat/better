import type { Prisma, PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import { parseSortOrderBy } from "../../../utils/sort";
import type {
	bomParentListQuerySchema,
	materialListQuerySchema,
	workCenterListQuerySchema,
} from "./schema";

type MaterialListQuery = Static<typeof materialListQuerySchema>;
type BomParentListQuery = Static<typeof bomParentListQuerySchema>;
type WorkCenterListQuery = Static<typeof workCenterListQuerySchema>;

const toDateOrUndefined = (value: string | undefined) => {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? undefined : date;
};

export const listMaterials = async (db: PrismaClient, query: MaterialListQuery) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 200);

	const where: Prisma.MaterialWhereInput = {};
	const and: Prisma.MaterialWhereInput[] = [];

	if (query.search) {
		where.OR = [{ code: { contains: query.search } }, { name: { contains: query.search } }];
	}
	if (query.category) and.push({ category: { contains: query.category } });
	if (query.unit) and.push({ unit: { contains: query.unit } });
	if (query.model) and.push({ model: { contains: query.model } });
	if (query.synced === "yes") and.push({ sourceUpdatedAt: { not: null } });
	if (query.synced === "no") and.push({ sourceUpdatedAt: null });

	const updatedFrom = toDateOrUndefined(query.updatedFrom);
	const updatedTo = toDateOrUndefined(query.updatedTo);
	if (updatedFrom || updatedTo) {
		and.push({
			sourceUpdatedAt: {
				gte: updatedFrom,
				lte: updatedTo,
			},
		});
	}

	if (and.length > 0) where.AND = and;

	const orderBy = parseSortOrderBy<Prisma.MaterialOrderByWithRelationInput>(query.sort, {
		allowedFields: [
			"code",
			"name",
			"category",
			"unit",
			"model",
			"sourceUpdatedAt",
			"createdAt",
			"updatedAt",
		],
		fallback: [{ code: "asc" }],
	});

	const [items, total] = await Promise.all([
		db.material.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				id: true,
				code: true,
				name: true,
				category: true,
				unit: true,
				model: true,
				sourceUpdatedAt: true,
				updatedAt: true,
			},
		}),
		db.material.count({ where }),
	]);

	return { items, total, page, pageSize };
};

export type BomParentListItem = {
	parentCode: string;
	parentName: string | null;
	parentCategory: string | null;
	parentUnit: string | null;
	parentModel: string | null;
	latestSourceUpdatedAt: Date | null;
	children: Array<{
		childCode: string;
		childName: string | null;
		qty: number;
		unit: string | null;
		sourceUpdatedAt: Date | null;
	}>;
};

export const listBomParents = async (
	db: PrismaClient,
	query: BomParentListQuery,
): Promise<{ items: BomParentListItem[]; total: number; page: number; pageSize: number }> => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);

	const where: Prisma.BomItemWhereInput = {};
	const and: Prisma.BomItemWhereInput[] = [];

	if (query.parentCode) {
		and.push({ parentCode: { contains: query.parentCode } });
	}

	if (query.search) {
		and.push({
			OR: [{ parentCode: { contains: query.search } }, { childCode: { contains: query.search } }],
		});
	}
	if (query.synced === "yes") and.push({ sourceUpdatedAt: { not: null } });
	if (query.synced === "no") and.push({ sourceUpdatedAt: null });

	const updatedFrom = toDateOrUndefined(query.updatedFrom);
	const updatedTo = toDateOrUndefined(query.updatedTo);
	if (updatedFrom || updatedTo) {
		and.push({
			sourceUpdatedAt: {
				gte: updatedFrom,
				lte: updatedTo,
			},
		});
	}

	if (and.length > 0) where.AND = and;

	const total = await db.bomItem
		.findMany({
			where,
			distinct: ["parentCode"],
			select: { parentCode: true },
		})
		.then((rows) => rows.length);
	const parentRows = await db.bomItem.findMany({
		where,
		distinct: ["parentCode"],
		select: { parentCode: true },
		orderBy: [{ parentCode: "asc" }],
		skip: (page - 1) * pageSize,
		take: pageSize,
	});
	const parentCodes = parentRows.map((r) => r.parentCode).filter(Boolean);

	if (parentCodes.length === 0) {
		return { items: [], total, page, pageSize };
	}

	const bomRows = await db.bomItem.findMany({
		where: { parentCode: { in: parentCodes } },
		select: {
			parentCode: true,
			childCode: true,
			qty: true,
			unit: true,
			sourceUpdatedAt: true,
		},
		orderBy: [{ parentCode: "asc" }, { childCode: "asc" }],
	});

	const allCodes = new Set<string>();
	for (const row of bomRows) {
		allCodes.add(row.parentCode);
		allCodes.add(row.childCode);
	}

	const materials = await db.material.findMany({
		where: { code: { in: [...allCodes] } },
		select: { code: true, name: true, category: true, unit: true, model: true },
	});
	const materialByCode = new Map(materials.map((m) => [m.code, m]));

	const byParent = new Map<string, BomParentListItem>();
	for (const parentCode of parentCodes) {
		const parentMaterial = materialByCode.get(parentCode) ?? null;
		byParent.set(parentCode, {
			parentCode,
			parentName: parentMaterial?.name ?? null,
			parentCategory: parentMaterial?.category ?? null,
			parentUnit: parentMaterial?.unit ?? null,
			parentModel: parentMaterial?.model ?? null,
			latestSourceUpdatedAt: null,
			children: [],
		});
	}

	for (const row of bomRows) {
		const parent = byParent.get(row.parentCode);
		if (!parent) continue;
		const childMaterial = materialByCode.get(row.childCode) ?? null;
		parent.children.push({
			childCode: row.childCode,
			childName: childMaterial?.name ?? null,
			qty: row.qty,
			unit: row.unit ?? null,
			sourceUpdatedAt: row.sourceUpdatedAt ?? null,
		});
		if (
			row.sourceUpdatedAt &&
			(!parent.latestSourceUpdatedAt || row.sourceUpdatedAt > parent.latestSourceUpdatedAt)
		) {
			parent.latestSourceUpdatedAt = row.sourceUpdatedAt;
		}
	}

	return {
		items: parentCodes.map((code) => byParent.get(code)).filter(Boolean) as BomParentListItem[],
		total,
		page,
		pageSize,
	};
};

export type WorkCenterListItem = {
	id: string;
	code: string;
	name: string;
	departmentCode: string | null;
	departmentName: string | null;
	sourceUpdatedAt: Date | null;
	stationGroup: { code: string; name: string } | null;
	lineCodes: string[];
};

export const listWorkCenters = async (
	db: PrismaClient,
	query: WorkCenterListQuery,
): Promise<{ items: WorkCenterListItem[]; total: number; page: number; pageSize: number }> => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 200);

	const where: Prisma.WorkCenterWhereInput = {};
	const and: Prisma.WorkCenterWhereInput[] = [];

	if (query.stationGroupCode) {
		const mappings = await db.workCenterStationGroupMapping.findMany({
			where: {
				sourceSystem: "ERP",
				stationGroup: { is: { code: { contains: query.stationGroupCode } } },
			},
			select: {
				sourceWorkCenter: true,
				sourceDepartment: true,
			},
		});

		const mappedWorkCenters = mappings
			.map((m) => m.sourceWorkCenter)
			.filter((v): v is string => Boolean(v));
		const mappedDepartments = mappings
			.map((m) => m.sourceDepartment)
			.filter((v): v is string => Boolean(v));

		if (mappedWorkCenters.length === 0 && mappedDepartments.length === 0) {
			return { items: [], total: 0, page, pageSize };
		}

		and.push({
			OR: [
				mappedWorkCenters.length > 0 ? { code: { in: mappedWorkCenters } } : undefined,
				mappedDepartments.length > 0 ? { departmentCode: { in: mappedDepartments } } : undefined,
			].filter(Boolean) as Prisma.WorkCenterWhereInput[],
		});
	}

	if (query.search) {
		and.push({
			OR: [
				{ code: { contains: query.search } },
				{ name: { contains: query.search } },
				{ departmentCode: { contains: query.search } },
				{ departmentName: { contains: query.search } },
			],
		});
	}
	if (query.departmentCode) {
		and.push({ departmentCode: { contains: query.departmentCode } });
	}
	if (query.synced === "yes") and.push({ sourceUpdatedAt: { not: null } });
	if (query.synced === "no") and.push({ sourceUpdatedAt: null });

	const updatedFrom = toDateOrUndefined(query.updatedFrom);
	const updatedTo = toDateOrUndefined(query.updatedTo);
	if (updatedFrom || updatedTo) {
		and.push({
			sourceUpdatedAt: {
				gte: updatedFrom,
				lte: updatedTo,
			},
		});
	}

	if (and.length > 0) where.AND = and;

	const orderBy = parseSortOrderBy<Prisma.WorkCenterOrderByWithRelationInput>(query.sort, {
		allowedFields: [
			"code",
			"name",
			"departmentCode",
			"departmentName",
			"sourceUpdatedAt",
			"createdAt",
			"updatedAt",
		],
		fallback: [{ code: "asc" }],
	});

	const [rows, total] = await Promise.all([
		db.workCenter.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				id: true,
				code: true,
				name: true,
				departmentCode: true,
				departmentName: true,
				sourceUpdatedAt: true,
			},
		}),
		db.workCenter.count({ where }),
	]);

	const workCenterCodes = rows.map((r) => r.code);
	const departmentCodes = rows.map((r) => r.departmentCode).filter((v): v is string => Boolean(v));

	const mappingRows = await db.workCenterStationGroupMapping.findMany({
		where: {
			sourceSystem: "ERP",
			OR: [
				{ sourceWorkCenter: { in: workCenterCodes } },
				{ sourceDepartment: { in: departmentCodes } },
			],
		},
		include: {
			stationGroup: { select: { id: true, code: true, name: true } },
		},
	});

	const pickMapping = (workCenterCode: string, departmentCode: string | null) => {
		const exact = mappingRows.find(
			(m) => m.sourceWorkCenter === workCenterCode && m.sourceDepartment === departmentCode,
		);
		if (exact) return exact;
		const byWorkCenter = mappingRows.find((m) => m.sourceWorkCenter === workCenterCode);
		if (byWorkCenter) return byWorkCenter;
		if (departmentCode) return mappingRows.find((m) => m.sourceDepartment === departmentCode);
		return undefined;
	};

	const stationGroupIds = [
		...new Set(mappingRows.map((m) => m.stationGroup?.id).filter((v): v is string => Boolean(v))),
	];

	const stationRows =
		stationGroupIds.length > 0
			? await db.station.findMany({
					where: { groupId: { in: stationGroupIds } },
					select: { groupId: true, line: { select: { code: true } } },
				})
			: [];

	const lineCodesByGroupId = new Map<string, string[]>();
	for (const row of stationRows) {
		if (!row.groupId) continue;
		const existing = lineCodesByGroupId.get(row.groupId) ?? [];
		const next = row.line?.code ? [...existing, row.line.code] : existing;
		lineCodesByGroupId.set(row.groupId, [...new Set(next)]);
	}

	const items: WorkCenterListItem[] = rows.map((wc) => {
		const mapping = pickMapping(wc.code, wc.departmentCode ?? null);
		const group = mapping?.stationGroup ?? null;
		return {
			id: wc.id,
			code: wc.code,
			name: wc.name,
			departmentCode: wc.departmentCode ?? null,
			departmentName: wc.departmentName ?? null,
			sourceUpdatedAt: wc.sourceUpdatedAt ?? null,
			stationGroup: group ? { code: group.code, name: group.name } : null,
			lineCodes: group ? (lineCodesByGroupId.get(group.id) ?? []) : [],
		};
	});

	return { items, total, page, pageSize };
};
