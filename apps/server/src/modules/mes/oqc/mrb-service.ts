import {
	InspectionStatus,
	InspectionType,
	type Prisma,
	type PrismaClient,
	RunStatus,
	UnitStatus,
} from "@better-app/db";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { createReworkRunSchema, mrbDecisionSchema } from "./schema";

type MrbDecisionInput = Static<typeof mrbDecisionSchema>;
type CreateReworkRunInput = Static<typeof createReworkRunSchema>;

type ReworkType = "REUSE_PREP" | "FULL_PREP";

const isReworkDecision = (
	input: MrbDecisionInput,
): input is MrbDecisionInput & { decision: "REWORK"; reworkType: ReworkType } =>
	input.decision === "REWORK" &&
	(input.reworkType === "REUSE_PREP" || input.reworkType === "FULL_PREP");

type RunWithRelations = Prisma.RunGetPayload<{
	include: {
		workOrder: { select: { woNo: true; productCode: true } };
		units: { select: { id: true; sn: true; status: true; currentStepNo: true } };
	};
}>;

const tracer = trace.getTracer("mes.oqc.mrb");

type SnapshotStep = { stepNo: number };

const getSnapshotSteps = (snapshot: unknown): SnapshotStep[] | null => {
	if (!snapshot || typeof snapshot !== "object") return null;
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return null;
	return record.steps as SnapshotStep[];
};

const resolveFirstStepNo = async (
	db: PrismaClient | Prisma.TransactionClient,
	routeVersionId: string | null,
): Promise<ServiceResult<{ firstStepNo: number }>> => {
	if (!routeVersionId) {
		return {
			success: false as const,
			code: "ROUTE_VERSION_NOT_READY",
			message: "Run has no executable route version",
			status: 400,
		};
	}

	const routeVersion = await db.executableRouteVersion.findUnique({
		where: { id: routeVersionId },
		select: { snapshotJson: true },
	});

	if (!routeVersion) {
		return {
			success: false as const,
			code: "ROUTE_VERSION_NOT_READY",
			message: "Run has no executable route version",
			status: 400,
		};
	}

	const steps = getSnapshotSteps(routeVersion.snapshotJson);
	if (!steps || steps.length === 0) {
		return {
			success: false as const,
			code: "ROUTING_EMPTY",
			message: "Routing has no steps",
			status: 400,
		};
	}

	const firstStepNo = [...steps].sort((a, b) => a.stepNo - b.stepNo)[0]?.stepNo;
	if (!firstStepNo && firstStepNo !== 0) {
		return {
			success: false as const,
			code: "ROUTING_EMPTY",
			message: "Routing has no steps",
			status: 400,
		};
	}

	return { success: true as const, data: { firstStepNo } };
};

/**
 * Record MRB (Material Review Board) decision for a run in ON_HOLD status.
 *
 * Decisions:
 * - RELEASE: Run → COMPLETED (batch accepted as-is)
 * - REWORK: Run → CLOSED_REWORK + create new rework Run
 * - SCRAP: Run → SCRAPPED (entire batch scrapped)
 */
