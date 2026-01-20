import type { BakeRecord, Prisma, PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

export type BakeRecordDetail = {
	id: string;
	runId: string | null;
	runNo: string | null;
	materialLotId: string | null;
	materialCode: string | null;
	lotNo: string | null;
	itemCode: string;
	bakeProcess: string;
	bakeQty: string;
	bakeTemperature: number | null;
	durationHours: string | null;
	inAt: string;
	inBy: string;
	outAt: string;
	outBy: string;
	confirmedBy: string | null;
	createdAt: string;
	updatedAt: string;
};

type BakeRecordListQuery = {
	runNo?: string;
	itemCode?: string;
	bakeProcess?: string;
	materialCode?: string;
	lotNo?: string;
	inFrom?: string;
	inTo?: string;
	page?: number;
	pageSize?: number;
};

type BakeRecordCreateInput = {
	runNo?: string;
	materialCode?: string;
	lotNo?: string;
	itemCode: string;
	bakeProcess: string;
	bakeQty: string;
	bakeTemperature?: number;
	durationHours?: string;
	inAt: string;
	inBy: string;
	outAt: string;
	outBy: string;
	confirmedBy?: string;
	meta?: Prisma.JsonValue;
};

const mapBakeRecord = (
	record: BakeRecord & {
		run: { runNo: string } | null;
		materialLot: { materialCode: string; lotNo: string } | null;
	},
): BakeRecordDetail => ({
	id: record.id,
	runId: record.runId ?? null,
	runNo: record.run?.runNo ?? null,
	materialLotId: record.materialLotId ?? null,
	materialCode: record.materialLot?.materialCode ?? null,
	lotNo: record.materialLot?.lotNo ?? null,
	itemCode: record.itemCode,
	bakeProcess: record.bakeProcess,
	bakeQty: record.bakeQty,
	bakeTemperature: record.bakeTemperature ?? null,
	durationHours: record.durationHours ?? null,
	inAt: record.inAt.toISOString(),
	inBy: record.inBy,
	outAt: record.outAt.toISOString(),
	outBy: record.outBy,
	confirmedBy: record.confirmedBy ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const parseDate = (value: string): Date | null => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
};

export async function listBakeRecords(
	db: PrismaClient,
	query: BakeRecordListQuery,
): Promise<{ items: BakeRecordDetail[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.BakeRecordWhereInput = {};

	const runNo = query.runNo?.trim();
	if (runNo) {
		const run = await db.run.findUnique({ where: { runNo }, select: { id: true } });
		if (!run) {
			return { items: [], total: 0, page, pageSize };
		}
		where.runId = run.id;
	}

	const itemCode = query.itemCode?.trim();
	if (itemCode) {
		where.itemCode = { contains: itemCode };
	}

	const bakeProcess = query.bakeProcess?.trim();
	if (bakeProcess) {
		where.bakeProcess = { contains: bakeProcess };
	}

	const materialCode = query.materialCode?.trim();
	const lotNo = query.lotNo?.trim();
	if (materialCode || lotNo) {
		where.materialLot = {
			...(materialCode ? { materialCode: { contains: materialCode } } : {}),
			...(lotNo ? { lotNo: { contains: lotNo } } : {}),
		};
	}

	const inFrom = query.inFrom ? parseDate(query.inFrom) : null;
	const inTo = query.inTo ? parseDate(query.inTo) : null;
	if (inFrom || inTo) {
		where.inAt = {
			...(inFrom ? { gte: inFrom } : {}),
			...(inTo ? { lte: inTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.bakeRecord.findMany({
			where,
			orderBy: { inAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				run: { select: { runNo: true } },
				materialLot: { select: { materialCode: true, lotNo: true } },
			},
		}),
		db.bakeRecord.count({ where }),
	]);

	return { items: items.map(mapBakeRecord), total, page, pageSize };
}

export async function createBakeRecord(
	db: PrismaClient,
	input: BakeRecordCreateInput,
): Promise<ServiceResult<BakeRecordDetail>> {
	const inAt = parseDate(input.inAt);
	if (!inAt) {
		return {
			success: false,
			code: "INVALID_IN_AT",
			message: "Invalid inAt timestamp",
			status: 400,
		};
	}

	const outAt = parseDate(input.outAt);
	if (!outAt) {
		return {
			success: false,
			code: "INVALID_OUT_AT",
			message: "Invalid outAt timestamp",
			status: 400,
		};
	}

	if (outAt.getTime() < inAt.getTime()) {
		return {
			success: false,
			code: "TIME_RANGE_INVALID",
			message: "outAt must be after inAt",
			status: 400,
		};
	}

	const runNo = input.runNo?.trim();
	const materialCode = input.materialCode?.trim();
	const lotNo = input.lotNo?.trim();

	if ((materialCode && !lotNo) || (!materialCode && lotNo)) {
		return {
			success: false,
			code: "MATERIAL_LOT_INCOMPLETE",
			message: "materialCode and lotNo are required together",
			status: 400,
		};
	}

	return await db.$transaction(async (tx) => {
		let runId: string | null = null;
		if (runNo) {
			const run = await tx.run.findUnique({ where: { runNo }, select: { id: true } });
			if (!run) {
				return {
					success: false,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				} satisfies ServiceResult<BakeRecordDetail>;
			}
			runId = run.id;
		}

		let materialLotId: string | null = null;
		if (materialCode && lotNo) {
			const materialLot = await tx.materialLot.upsert({
				where: { materialCode_lotNo: { materialCode, lotNo } },
				create: { materialCode, lotNo },
				update: {},
				select: { id: true },
			});
			materialLotId = materialLot.id;
		}

		const record = await tx.bakeRecord.create({
			data: {
				runId,
				materialLotId,
				itemCode: input.itemCode.trim(),
				bakeProcess: input.bakeProcess.trim(),
				bakeQty: input.bakeQty.trim(),
				bakeTemperature: input.bakeTemperature ?? null,
				durationHours: input.durationHours?.trim() || null,
				inAt,
				inBy: input.inBy.trim(),
				outAt,
				outBy: input.outBy.trim(),
				confirmedBy: input.confirmedBy?.trim() || null,
				meta: input.meta ?? undefined,
			},
			include: {
				run: { select: { runNo: true } },
				materialLot: { select: { materialCode: true, lotNo: true } },
			},
		});

		return { success: true, data: mapBakeRecord(record) };
	});
}
