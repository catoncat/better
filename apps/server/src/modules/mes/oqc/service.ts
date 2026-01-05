import {
	InspectionStatus,
	InspectionType,
	Prisma,
	type PrismaClient,
	RunStatus,
	UnitStatus,
} from "@better-app/db";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { completeOqcSchema, createOqcSchema, recordOqcItemSchema } from "./schema";

type CreateOqcInput = Static<typeof createOqcSchema>;
type RecordOqcItemInput = Static<typeof recordOqcItemSchema>;
type CompleteOqcInput = Static<typeof completeOqcSchema>;

type InspectionRecord = Prisma.InspectionGetPayload<{
	include: { items: true; run: { select: { runNo: true; status: true } } };
}>;

const tracer = trace.getTracer("mes.oqc");
const buildInspectionActiveKey = (runId: string, type: InspectionType) => `${runId}:${type}`;

/**
 * Create an OQC (Outgoing Quality Control) task for a run.
 * OQC is created when all units in a run have completed (reached terminal state).
 * Idempotent: returns existing active OQC if one exists.
 */
export async function createOqc(
	db: PrismaClient,
	runNo: string,
	data: CreateOqcInput,
	options?: {
		createdBy?: string;
		sampledUnitIds?: string[];
		samplingRuleId?: string;
		samplingType?: string;
		samplingValue?: number;
	},
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("oqc.create", async (span) => {
		span.setAttribute("oqc.runNo", runNo);

		try {
			const run = await db.run.findUnique({
				where: { runNo },
				include: {
					workOrder: { select: { productCode: true } },
					units: { select: { id: true, sn: true, status: true } },
				},
			});

			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "RUN_NOT_FOUND",
					message: "Run not found",
					status: 404,
				};
			}

			// Check if run is in a valid state for OQC creation
			// OQC can be created when run is IN_PROGRESS and all units are DONE
			if (run.status !== RunStatus.IN_PROGRESS) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "INVALID_RUN_STATUS",
					message: `Run status ${run.status} does not allow OQC creation`,
					status: 400,
				};
			}

			const allUnitsDone =
				run.units.length > 0 && run.units.every((unit) => unit.status === UnitStatus.DONE);
			if (!allUnitsDone) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "OQC_NOT_READY",
					message: "Not all units are DONE for OQC creation",
					status: 400,
				};
			}

			const activeKey = buildInspectionActiveKey(run.id, InspectionType.OQC);

			// Check if there's already an active OQC (idempotency)
			const existingOqc = await db.inspection.findFirst({
				where: {
					runId: run.id,
					type: InspectionType.OQC,
					status: { in: [InspectionStatus.PENDING, InspectionStatus.INSPECTING] },
				},
				include: { items: true, run: { select: { runNo: true, status: true } } },
			});

			if (existingOqc) {
				if (!existingOqc.activeKey) {
					try {
						await db.inspection.update({
							where: { id: existingOqc.id },
							data: { activeKey },
						});
					} catch (error) {
						if (
							!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
						) {
							throw error;
						}
					}
				}
				// Return existing OQC for idempotency
				span.setAttribute("oqc.id", existingOqc.id);
				span.setAttribute("oqc.idempotent", true);
				return { success: true as const, data: existingOqc };
			}

			// Calculate sample quantity
			const unitCount = run.units.length;
			const sampleQty = data.sampleQty ?? unitCount; // Default to all units if not specified

			// Store OQC metadata in the data field
			const oqcData: Record<string, Prisma.InputJsonValue> = {};
			if (options?.sampledUnitIds) oqcData.sampledUnitIds = options.sampledUnitIds;
			if (options?.samplingRuleId) oqcData.samplingRuleId = options.samplingRuleId;
			if (options?.samplingType) oqcData.samplingType = options.samplingType;
			if (options?.samplingValue) oqcData.samplingValue = options.samplingValue;

			try {
				const oqc = await db.$transaction(async (tx) => {
					const inspection = await tx.inspection.create({
						data: {
							runId: run.id,
							type: InspectionType.OQC,
							status: InspectionStatus.PENDING,
							activeKey,
							sampleQty,
							passedQty: 0,
							failedQty: 0,
							remark: data.remark,
							data:
								Object.keys(oqcData).length > 0
									? (oqcData as Prisma.InputJsonObject)
									: Prisma.JsonNull,
						},
						include: { items: true, run: { select: { runNo: true, status: true } } },
					});

					return inspection;
				});

				span.setAttribute("oqc.id", oqc.id);
				span.setAttribute("oqc.sampleQty", sampleQty);
				return { success: true as const, data: oqc };
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					const activeOqc = await db.inspection.findFirst({
						where: { activeKey },
						include: { items: true, run: { select: { runNo: true, status: true } } },
					});
					if (activeOqc) {
						span.setAttribute("oqc.id", activeOqc.id);
						span.setAttribute("oqc.idempotent", true);
						return { success: true as const, data: activeOqc };
					}
				}

				throw error;
			}
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
 * Start OQC inspection - changes status from PENDING to INSPECTING.
 */