export async function recordMrbDecision(
	db: PrismaClient,
	runNo: string,
	data: MrbDecisionInput,
	options?: { decidedBy?: string; canWaiveFai?: boolean },
): Promise<ServiceResult<{ run: RunWithRelations; reworkRunNo?: string }>> {
	return tracer.startActiveSpan("mrb.recordDecision", async (span) => {
		span.setAttribute("runNo", runNo);
		span.setAttribute("decision", data.decision);

		try {
			const run = await db.run.findUnique({
				where: { runNo },
				include: {
					workOrder: { select: { woNo: true, productCode: true } },
					units: { select: { id: true, sn: true, status: true, currentStepNo: true } },
					inspections: {
						where: { type: InspectionType.OQC },
						orderBy: { createdAt: "desc" },
						take: 1,
					},
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

			if (run.status !== RunStatus.ON_HOLD) {
				if (
					run.status !== RunStatus.COMPLETED &&
					run.status !== RunStatus.CLOSED_REWORK &&
					run.status !== RunStatus.SCRAPPED
				) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					return {
						success: false as const,
						code: "RUN_NOT_ON_HOLD",
						message: "Run is not in ON_HOLD status",
						status: 400,
					};
				}

				const reworkRun =
					run.status === RunStatus.CLOSED_REWORK
						? await db.run.findFirst({
								where: { parentRunId: run.id },
								orderBy: { createdAt: "desc" },
								select: { runNo: true },
							})
						: null;
				span.setAttribute("idempotent", true);
				return {
					success: true as const,
					data: { run, reworkRunNo: reworkRun?.runNo },
				};
			}

			// Find the OQC inspection that caused the hold
			const oqcInspection = run.inspections[0];
			if (!oqcInspection || oqcInspection.status !== InspectionStatus.FAIL) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "NO_FAILED_OQC",
					message: "No failed OQC inspection found for this run",
					status: 400,
				};
			}

			// Validate REWORK decision requires reworkType
			if (data.decision === "REWORK" && !data.reworkType) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "REWORK_TYPE_REQUIRED",
					message: "reworkType is required when decision is REWORK",
					status: 400,
				};
			}

			// Validate FAI waiver requires reason
			if (data.faiWaiver && !data.faiWaiverReason) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_REASON_REQUIRED",
					message: "faiWaiverReason is required when faiWaiver is true",
					status: 400,
				};
			}
			if (data.faiWaiver && !options?.canWaiveFai) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_NOT_ALLOWED",
					message: "User is not allowed to waive FAI",
					status: 403,
				};
			}
			if (data.faiWaiver && data.decision !== "REWORK") {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_NOT_ALLOWED",
					message: "FAI waiver is only allowed for REWORK decision",
					status: 400,
				};
			}
			if (data.faiWaiver && data.reworkType !== "REUSE_PREP") {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_NOT_ALLOWED",
					message: "FAI waiver is only allowed for REUSE_PREP rework",
					status: 400,
				};
			}

			const firstStepResult =
				data.decision === "REWORK"
					? await resolveFirstStepNo(db, run.routeVersionId ?? null)
					: null;
			if (firstStepResult && !firstStepResult.success) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return firstStepResult;
			}

			let reworkRunNo: string | undefined;

			const result = await db.$transaction(async (tx) => {
				// Update OQC inspection with MRB decision
				const mrbData = {
					mrbDecision: data.decision,
					mrbReason: data.reason,
					mrbDecidedBy: options?.decidedBy,
					mrbDecidedAt: new Date().toISOString(),
					...(data.reworkType && { reworkType: data.reworkType }),
					...(data.faiWaiver !== undefined && { faiWaiver: data.faiWaiver }),
					...(data.faiWaiverReason && { faiWaiverReason: data.faiWaiverReason }),
				};

				await tx.inspection.update({
					where: { id: oqcInspection.id },
					data: {
						data: {
							...((oqcInspection.data as Record<string, unknown>) || {}),
							...mrbData,
						},
					},
				});

				// Apply the decision
				let newRunStatus: RunStatus;
				if (data.decision === "RELEASE") {
					newRunStatus = RunStatus.COMPLETED;
				} else if (isReworkDecision(data)) {
					newRunStatus = RunStatus.CLOSED_REWORK;
					reworkRunNo = await createReworkRun(tx, run, {
						reworkType: data.reworkType,
						faiWaiver: data.faiWaiver,
						faiWaiverReason: data.faiWaiverReason,
						mrbAuthorizedBy: options?.decidedBy,
						firstStepNo: firstStepResult?.data.firstStepNo ?? 1,
					});
				} else {
					newRunStatus = RunStatus.SCRAPPED;
					await tx.unit.updateMany({
						where: { runId: run.id },
						data: { status: UnitStatus.SCRAPPED },
					});
				}

				// Update run status
				const updatedRun = await tx.run.update({
					where: { id: run.id },
					data: {
						status: newRunStatus,
						endedAt: new Date(),
						mrbDecisionId: oqcInspection.id,
						mrbAuthorizedBy: options?.decidedBy,
						mrbAuthorizedAt: new Date(),
					},
					include: {
						workOrder: { select: { woNo: true, productCode: true } },
						units: { select: { id: true, sn: true, status: true, currentStepNo: true } },
					},
				});

				return updatedRun;
			});

			span.setAttribute("newStatus", result.status);
			if (reworkRunNo) {
				span.setAttribute("reworkRunNo", reworkRunNo);
			}

			return {
				success: true as const,
				data: { run: result, reworkRunNo },
			};
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
 * Create a rework run from an ON_HOLD run with an explicit MRB decision reference.
 */
export async function createReworkRunFromHold(
	db: PrismaClient,
	runNo: string,
	data: CreateReworkRunInput,
	options?: { decidedBy?: string; canWaiveFai?: boolean },
): Promise<
	ServiceResult<{
		reworkRunNo: string;
		status: RunStatus;
		authorizationType: string | null;
		mrbFaiWaiver: boolean | null;
		parentRunNo: string;
		parentRunStatus: RunStatus;
	}>
