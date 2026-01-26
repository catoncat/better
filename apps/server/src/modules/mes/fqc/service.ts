import {
	InspectionStatus,
	InspectionType,
	Prisma,
	type PrismaClient,
	RunStatus,
	UnitStatus,
} from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	completeFqcSchema,
	createFqcSchema,
	recordFqcItemSchema,
	signFqcSchema,
} from "./schema";

type CreateFqcInput = Static<typeof createFqcSchema>;
type RecordFqcItemInput = Static<typeof recordFqcItemSchema>;
type CompleteFqcInput = Static<typeof completeFqcSchema>;
type SignFqcInput = Static<typeof signFqcSchema>;

type InspectionRecord = Prisma.InspectionGetPayload<{
	include: { items: true; run: { select: { runNo: true; status: true } } };
}>;

const buildInspectionActiveKey = (runId: string, type: InspectionType) => `${runId}:${type}`;

/**
 * Create a FQC (Final Quality Check) task for a run.
 * For SMT WP-6, FQC represents "末件检查" (last-piece inspection).
 */
export async function createFqc(
	db: PrismaClient,
	runNo: string,
	data: CreateFqcInput,
	_createdBy?: string,
): Promise<ServiceResult<InspectionRecord>> {
	const run = await db.run.findUnique({
		where: { runNo },
		include: { units: { select: { id: true, sn: true, status: true } } },
	});
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const allowedRunStatuses: RunStatus[] = [
		RunStatus.IN_PROGRESS,
		RunStatus.ON_HOLD,
		RunStatus.COMPLETED,
		RunStatus.CLOSED_REWORK,
		RunStatus.SCRAPPED,
	];

	if (!allowedRunStatuses.includes(run.status)) {
		return {
			success: false as const,
			code: "INVALID_RUN_STATUS",
			message: `Run status ${run.status} does not allow FQC creation`,
			status: 400,
		};
	}

	const allUnitsTerminal =
		run.units.length > 0 &&
		run.units.every(
			(unit) => unit.status === UnitStatus.DONE || unit.status === UnitStatus.SCRAPPED,
		);
	if (!allUnitsTerminal) {
		return {
			success: false as const,
			code: "FQC_NOT_READY",
			message: "Not all units are terminal for FQC creation",
			status: 400,
		};
	}

	const eligibleCount = run.units.filter((unit) => unit.status === UnitStatus.DONE).length;
	if (eligibleCount === 0) {
		return {
			success: false as const,
			code: "NO_ELIGIBLE_UNITS",
			message: "No eligible (DONE) units for FQC creation",
			status: 400,
		};
	}

	const sampleQty = data.sampleQty ?? 1;
	if (sampleQty < 1 || sampleQty > eligibleCount) {
		return {
			success: false as const,
			code: "INVALID_SAMPLE_QTY",
			message: "Sample quantity is invalid",
			status: 400,
		};
	}

	const activeKey = buildInspectionActiveKey(run.id, InspectionType.FQC);

	const existing = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.FQC,
			status: { in: [InspectionStatus.PENDING, InspectionStatus.INSPECTING] },
		},
	});
	if (existing) {
		if (!existing.activeKey) {
			try {
				await db.inspection.update({ where: { id: existing.id }, data: { activeKey } });
			} catch (error) {
				if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
					throw error;
				}
			}
		}
		return {
			success: false as const,
			code: "FQC_ALREADY_EXISTS",
			message: "An active FQC task already exists for this run",
			status: 400,
		};
	}

	try {
		const inspection = await db.inspection.create({
			data: {
				runId: run.id,
				type: InspectionType.FQC,
				status: InspectionStatus.PENDING,
				activeKey,
				sampleQty,
				passedQty: 0,
				failedQty: 0,
				remark: data.remark,
			},
			include: { items: true, run: { select: { runNo: true, status: true } } },
		});
		return { success: true as const, data: inspection };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false as const,
				code: "FQC_ALREADY_EXISTS",
				message: "An active FQC task already exists for this run",
				status: 400,
			};
		}
		throw error;
	}
}

/**
 * Start FQC inspection - changes status from PENDING to INSPECTING.
 */