export async function startOqc(
	db: PrismaClient,
	oqcId: string,
	inspectorId?: string,
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("oqc.start", async (span) => {
		span.setAttribute("oqc.id", oqcId);

		try {
			const oqc = await db.inspection.findUnique({
				where: { id: oqcId },
				include: { items: true, run: { select: { runNo: true, status: true } } },
			});

			if (!oqc) {
				return {
					success: false as const,
					code: "OQC_NOT_FOUND",
					message: "OQC task not found",
					status: 404,
				};
			}

			if (oqc.type !== InspectionType.OQC) {
				return {
					success: false as const,
					code: "NOT_OQC_INSPECTION",
					message: "This is not an OQC inspection",
					status: 400,
				};
			}

			if (oqc.status !== InspectionStatus.PENDING) {
				return {
					success: false as const,
					code: "INVALID_OQC_STATUS",
					message: `OQC status ${oqc.status} cannot be started`,
					status: 400,
				};
			}

			const updated = await db.inspection.update({
				where: { id: oqcId },
				data: {
					status: InspectionStatus.INSPECTING,
					inspectorId,
					startedAt: new Date(),
				},
				include: { items: true, run: { select: { runNo: true, status: true } } },
			});

			return { success: true as const, data: updated };
		} finally {
			span.end();
		}
	});
}

/**
 * Record an OQC inspection item result.
 */