> {
	return tracer.startActiveSpan("mrb.createReworkRun", async (span) => {
		span.setAttribute("runNo", runNo);
		span.setAttribute("reworkType", data.reworkType);

		try {
			const run = await db.run.findUnique({
				where: { runNo },
				include: { units: { select: { id: true, sn: true, status: true, currentStepNo: true } } },
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

			if (run.status !== RunStatus.ON_HOLD) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "RUN_NOT_ON_HOLD",
					message: "Run is not in ON_HOLD status",
					status: 400,
				};
			}

			if (!data.mrbDecisionId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "MRB_DECISION_REQUIRED",
					message: "mrbDecisionId is required to create a rework run",
					status: 400,
				};
			}

			const decisionInspection = await db.inspection.findUnique({
				where: { id: data.mrbDecisionId },
				select: { id: true, runId: true, type: true, status: true },
			});
			if (
				!decisionInspection ||
				decisionInspection.runId !== run.id ||
				decisionInspection.type !== InspectionType.OQC ||
				decisionInspection.status !== InspectionStatus.FAIL
			) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "INVALID_MRB_DECISION",
					message: "mrbDecisionId does not reference a failed OQC inspection for this run",
					status: 400,
				};
			}

			if (data.faiWaiver && !data.waiverReason) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_REASON_REQUIRED",
					message: "waiverReason is required when faiWaiver is true",
					status: 400,
				};
			}

			if (data.faiWaiver && !options?.canWaiveFai) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_NOT_ALLOWED",
					message: "User is not allowed to waive FAI",
					status: 403,
				};
			}

			if (data.faiWaiver && data.reworkType !== "REUSE_PREP") {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "FAI_WAIVER_NOT_ALLOWED",
					message: "FAI waiver is only allowed for REUSE_PREP rework",
					status: 400,
				};
			}

			const firstStepResult = await resolveFirstStepNo(db, run.routeVersionId ?? null);
			if (!firstStepResult.success) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return firstStepResult;
			}

			const result = await db.$transaction(async (tx) => {
				const reworkRunNo = await createReworkRun(tx, run, {
					reworkType: data.reworkType,
					faiWaiver: data.faiWaiver,
					faiWaiverReason: data.waiverReason,
					mrbAuthorizedBy: options?.decidedBy,
					firstStepNo: firstStepResult.data.firstStepNo,
				});

				const updatedParent = await tx.run.update({
					where: { id: run.id },
					data: {
						status: RunStatus.CLOSED_REWORK,
						endedAt: new Date(),
						mrbDecisionId: data.mrbDecisionId,
						mrbAuthorizedBy: options?.decidedBy,
						mrbAuthorizedAt: new Date(),
					},
				});

				const reworkRun = await tx.run.findUnique({
					where: { runNo: reworkRunNo },
				});

				return {
					reworkRunNo,
					status: reworkRun?.status ?? RunStatus.PREP,
					authorizationType: reworkRun?.authorizationType ?? null,
					mrbFaiWaiver: reworkRun?.mrbFaiWaiver ?? null,
					parentRunNo: updatedParent.runNo,
					parentRunStatus: updatedParent.status,
				};
			});

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
 * Create a rework run from a parent run.
 * Returns the new run's runNo.
 */
async function createReworkRun(
	tx: Prisma.TransactionClient,
	parentRun: Prisma.RunGetPayload<{
		include: { units: { select: { id: true; sn: true; status: true; currentStepNo: true } } };
	}>,
	options: {
		reworkType: "REUSE_PREP" | "FULL_PREP";
		faiWaiver?: boolean;
		faiWaiverReason?: string;
		mrbAuthorizedBy?: string;
		firstStepNo: number;
	},
): Promise<string> {
	// Generate rework run number: {parentRunNo}-RW{seq}
	const existingReworks = await tx.run.count({
		where: { parentRunId: parentRun.id },
	});
	const reworkSeq = existingReworks + 1;
	const reworkRunNo = `${parentRun.runNo}-RW${reworkSeq}`;

	// Determine initial status based on rework type
	const initialStatus =
		options.reworkType === "REUSE_PREP"
			? RunStatus.AUTHORIZED // Skip PREP and FAI
			: RunStatus.PREP; // Full lifecycle

	// Create the rework run
	const reworkRun = await tx.run.create({
		data: {
			runNo: reworkRunNo,
			woId: parentRun.woId,
			lineId: parentRun.lineId,
			routeVersionId: parentRun.routeVersionId,
			status: initialStatus,
			shiftCode: parentRun.shiftCode,
			parentRunId: parentRun.id,
			reworkType: options.reworkType,
			authorizationType: "MRB_OVERRIDE",
			mrbAuthorizedBy: options.mrbAuthorizedBy,
			mrbAuthorizedAt: new Date(),
			mrbFaiWaiver: options.faiWaiver ?? false,
			mrbWaiverReason: options.faiWaiverReason,
		},
	});

	// Reassign units from parent run to rework run
	await tx.unit.updateMany({
		where: { runId: parentRun.id },
		data: {
			runId: reworkRun.id,
			status: UnitStatus.QUEUED,
			currentStepNo: options.firstStepNo,
		},
	});

	return reworkRunNo;
}

/**
 * Get rework runs for a parent run.
 */
export async function getReworkRuns(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<RunWithRelations[]>> {
	const parentRun = await db.run.findUnique({ where: { runNo } });
	if (!parentRun) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const reworkRuns = await db.run.findMany({
		where: { parentRunId: parentRun.id },
		include: {
			workOrder: { select: { woNo: true, productCode: true } },
			units: { select: { id: true, sn: true, status: true, currentStepNo: true } },
		},
		orderBy: { createdAt: "asc" },
	});

	return { success: true as const, data: reworkRuns };
}
