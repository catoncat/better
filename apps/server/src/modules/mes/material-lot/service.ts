import type { Prisma, PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

type MaterialLotListQuery = {
	materialCode?: string;
	lotNo?: string;
	supplier?: string;
	iqcResult?: string;
	hasIqc?: "true" | "false";
	materialKnown?: "true" | "false";
	createdAfter?: string;
	createdBefore?: string;
	offset?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
};

type MaterialLotDetail = {
	id: string;
	materialCode: string;
	lotNo: string;
	supplier: string | null;
	iqcResult: string | null;
	iqcDate: string | null;
	createdAt: string;
	updatedAt: string;
	materialName?: string | null;
	materialKnown: boolean;
};

type UsageRecord = {
	type: "loading" | "bake";
	id: string;
	runNo: string | null;
	slotCode?: string | null;
	createdAt: string;
	operator: string | null;
};

export async function listMaterialLots(
	db: PrismaClient,
	query: MaterialLotListQuery,
): Promise<
	ServiceResult<{ items: MaterialLotDetail[]; total: number; offset: number; limit: number }>
> {
	const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
	const limit = query.limit ? Math.min(Number.parseInt(query.limit, 10), 100) : 20;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const where: Prisma.MaterialLotWhereInput = {};

	if (query.materialCode) {
		where.materialCode = { contains: query.materialCode };
	}
	if (query.lotNo) {
		where.lotNo = { contains: query.lotNo };
	}
	if (query.supplier) {
		where.supplier = { contains: query.supplier };
	}
	if (query.iqcResult) {
		where.iqcResult = { contains: query.iqcResult };
	}
	if (query.hasIqc === "true") {
		where.iqcResult = { not: null };
	} else if (query.hasIqc === "false") {
		where.iqcResult = null;
	}
	if (query.createdAfter) {
		where.createdAt = { ...((where.createdAt as object) || {}), gte: new Date(query.createdAfter) };
	}
	if (query.createdBefore) {
		where.createdAt = {
			...((where.createdAt as object) || {}),
			lte: new Date(query.createdBefore),
		};
	}

	// 获取物料批次
	const [lots, total] = await Promise.all([
		db.materialLot.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
		}),
		db.materialLot.count({ where }),
	]);

	// 批量查询物料主数据
	const materialCodes = [...new Set(lots.map((l) => l.materialCode))];
	const materials = await db.material.findMany({
		where: { code: { in: materialCodes } },
		select: { code: true, name: true },
	});
	const materialMap = new Map(materials.map((m) => [m.code, m]));

	// 如果需要按 materialKnown 过滤，在内存中过滤
	let filteredLots = lots;
	if (query.materialKnown === "true") {
		filteredLots = lots.filter((l) => materialMap.has(l.materialCode));
	} else if (query.materialKnown === "false") {
		filteredLots = lots.filter((l) => !materialMap.has(l.materialCode));
	}

	const items: MaterialLotDetail[] = filteredLots.map((lot) => {
		const material = materialMap.get(lot.materialCode);
		return {
			id: lot.id,
			materialCode: lot.materialCode,
			lotNo: lot.lotNo,
			supplier: lot.supplier,
			iqcResult: lot.iqcResult,
			iqcDate: lot.iqcDate ? lot.iqcDate.toISOString() : null,
			createdAt: lot.createdAt.toISOString(),
			updatedAt: lot.updatedAt.toISOString(),
			materialName: material?.name ?? null,
			materialKnown: !!material,
		};
	});

	return {
		success: true,
		data: { items, total, offset, limit },
	};
}

export async function getMaterialLot(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<MaterialLotDetail>> {
	const lot = await db.materialLot.findUnique({ where: { id } });
	if (!lot) {
		return {
			success: false,
			code: "MATERIAL_LOT_NOT_FOUND",
			message: "Material lot not found",
			status: 404,
		};
	}

	const material = await db.material.findUnique({
		where: { code: lot.materialCode },
		select: { name: true },
	});

	return {
		success: true,
		data: {
			id: lot.id,
			materialCode: lot.materialCode,
			lotNo: lot.lotNo,
			supplier: lot.supplier,
			iqcResult: lot.iqcResult,
			iqcDate: lot.iqcDate ? lot.iqcDate.toISOString() : null,
			createdAt: lot.createdAt.toISOString(),
			updatedAt: lot.updatedAt.toISOString(),
			materialName: material?.name ?? null,
			materialKnown: !!material,
		},
	};
}

export async function updateMaterialLot(
	db: PrismaClient,
	id: string,
	data: { supplier?: string | null; iqcResult?: string | null; iqcDate?: string | null },
): Promise<ServiceResult<MaterialLotDetail>> {
	const lot = await db.materialLot.findUnique({ where: { id } });
	if (!lot) {
		return {
			success: false,
			code: "MATERIAL_LOT_NOT_FOUND",
			message: "Material lot not found",
			status: 404,
		};
	}

	const updateData: Prisma.MaterialLotUpdateInput = {};
	if (data.supplier !== undefined) {
		updateData.supplier = data.supplier;
	}
	if (data.iqcResult !== undefined) {
		updateData.iqcResult = data.iqcResult;
	}
	if (data.iqcDate !== undefined) {
		updateData.iqcDate = data.iqcDate ? new Date(data.iqcDate) : null;
	}

	const updated = await db.materialLot.update({
		where: { id },
		data: updateData,
	});

	const material = await db.material.findUnique({
		where: { code: updated.materialCode },
		select: { name: true },
	});

	return {
		success: true,
		data: {
			id: updated.id,
			materialCode: updated.materialCode,
			lotNo: updated.lotNo,
			supplier: updated.supplier,
			iqcResult: updated.iqcResult,
			iqcDate: updated.iqcDate ? updated.iqcDate.toISOString() : null,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			materialName: material?.name ?? null,
			materialKnown: !!material,
		},
	};
}

export async function getMaterialLotUsage(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<{ items: UsageRecord[] }>> {
	const lot = await db.materialLot.findUnique({ where: { id } });
	if (!lot) {
		return {
			success: false,
			code: "MATERIAL_LOT_NOT_FOUND",
			message: "Material lot not found",
			status: 404,
		};
	}

	// 查询上料记录
	const loadingRecords = await db.loadingRecord.findMany({
		where: { materialLotId: id },
		include: {
			run: { select: { runNo: true } },
			slot: { select: { slotCode: true } },
		},
		orderBy: { loadedAt: "desc" },
		take: 50,
	});

	// 查询烘烤记录
	const bakeRecords = await db.bakeRecord.findMany({
		where: { materialLotId: id },
		include: {
			run: { select: { runNo: true } },
		},
		orderBy: { createdAt: "desc" },
		take: 50,
	});

	const items: UsageRecord[] = [
		...loadingRecords.map((r) => ({
			type: "loading" as const,
			id: r.id,
			runNo: r.run.runNo,
			slotCode: r.slot.slotCode,
			createdAt: r.loadedAt.toISOString(),
			operator: r.loadedBy,
		})),
		...bakeRecords.map((r) => ({
			type: "bake" as const,
			id: r.id,
			runNo: r.run?.runNo ?? null,
			createdAt: r.createdAt.toISOString(),
			operator: r.inBy, // 使用 inBy 作为操作人
		})),
	].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return {
		success: true,
		data: { items },
	};
}