export async function recordOqcItem(
	db: PrismaClient,
	oqcId: string,
	data: RecordOqcItemInput,
	inspectedBy?: string,
): Promise<ServiceResult<{ itemId: string }>> {
	return tracer.startActiveSpan("oqc.recordItem", async (span) => {
		span.setAttribute("oqc.id", oqcId);
		span.setAttribute("oqc.itemName", data.itemName);

		try {
			const oqc = await db.inspection.findUnique({
				where: { id: oqcId },
				select: { id: true, type: true, status: true, runId: true, data: true },
			});

			if (!oqc) {
				return {
					success: false as const,
					code: "OQC_NOT_FOUND",
					message: "OQC task not found",
					status: 404,
				};
			}

			if (oqc.type !== InspectionType.OQC) {
				return {
					success: false as const,
					code: "NOT_OQC_INSPECTION",
					message: "This is not an OQC inspection",
					status: 400,
				};
			}

			if (oqc.status !== InspectionStatus.INSPECTING) {
				return {
					success: false as const,
					code: "OQC_NOT_INSPECTING",
					message: "OQC must be in INSPECTING status to record items",
					status: 400,
				};
			}

			const unit = await db.unit.findUnique({
				where: { sn: data.unitSn },
				select: { id: true, runId: true },
			});

			if (!unit) {
				return {
					success: false as const,
					code: "UNIT_NOT_FOUND",
					message: "Unit not found",
					status: 404,
				};
			}

			if (unit.runId !== oqc.runId) {
				return {
					success: false as const,
					code: "UNIT_RUN_MISMATCH",
					message: "Unit does not belong to this run",
					status: 400,
				};
			}

			const sampledUnitIds = (oqc.data as Record<string, unknown> | null)?.sampledUnitIds;
			if (Array.isArray(sampledUnitIds) && sampledUnitIds.length > 0) {
				if (!sampledUnitIds.includes(unit.id)) {
					return {
						success: false as const,
						code: "UNIT_NOT_IN_SAMPLE",
						message: "Unit is not in sampled list for this OQC",
						status: 400,
					};
				}
			}

			const item = await db.inspectionItem.create({
				data: {
					inspectionId: oqcId,
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
 * Complete OQC with final decision.
 * PASS → Run status = COMPLETED
 * FAIL → Run status = ON_HOLD (triggers MRB)
 */
export async function completeOqc(
	db: PrismaClient,
	oqcId: string,
	data: CompleteOqcInput,
	decidedBy?: string,
): Promise<ServiceResult<InspectionRecord>> {
	return tracer.startActiveSpan("oqc.complete", async (span) => {
		span.setAttribute("oqc.id", oqcId);
		span.setAttribute("oqc.decision", data.decision);

		try {
			const oqc = await db.inspection.findUnique({
				where: { id: oqcId },
				include: { run: true },
			});

			if (!oqc) {
				return {
					success: false as const,
					code: "OQC_NOT_FOUND",
					message: "OQC task not found",
					status: 404,
				};
			}

			if (oqc.type !== InspectionType.OQC) {
				return {
					success: false as const,
					code: "NOT_OQC_INSPECTION",
					message: "This is not an OQC inspection",
					status: 400,
				};
			}

			if (oqc.status !== InspectionStatus.INSPECTING) {
				return {
					success: false as const,
					code: "OQC_NOT_INSPECTING",
					message: "OQC must be in INSPECTING status to complete",
					status: 400,
				};
			}

			// Validate counts
			const sampleQty = oqc.sampleQty;
			let passedQty = data.passedQty;
			let failedQty = data.failedQty;

			if (data.decision === "PASS") {
				if (failedQty !== undefined && failedQty !== 0) {
					return {
						success: false as const,
						code: "INVALID_OQC_COUNTS",
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
							code: "INVALID_OQC_COUNTS",
							message: "Passed quantity must equal sample quantity when decision is PASS",
							status: 400,
						};
					}
				}
			} else {
				// FAIL decision
				if (failedQty === undefined || failedQty <= 0) {
					return {
						success: false as const,
						code: "INVALID_OQC_COUNTS",
						message: "Failed quantity must be greater than 0 when decision is FAIL",
						status: 400,
					};
				}
				if (sampleQty !== null && sampleQty !== undefined) {
					passedQty = passedQty ?? sampleQty - failedQty;
					if (passedQty < 0 || passedQty + failedQty !== sampleQty) {
						return {
							success: false as const,
							code: "INVALID_OQC_COUNTS",
							message: "Passed + failed quantities must equal sample quantity",
							status: 400,
						};
					}
				}
			}

			const newInspectionStatus =
				data.decision === "PASS" ? InspectionStatus.PASS : InspectionStatus.FAIL;
			const newRunStatus = data.decision === "PASS" ? RunStatus.COMPLETED : RunStatus.ON_HOLD;

			await db.$transaction(async (tx) => {
				// Update OQC inspection
				await tx.inspection.update({
					where: { id: oqcId },
					data: {
						status: newInspectionStatus,
						activeKey: null,
						passedQty,
						failedQty,
						decidedBy,
						decidedAt: new Date(),
						remark: data.remark ?? oqc.remark,
					},
				});

				// Update run status
				await tx.run.update({
					where: { id: oqc.runId },
					data: {
						status: newRunStatus,
						...(newRunStatus === RunStatus.COMPLETED ? { endedAt: new Date() } : {}),
					},
				});
			});

			// Refresh to get updated run status
			const result = await db.inspection.findUnique({
				where: { id: oqcId },
				include: { items: true, run: { select: { runNo: true, status: true } } },
			});

			if (!result) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "OQC_NOT_FOUND",
					message: "OQC task not found",
					status: 404,
				};
			}

			return { success: true as const, data: result };
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
 * Get OQC details by ID.
 */
export async function getOqc(
	db: PrismaClient,
	oqcId: string,
): Promise<ServiceResult<InspectionRecord>> {
	const oqc = await db.inspection.findUnique({
		where: { id: oqcId },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});

	if (!oqc) {
		return {
			success: false as const,
			code: "OQC_NOT_FOUND",
			message: "OQC task not found",
			status: 404,
		};
	}

	if (oqc.type !== InspectionType.OQC) {
		return {
			success: false as const,
			code: "NOT_OQC_INSPECTION",
			message: "This is not an OQC inspection",
			status: 400,
		};
	}

	return { success: true as const, data: oqc };
}

/**
 * Get OQC for a run.
 */
export async function getOqcByRun(
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

	const oqc = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.OQC,
		},
		orderBy: { createdAt: "desc" },
		include: { items: true, run: { select: { runNo: true, status: true } } },
	});

	return { success: true as const, data: oqc };
}

/**
 * List OQC inspections with filters.
 */
export async function listOqc(
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
		type: InspectionType.OQC,
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

/**
 * Check if OQC is required for run completion and get gate status.
 */
export async function checkOqcGate(
	db: PrismaClient,
	runNo: string,
): Promise<
	ServiceResult<{
		requiresOqc: boolean;
		oqcPassed: boolean;
		oqcId?: string;
		oqcStatus?: InspectionStatus;
	}>
> {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: { select: { productCode: true } },
			line: { select: { id: true } },
			routeVersion: { select: { routingId: true } },
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

	// Import getApplicableRule lazily to avoid circular dependencies
	const { getApplicableRule } = await import("./sampling-rule-service");

	// Check if there's an applicable sampling rule
	const rule = await getApplicableRule(db, {
		productCode: run.workOrder?.productCode,
		lineId: run.lineId,
		routingId: run.routeVersion?.routingId,
	});

	if (!rule) {
		// No sampling rule = no OQC required
		return {
			success: true as const,
			data: { requiresOqc: false, oqcPassed: true },
		};
	}

	// Check the latest OQC status
	const latestOqc = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.OQC,
		},
		orderBy: { createdAt: "desc" },
	});

	return {
		success: true as const,
		data: {
			requiresOqc: true,
			oqcPassed: latestOqc?.status === InspectionStatus.PASS,
			oqcId: latestOqc?.id,
			oqcStatus: latestOqc?.status,
		},
	};
}
