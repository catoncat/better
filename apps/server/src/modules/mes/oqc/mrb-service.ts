import {
	InspectionStatus,
	InspectionType,
	RunStatus,
	UnitStatus,
	type Prisma,
	type PrismaClient,
} from "@better-app/db";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { mrbDecisionSchema } from "./schema";

type MrbDecisionInput = Static<typeof mrbDecisionSchema>;

type RunWithRelations = Prisma.RunGetPayload<{
	include: {
		workOrder: { select: { woNo: true; productCode: true } };
		units: { select: { id: true; sn: true; status: true; currentStepNo: true } };
	};
}>;

const tracer = trace.getTracer("mes.oqc.mrb");

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
	options?: { decidedBy?: string },
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

			// Validate run is in ON_HOLD status
			if (run.status !== RunStatus.ON_HOLD) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				return {
					success: false as const,
					code: "INVALID_RUN_STATUS",
					message: `Run status ${run.status} does not allow MRB decision. Expected ON_HOLD.`,
					status: 400,
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
							...(oqcInspection.data as Record<string, unknown> || {}),
							...mrbData,
						},
					},
				});

				// Apply the decision
				let newRunStatus: RunStatus;
				switch (data.decision) {
					case "RELEASE":
						newRunStatus = RunStatus.COMPLETED;
						break;
					case "REWORK":
						newRunStatus = RunStatus.CLOSED_REWORK;
						// Create rework run
						reworkRunNo = await createReworkRun(tx, run, {
							reworkType: data.reworkType!,
							faiWaiver: data.faiWaiver,
							faiWaiverReason: data.faiWaiverReason,
							mrbAuthorizedBy: options?.decidedBy,
						});
						break;
					case "SCRAP":
						newRunStatus = RunStatus.SCRAPPED;
						break;
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
	},
): Promise<string> {
	// Generate rework run number: {parentRunNo}-RW{seq}
	const existingReworks = await tx.run.count({
		where: { parentRunId: parentRun.id },
	});
	const reworkSeq = existingReworks + 1;
	const reworkRunNo = `${parentRun.runNo}-RW${reworkSeq}`;

	// Determine initial status based on rework type
	const initialStatus = options.reworkType === "REUSE_PREP"
		? RunStatus.AUTHORIZED  // Skip PREP and FAI
		: RunStatus.PREP;       // Full lifecycle

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

	// Copy units from parent run to rework run
	// Reset them to QUEUED status and step 1
	const unitData = parentRun.units
		.filter((u) => u.status === UnitStatus.DONE || u.status === UnitStatus.ON_HOLD)
		.map((unit) => ({
			sn: `${unit.sn}-RW${reworkSeq}`, // Generate new SN for rework unit
			woId: parentRun.woId,
			runId: reworkRun.id,
			status: UnitStatus.QUEUED,
			currentStepNo: 1,
		}));

	if (unitData.length > 0) {
		await tx.unit.createMany({ data: unitData });
	}

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
