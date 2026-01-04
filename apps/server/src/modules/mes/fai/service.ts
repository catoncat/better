import {
	InspectionStatus,
	InspectionType,
	type Prisma,
	type PrismaClient,
	RunStatus,
} from "@better-app/db";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { completeFaiSchema, createFaiSchema, recordFaiItemSchema } from "./schema";

type CreateFaiInput = Static<typeof createFaiSchema>;
type RecordFaiItemInput = Static<typeof recordFaiItemSchema>;
type CompleteFaiInput = Static<typeof completeFaiSchema>;

type InspectionRecord = Prisma.InspectionGetPayload<{
	include: { items: true };
}>;

const tracer = trace.getTracer("mes.fai");

/**
 * Create a FAI (First Article Inspection) task for a run.
 * FAI is required before run authorization when the routing requires it.
 */
export async function createFai(
	db: PrismaClient,
	runNo: string,
	data: CreateFaiInput,
	_createdBy?: string,
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("fai.create", async (span) => {
		span.setAttribute("fai.runNo", runNo);
		span.setAttribute("fai.sampleQty", data.sampleQty);

		try {
			const run = await db.run.findUnique({ where: { runNo } });
			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				};
			}

			// Check if run is in a valid state for FAI creation
			if (run.status !== RunStatus.PREP) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "INVALID_RUN_STATUS",
					message: `Run status ${run.status} does not allow FAI creation`,
					status: 400,
				};
			}

			// Check if there's already an active FAI
			const existingFai = await db.inspection.findFirst({
				where: {
					runId: run.id,
					type: InspectionType.FAI,
					status: { in: [InspectionStatus.PENDING, InspectionStatus.INSPECTING] },
				},
			});

			if (existingFai) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_ALREADY_EXISTS",
					message: "An active FAI task already exists for this run",
					status: 400,
				};
			}

			const fai = await db.$transaction(async (tx) => {
				// Create the FAI inspection
				const inspection = await tx.inspection.create({
					data: {
						runId: run.id,
						type: InspectionType.FAI,
						status: InspectionStatus.PENDING,
						sampleQty: data.sampleQty,
						passedQty: 0,
						failedQty: 0,
						remark: data.remark,
					},
					include: { items: true },
				});

				return inspection;
			});

			span.setAttribute("fai.id", fai.id);
			return { success: true as const, data: fai };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
}

/**
 * Start FAI inspection - changes status from PENDING to INSPECTING.
 */
export async function startFai(
	db: PrismaClient,
	faiId: string,
	inspectorId?: string,
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("fai.start", async (span) => {
		span.setAttribute("fai.id", faiId);

		try {
			const fai = await db.inspection.findUnique({
				where: { id: faiId },
				include: { items: true },
			});

			if (!fai) {
				return {
					success: false as const,
					code: "FAI_NOT_FOUND",
					message: "FAI task not found",
					status: 404,
				};
			}

			if (fai.type !== InspectionType.FAI) {
				return {
					success: false as const,
					code: "NOT_FAI_INSPECTION",
					message: "This is not a FAI inspection",
					status: 400,
				};
			}

			if (fai.status !== InspectionStatus.PENDING) {
				return {
					success: false as const,
					code: "INVALID_FAI_STATUS",
					message: `FAI status ${fai.status} cannot be started`,
					status: 400,
				};
			}

			const updated = await db.inspection.update({
				where: { id: faiId },
				data: {
					status: InspectionStatus.INSPECTING,
					inspectorId,
					startedAt: new Date(),
				},
				include: { items: true },
			});

			return { success: true as const, data: updated };
		} finally {
			span.end();
		}
	});
}

/**
 * Record a FAI inspection item result.
 */
