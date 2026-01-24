import type {
	ColdStorageTemperatureRecord,
	Prisma,
	PrismaClient,
	SolderPasteUsageRecord,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { buildMesEventIdempotencyKey, createMesEvent, MES_EVENT_TYPES } from "../event/service";

export type SolderPasteUsageRecordDetail = {
	id: string;
	lotId: string;
	lineId: string | null;
	lineCode: string | null;
	lineName: string | null;
	runId: string | null;
	runNo: string | null;
	routingStepId: string | null;
	receivedAt: string | null;
	expiresAt: string | null;
	receivedQty: number | null;
	thawedAt: string | null;
	issuedAt: string | null;
	returnedAt: string | null;
	isReturned: boolean | null;
	usedBy: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ColdStorageTemperatureRecordDetail = {
	id: string;
	measuredAt: string;
	temperature: number;
	measuredBy: string;
	reviewedBy: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

type SolderPasteUsageRecordListQuery = {
	lotId?: string;
	runNo?: string;
	lineCode?: string;
	receivedFrom?: string;
	receivedTo?: string;
	issuedFrom?: string;
	issuedTo?: string;
	page?: number;
	pageSize?: number;
};

type SolderPasteUsageRecordCreateInput = {
	lotId: string;
	runNo?: string;
	routingStepId?: string;
	lineCode?: string;
	receivedAt?: string;
	expiresAt?: string;
	receivedQty?: number;
	thawedAt?: string;
	issuedAt?: string;
	returnedAt?: string;
	isReturned?: boolean;
	usedBy?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

type ColdStorageTemperatureListQuery = {
	measuredFrom?: string;
	measuredTo?: string;
	page?: number;
	pageSize?: number;
};

type ColdStorageTemperatureCreateInput = {
	measuredAt: string;
	temperature: number;
	measuredBy: string;
	reviewedBy?: string;
	remark?: string;
	meta?: Prisma.JsonValue;
};

const mapSolderPasteUsageRecord = (
	record: SolderPasteUsageRecord & {
		line: { id: string; code: string; name: string } | null;
		run: { id: string; runNo: string } | null;
	},
): SolderPasteUsageRecordDetail => ({
	id: record.id,
	lotId: record.lotId,
	lineId: record.lineId ?? null,
	lineCode: record.line?.code ?? null,
	lineName: record.line?.name ?? null,
	runId: record.runId ?? null,
	runNo: record.run?.runNo ?? null,
	routingStepId: record.routingStepId ?? null,
	receivedAt: record.receivedAt ? record.receivedAt.toISOString() : null,
	expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
	receivedQty: record.receivedQty ?? null,
	thawedAt: record.thawedAt ? record.thawedAt.toISOString() : null,
	issuedAt: record.issuedAt ? record.issuedAt.toISOString() : null,
	returnedAt: record.returnedAt ? record.returnedAt.toISOString() : null,
	isReturned: record.isReturned ?? null,
	usedBy: record.usedBy ?? null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const mapColdStorageTemperatureRecord = (
	record: ColdStorageTemperatureRecord,
): ColdStorageTemperatureRecordDetail => ({
	id: record.id,
	measuredAt: record.measuredAt.toISOString(),
	temperature: record.temperature,
	measuredBy: record.measuredBy,
	reviewedBy: record.reviewedBy ?? null,
	remark: record.remark ?? null,
	createdAt: record.createdAt.toISOString(),
	updatedAt: record.updatedAt.toISOString(),
});

const parseDate = (value: string): Date | null => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
};

export async function listSolderPasteUsageRecords(
	db: PrismaClient,
	query: SolderPasteUsageRecordListQuery,
): Promise<{
	items: SolderPasteUsageRecordDetail[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.SolderPasteUsageRecordWhereInput = {};

	const lotId = query.lotId?.trim();
	if (lotId) {
		where.lotId = { contains: lotId };
	}

	const runNo = query.runNo?.trim();
	if (runNo) {
		const run = await db.run.findUnique({ where: { runNo }, select: { id: true } });
		if (!run) {
			return { items: [], total: 0, page, pageSize };
		}
		where.runId = run.id;
	}

	const lineCode = query.lineCode?.trim();
	if (lineCode) {
		const lines = await db.line.findMany({
			where: { code: { contains: lineCode } },
			select: { id: true },
		});
		if (lines.length === 0) {
			return { items: [], total: 0, page, pageSize };
		}
		where.lineId = { in: lines.map((line) => line.id) };
	}

	const receivedFrom = query.receivedFrom ? parseDate(query.receivedFrom) : null;
	const receivedTo = query.receivedTo ? parseDate(query.receivedTo) : null;
	if (receivedFrom || receivedTo) {
		where.receivedAt = {
			...(receivedFrom ? { gte: receivedFrom } : {}),
			...(receivedTo ? { lte: receivedTo } : {}),
		};
	}

	const issuedFrom = query.issuedFrom ? parseDate(query.issuedFrom) : null;
	const issuedTo = query.issuedTo ? parseDate(query.issuedTo) : null;
	if (issuedFrom || issuedTo) {
		where.issuedAt = {
			...(issuedFrom ? { gte: issuedFrom } : {}),
			...(issuedTo ? { lte: issuedTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.solderPasteUsageRecord.findMany({
			where,
			orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				line: { select: { id: true, code: true, name: true } },
				run: { select: { id: true, runNo: true } },
			},
		}),
		db.solderPasteUsageRecord.count({ where }),
	]);

	return { items: items.map(mapSolderPasteUsageRecord), total, page, pageSize };
}

export async function createSolderPasteUsageRecord(
	db: PrismaClient,
	input: SolderPasteUsageRecordCreateInput,
): Promise<ServiceResult<SolderPasteUsageRecordDetail>> {
	const lotId = input.lotId.trim();
	if (!lotId) {
		return {
			success: false,
			code: "LOT_ID_REQUIRED",
			message: "lotId is required",
			status: 400,
		};
	}

	const receivedAt = input.receivedAt ? parseDate(input.receivedAt) : null;
	if (input.receivedAt && !receivedAt) {
		return {
			success: false,
			code: "INVALID_RECEIVED_AT",
			message: "Invalid receivedAt timestamp",
			status: 400,
		};
	}

	const expiresAt = input.expiresAt ? parseDate(input.expiresAt) : null;
	if (input.expiresAt && !expiresAt) {
		return {
			success: false,
			code: "INVALID_EXPIRES_AT",
			message: "Invalid expiresAt timestamp",
			status: 400,
		};
	}

	const thawedAt = input.thawedAt ? parseDate(input.thawedAt) : null;
	if (input.thawedAt && !thawedAt) {
		return {
			success: false,
			code: "INVALID_THAWED_AT",
			message: "Invalid thawedAt timestamp",
			status: 400,
		};
	}

	const issuedAt = input.issuedAt ? parseDate(input.issuedAt) : null;
	if (input.issuedAt && !issuedAt) {
		return {
			success: false,
			code: "INVALID_ISSUED_AT",
			message: "Invalid issuedAt timestamp",
			status: 400,
		};
	}

	const returnedAt = input.returnedAt ? parseDate(input.returnedAt) : null;
	if (input.returnedAt && !returnedAt) {
		return {
			success: false,
			code: "INVALID_RETURNED_AT",
			message: "Invalid returnedAt timestamp",
			status: 400,
		};
	}

	if (input.receivedQty !== undefined && input.receivedQty < 0) {
		return {
			success: false,
			code: "INVALID_RECEIVED_QTY",
			message: "receivedQty must be greater than or equal to 0",
			status: 400,
		};
	}

	let lineId: string | null = null;
	const lineCode = input.lineCode?.trim();
	if (lineCode) {
		const line = await db.line.findUnique({ where: { code: lineCode }, select: { id: true } });
		if (!line) {
			return {
				success: false,
				code: "LINE_NOT_FOUND",
				message: "Line not found",
				status: 404,
			};
		}
		lineId = line.id;
	}

	const runNo = input.runNo?.trim();
	let run: { id: string; lineId: string | null; routeVersionId: string | null } | null = null;
	if (runNo) {
		run = await db.run.findUnique({
			where: { runNo },
			select: { id: true, lineId: true, routeVersionId: true },
		});
		if (!run) {
			return {
				success: false,
				code: "RUN_NOT_FOUND",
				message: "Run not found",
				status: 404,
			};
		}

		if (!run.lineId) {
			return {
				success: false,
				code: "RUN_LINE_NOT_SET",
				message: "Run has no line binding",
				status: 400,
			};
		}

		if (lineId && lineId !== run.lineId) {
			return {
				success: false,
				code: "LINE_MISMATCH",
				message: "lineCode does not match run.line",
				status: 400,
			};
		}

		lineId = run.lineId;
	}

	const runId = run?.id ?? null;

	const routingStepIdRaw = input.routingStepId?.trim();
	const routingStepId = routingStepIdRaw ? routingStepIdRaw : null;
	if (routingStepId) {
		const step = await db.routingStep.findUnique({
			where: { id: routingStepId },
			select: { id: true, routingId: true },
		});
		if (!step) {
			return {
				success: false,
				code: "ROUTING_STEP_NOT_FOUND",
				message: "Routing step not found",
				status: 404,
			};
		}

		if (run?.routeVersionId) {
			const version = await db.executableRouteVersion.findUnique({
				where: { id: run.routeVersionId },
				select: { routingId: true },
			});
			if (version && version.routingId !== step.routingId) {
				return {
					success: false,
					code: "ROUTING_STEP_MISMATCH",
					message: "routingStepId does not belong to the run routing",
					status: 400,
				};
			}
		}
	}

	const record = await db.solderPasteUsageRecord.create({
		data: {
			lotId,
			lineId,
			runId,
			routingStepId,
			receivedAt,
			expiresAt,
			receivedQty: input.receivedQty ?? null,
			thawedAt,
			issuedAt,
			returnedAt,
			isReturned: input.isReturned ?? null,
			usedBy: input.usedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
		include: {
			line: { select: { id: true, code: true, name: true } },
			run: { select: { id: true, runNo: true } },
		},
	});

	if (issuedAt) {
		try {
			await createMesEvent(db, {
				eventType: MES_EVENT_TYPES.SOLDER_PASTE_USAGE_CREATE,
				idempotencyKey: buildMesEventIdempotencyKey(
					MES_EVENT_TYPES.SOLDER_PASTE_USAGE_CREATE,
					record.id,
				),
				occurredAt: issuedAt,
				entityType: "SOLDER_PASTE_LOT",
				entityId: lotId,
				runId: record.runId ?? null,
				payload: {
					recordId: record.id,
					lotId,
					lineId: record.lineId,
					runId: record.runId,
					routingStepId: record.routingStepId,
					issuedAt: issuedAt.toISOString(),
				},
			});
		} catch (error) {
			console.error(`[SolderPaste] Event emit failed for lot ${lotId}:`, error);
		}
	}

	return { success: true, data: mapSolderPasteUsageRecord(record) };
}

export async function listColdStorageTemperatureRecords(
	db: PrismaClient,
	query: ColdStorageTemperatureListQuery,
): Promise<{
	items: ColdStorageTemperatureRecordDetail[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 30, 100);
	const where: Prisma.ColdStorageTemperatureRecordWhereInput = {};

	const measuredFrom = query.measuredFrom ? parseDate(query.measuredFrom) : null;
	const measuredTo = query.measuredTo ? parseDate(query.measuredTo) : null;
	if (measuredFrom || measuredTo) {
		where.measuredAt = {
			...(measuredFrom ? { gte: measuredFrom } : {}),
			...(measuredTo ? { lte: measuredTo } : {}),
		};
	}

	const [items, total] = await Promise.all([
		db.coldStorageTemperatureRecord.findMany({
			where,
			orderBy: { measuredAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.coldStorageTemperatureRecord.count({ where }),
	]);

	return { items: items.map(mapColdStorageTemperatureRecord), total, page, pageSize };
}

export async function createColdStorageTemperatureRecord(
	db: PrismaClient,
	input: ColdStorageTemperatureCreateInput,
): Promise<ServiceResult<ColdStorageTemperatureRecordDetail>> {
	const measuredAt = parseDate(input.measuredAt);
	if (!measuredAt) {
		return {
			success: false,
			code: "INVALID_MEASURED_AT",
			message: "Invalid measuredAt timestamp",
			status: 400,
		};
	}

	if (!Number.isFinite(input.temperature)) {
		return {
			success: false,
			code: "INVALID_TEMPERATURE",
			message: "temperature must be a number",
			status: 400,
		};
	}

	const record = await db.coldStorageTemperatureRecord.create({
		data: {
			measuredAt,
			temperature: input.temperature,
			measuredBy: input.measuredBy.trim(),
			reviewedBy: input.reviewedBy?.trim() || null,
			remark: input.remark?.trim() || null,
			meta: input.meta ?? undefined,
		},
	});

	return { success: true, data: mapColdStorageTemperatureRecord(record) };
}