export async function startFqc(
	db: PrismaClient,
	fqcId: string,
	inspectorId?: string,
): Promise<ServiceResult<InspectionRecord>> {
	const fqc = await db.inspection.findUnique({
		where: { id: fqcId },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	if (!fqc) {
		return {
			success: false as const,
			code: "FQC_NOT_FOUND",
			message: "FQC task not found",
			status: 404,
		};
	}

	if (fqc.type !== InspectionType.FQC) {
		return {
			success: false as const,
			code: "NOT_FQC_INSPECTION",
			message: "This is not an FQC inspection",
			status: 400,
		};
	}

	if (fqc.status !== InspectionStatus.PENDING) {
		return {
			success: false as const,
			code: "INVALID_FQC_STATUS",
			message: `FQC status ${fqc.status} cannot be started`,
			status: 400,
		};
	}

	const updated = await db.inspection.update({
		where: { id: fqcId },
		data: { status: InspectionStatus.INSPECTING, inspectorId, startedAt: new Date() },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	return { success: true as const, data: updated };
}

/**
 * Record an FQC inspection item result.
 */
export async function recordFqcItem(
	db: PrismaClient,
	fqcId: string,
	data: RecordFqcItemInput,
	inspectedBy?: string,
): Promise<ServiceResult<{ itemId: string }>> {
	const fqc = await db.inspection.findUnique({ where: { id: fqcId } });
	if (!fqc) {
		return {
			success: false as const,
			code: "FQC_NOT_FOUND",
			message: "FQC task not found",
			status: 404,
		};
	}

	if (fqc.type !== InspectionType.FQC) {
		return {
			success: false as const,
			code: "NOT_FQC_INSPECTION",
			message: "This is not an FQC inspection",
			status: 400,
		};
	}

	if (fqc.status !== InspectionStatus.INSPECTING) {
		return {
			success: false as const,
			code: "FQC_NOT_INSPECTING",
			message: "FQC must be in INSPECTING status to record items",
			status: 400,
		};
	}

	const item = await db.inspectionItem.create({
		data: {
			inspectionId: fqcId,
			unitSn: data.unitSn,
			itemName: data.itemName,
			itemSpec: data.itemSpec,
			actualValue: data.actualValue,
			result: data.result,
			defectCode: data.defectCode,
			remark: data.remark,
			inspectedBy,
			inspectedAt: new Date(),
		},
	});

	return { success: true as const, data: { itemId: item.id } };
}

/**
 * Complete FQC with final decision.
 */
export async function completeFqc(
	db: PrismaClient,
	fqcId: string,
	data: CompleteFqcInput,
	decidedBy?: string,
): Promise<ServiceResult<InspectionRecord>> {
	const fqc = await db.inspection.findUnique({
		where: { id: fqcId },
		include: { run: { select: { runNo: true, status: true } } },
	});
	if (!fqc) {
		return {
			success: false as const,
			code: "FQC_NOT_FOUND",
			message: "FQC task not found",
			status: 404,
		};
	}

	if (fqc.type !== InspectionType.FQC) {
		return {
			success: false as const,
			code: "NOT_FQC_INSPECTION",
			message: "This is not an FQC inspection",
			status: 400,
		};
	}

	if (fqc.status !== InspectionStatus.INSPECTING) {
		return {
			success: false as const,
			code: "FQC_NOT_INSPECTING",
			message: "FQC must be in INSPECTING status to complete",
			status: 400,
		};
	}

	const sampleQty = fqc.sampleQty ?? 1;
	let passedQty = data.passedQty;
	let failedQty = data.failedQty;

	if (data.decision === "PASS") {
		if (failedQty !== undefined && failedQty !== 0) {
			return {
				success: false as const,
				code: "INVALID_FQC_COUNTS",
				message: "Failed quantity must be 0 when decision is PASS",
				status: 400,
			};
		}
		failedQty = failedQty ?? 0;
		passedQty = passedQty ?? sampleQty;
		if (passedQty !== sampleQty) {
			return {
				success: false as const,
				code: "INVALID_FQC_COUNTS",
				message: "Passed quantity must equal sample quantity when decision is PASS",
				status: 400,
			};
		}
	} else {
		if (failedQty === undefined || failedQty <= 0) {
			return {
				success: false as const,
				code: "INVALID_FQC_COUNTS",
				message: "Failed quantity must be greater than 0 when decision is FAIL",
				status: 400,
			};
		}
		passedQty = passedQty ?? sampleQty - failedQty;
		if (passedQty < 0 || passedQty + failedQty !== sampleQty) {
			return {
				success: false as const,
				code: "INVALID_FQC_COUNTS",
				message: "Passed + failed quantities must equal sample quantity",
				status: 400,
			};
		}
	}

	const newStatus = data.decision === "PASS" ? InspectionStatus.PASS : InspectionStatus.FAIL;
	const updated = await db.inspection.update({
		where: { id: fqcId },
		data: {
			status: newStatus,
			activeKey: null,
			passedQty,
			failedQty,
			decidedBy,
			decidedAt: new Date(),
			remark: data.remark ?? fqc.remark,
		},
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});

	return { success: true as const, data: updated };
}

/**
 * Sign FQC - add signature to a PASS FQC.
 */
export async function signFqc(
	db: PrismaClient,
	fqcId: string,
	data: SignFqcInput,
	signedBy: string,
): Promise<ServiceResult<InspectionRecord>> {
	const fqc = await db.inspection.findUnique({
		where: { id: fqcId },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	if (!fqc) {
		return {
			success: false as const,
			code: "FQC_NOT_FOUND",
			message: "FQC task not found",
			status: 404,
		};
	}

	if (fqc.type !== InspectionType.FQC) {
		return {
			success: false as const,
			code: "NOT_FQC_INSPECTION",
			message: "This is not an FQC inspection",
			status: 400,
		};
	}

	if (fqc.status !== InspectionStatus.PASS) {
		return {
			success: false as const,
			code: "FQC_NOT_PASSED",
			message: "Only PASS FQC can be signed",
			status: 400,
		};
	}

	if (fqc.signedBy && fqc.signedAt) {
		return {
			success: false as const,
			code: "FQC_ALREADY_SIGNED",
			message: "FQC has already been signed",
			status: 400,
		};
	}

	const updated = await db.inspection.update({
		where: { id: fqcId },
		data: {
			signedBy,
			signedAt: new Date(),
			signatureRemark: data.remark,
		},
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	return { success: true as const, data: updated };
}

/**
 * Get FQC details by ID.
 */
export async function getFqc(
	db: PrismaClient,
	fqcId: string,
): Promise<ServiceResult<InspectionRecord>> {
	const fqc = await db.inspection.findUnique({
		where: { id: fqcId },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	if (!fqc) {
		return {
			success: false as const,
			code: "FQC_NOT_FOUND",
			message: "FQC task not found",
			status: 404,
		};
	}
	if (fqc.type !== InspectionType.FQC) {
		return {
			success: false as const,
			code: "NOT_FQC_INSPECTION",
			message: "This is not an FQC inspection",
			status: 400,
		};
	}
	return { success: true as const, data: fqc };
}

/**
 * Get latest FQC for a run.
 */
export async function getFqcByRun(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<InspectionRecord | null>> {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const fqc = await db.inspection.findFirst({
		where: { runId: run.id, type: InspectionType.FQC },
		orderBy: { createdAt: "desc" },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});
	return { success: true as const, data: fqc };
}

/**
 * List FQC inspections with filters.
 */
export async function listFqc(
	db: PrismaClient,
	query: { runNo?: string; status?: string; page?: number; pageSize?: number },
): Promise<{ items: InspectionRecord[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);

	const where: Prisma.InspectionWhereInput = {
		type: InspectionType.FQC,
	};

	if (query.status) {
		const statuses = query.status
			.split(",")
			.map((status) => status.trim())
			.filter(Boolean) as InspectionStatus[];
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.runNo) {
		const run = await db.run.findUnique({ where: { runNo: query.runNo } });
		if (run) {
			where.runId = run.id;
		} else {
			return { items: [], total: 0, page, pageSize };
		}
	}

	const [items, total] = await Promise.all([
		db.inspection.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { items: true, run: { select: { runNo: true, status: true } } },
		}),
		db.inspection.count({ where }),
	]);

	return { items, total, page, pageSize };
}