export async function recordFaiItem(
	db: PrismaClient,
	faiId: string,
	data: RecordFaiItemInput,
	inspectedBy?: string,
): Promise<ServiceResult<{ itemId: string }>> {
	return tracer.startActiveSpan("fai.recordItem", async (span) => {
		span.setAttribute("fai.id", faiId);
		span.setAttribute("fai.itemName", data.itemName);

		try {
			const fai = await db.inspection.findUnique({ where: { id: faiId } });

			if (!fai) {
				return {
					success: false as const,
					code: "FAI_NOT_FOUND",
					message: "FAI task not found",
					status: 404,
				};
			}

			if (fai.type !== InspectionType.FAI) {
				return {
					success: false as const,
					code: "NOT_FAI_INSPECTION",
					message: "This is not a FAI inspection",
					status: 400,
				};
			}

			if (fai.status !== InspectionStatus.INSPECTING) {
				return {
					success: false as const,
					code: "FAI_NOT_INSPECTING",
					message: `FAI must be in INSPECTING status to record items`,
					status: 400,
				};
			}

			const item = await db.inspectionItem.create({
				data: {
					inspectionId: faiId,
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
		} finally {
			span.end();
		}
	});
}

/**
 * Complete FAI with final decision.
 */
export async function completeFai(
	db: PrismaClient,
	faiId: string,
	data: CompleteFaiInput,
	decidedBy?: string,
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("fai.complete", async (span) => {
		span.setAttribute("fai.id", faiId);
		span.setAttribute("fai.decision", data.decision);

		try {
			const fai = await db.inspection.findUnique({
				where: { id: faiId },
				include: { run: true },
			});

			if (!fai) {
				return {
					success: false as const,
					code: "FAI_NOT_FOUND",
					message: "FAI task not found",
					status: 404,
				};
			}

			if (fai.type !== InspectionType.FAI) {
				return {
					success: false as const,
					code: "NOT_FAI_INSPECTION",
					message: "This is not a FAI inspection",
					status: 400,
				};
			}

			if (fai.status !== InspectionStatus.INSPECTING) {
				return {
					success: false as const,
					code: "FAI_NOT_INSPECTING",
					message: `FAI must be in INSPECTING status to complete`,
					status: 400,
				};
			}

			const sampleQty = fai.sampleQty;
			let passedQty = data.passedQty;
			let failedQty = data.failedQty;

			if (data.decision === "PASS") {
				if (failedQty !== undefined && failedQty !== 0) {
					return {
						success: false as const,
						code: "INVALID_FAI_COUNTS",
						message: "Failed quantity must be 0 when decision is PASS",
						status: 400,
					};
				}

				failedQty = failedQty ?? 0;

				if (sampleQty !== null && sampleQty !== undefined) {
					passedQty = passedQty ?? sampleQty;
					if (passedQty !== sampleQty) {
						return {
							success: false as const,
							code: "INVALID_FAI_COUNTS",
							message: "Passed quantity must equal sample quantity when decision is PASS",
							status: 400,
						};
					}
				}
			} else {
				if (failedQty === undefined || failedQty <= 0) {
					return {
						success: false as const,
						code: "INVALID_FAI_COUNTS",
						message: "Failed quantity must be greater than 0 when decision is FAIL",
						status: 400,
					};
				}

				if (sampleQty !== null && sampleQty !== undefined) {
					passedQty = passedQty ?? sampleQty - failedQty;
					if (passedQty < 0 || passedQty + failedQty !== sampleQty) {
						return {
							success: false as const,
							code: "INVALID_FAI_COUNTS",
							message: "Passed + failed quantities must equal sample quantity",
							status: 400,
						};
					}
				}
			}

			const newStatus = data.decision === "PASS" ? InspectionStatus.PASS : InspectionStatus.FAIL;

			const updated = await db.inspection.update({
				where: { id: faiId },
				data: {
					status: newStatus,
					passedQty,
					failedQty,
					decidedBy,
					decidedAt: new Date(),
					remark: data.remark ?? fai.remark,
				},
				include: { items: true },
			});

			return { success: true as const, data: updated };
		} finally {
			span.end();
		}
	});
}

/**
 * Get FAI details by ID.
 */
export async function getFai(
	db: PrismaClient,
	faiId: string,
): Promise<ServiceResult<InspectionRecord>> {
	const fai = await db.inspection.findUnique({
		where: { id: faiId },
		include: { items: true },
	});

	if (!fai) {
		return {
			success: false as const,
			code: "FAI_NOT_FOUND",
			message: "FAI task not found",
			status: 404,
		};
	}

	return { success: true as const, data: fai };
}

/**
 * Get FAI for a run.
 */
export async function getFaiByRun(
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

	const fai = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.FAI,
		},
		orderBy: { createdAt: "desc" },
		include: { items: true },
	});

	return { success: true as const, data: fai };
}

/**
 * List FAI inspections with filters.
 */
export async function listFai(
	db: PrismaClient,
	query: {
		runNo?: string;
		status?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<{
	items: InspectionRecord[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);

	const where: Prisma.InspectionWhereInput = {
		type: InspectionType.FAI,
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
			include: { items: true, run: { select: { runNo: true } } },
		}),
		db.inspection.count({ where }),
	]);

	return { items, total, page, pageSize };
}

/**
 * Check if FAI is required and passed for run authorization.
 */
export async function checkFaiGate(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ requiresFai: boolean; faiPassed: boolean; faiId?: string }>> {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			routeVersion: {
				include: {
					routing: {
						include: {
							steps: true,
						},
					},
				},
			},
		},
	});

	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	// Check if any step requires FAI
	const requiresFai = run.routeVersion?.routing?.steps?.some((s) => s.requiresFAI) ?? false;

	if (!requiresFai) {
		return {
			success: true as const,
			data: { requiresFai: false, faiPassed: true },
		};
	}

	// Check the latest FAI status
	const latestFai = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.FAI,
		},
		orderBy: { createdAt: "desc" },
	});

	return {
		success: true as const,
		data: {
			requiresFai: true,
			faiPassed: latestFai?.status === InspectionStatus.PASS,
			faiId: latestFai?.status === InspectionStatus.PASS ? latestFai.id : undefined,
		},
	};
}
