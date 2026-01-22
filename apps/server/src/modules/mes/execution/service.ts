import type { PrismaClient } from "@better-app/db";
import {
	InspectionResultStatus,
	InspectionStatus,
	InspectionType,
	RunStatus,
	TrackResult,
	TrackSource,
	UnitStatus,
} from "@better-app/db";
import type { Static } from "elysia";
import { createDefectFromTrackOut } from "../defect/service";
import { checkAndTriggerOqc } from "../oqc/trigger-service";
import { canAuthorize as canAuthorizeReadiness } from "../readiness/service";
import {
	completeInstanceByEntity as completeTimeRuleInstanceByEntity,
	createInstance as createTimeRuleInstance,
	routeHasWashStep,
} from "../time-rule/service";
import type { trackInSchema, trackOutSchema } from "./schema";

type TrackInInput = Static<typeof trackInSchema>;
type TrackOutInput = Static<typeof trackOutSchema>;

type Span = {
	setAttribute: (key: string, value: string | number | boolean) => void;
	setStatus: (status: { code: number }) => void;
	recordException: (error: Error) => void;
	end: () => void;
};

const SpanStatusCode = {
	ERROR: 2,
} as const;

const tracer = {
	startActiveSpan: async <T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> => {
		const noopSpan: Span = {
			setAttribute: () => {},
			setStatus: () => {},
			recordException: () => {},
			end: () => {},
		};

		try {
			return await fn(noopSpan);
		} finally {
			noopSpan.end();
			void name;
		}
	},
} as const;

const setSpanAttributes = (span: Span, attributes: Record<string, unknown>) => {
	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			span.setAttribute(key, value);
		}
	}
};

const isValidStationForStep = (
	step: { stationGroupId: string | null; stationType: string; allowedStationIds?: string[] },
	station: { id: string; groupId: string | null; stationType: string },
) => {
	if (step.stationType !== station.stationType) {
		return false;
	}
	if (step.allowedStationIds && step.allowedStationIds.length > 0) {
		if (!step.allowedStationIds.includes(station.id)) return false;
	}
	if (step.stationGroupId && step.stationGroupId !== station.groupId) {
		return false;
	}
	return true;
};

const getSnapshotSteps = (snapshot: unknown) => {
	if (!snapshot || typeof snapshot !== "object") return null;
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return null;
	return record.steps as Array<{
		stepNo: number;
		operationId: string;
		stationType: string;
		stationGroupId: string | null;
		allowedStationIds?: string[];
		requiresFAI?: boolean;
		requiresAuthorization?: boolean;
		dataSpecIds?: string[];
	}>;
};

type FaiTrialGateResult =
	| {
			allowed: true;
			faiId: string;
			sampleQty: number;
			startedAt: Date;
			trackedUnitIds: Set<string>;
	  }
	| { allowed: false; code: string; message: string };

const resolveFaiTrialGate = async (
	db: PrismaClient,
	run: { id: string; runNo: string },
): Promise<FaiTrialGateResult> => {
	const readiness = await canAuthorizeReadiness(db, run.runNo);
	if (!readiness.success) {
		return {
			allowed: false,
			code: readiness.code ?? "READINESS_CHECK_FAILED",
			message: readiness.message ?? "Readiness check failed",
		};
	}
	if (!readiness.data.canAuthorize) {
		return {
			allowed: false,
			code: "READINESS_CHECK_FAILED",
			message: "Readiness check failed. Fix or waive all failed items before FAI trial.",
		};
	}

	const activeFai = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.FAI,
			status: InspectionStatus.INSPECTING,
		},
		orderBy: { createdAt: "desc" },
		select: { id: true, sampleQty: true, startedAt: true },
	});

	if (!activeFai || !activeFai.startedAt) {
		const passedFai = await db.inspection.findFirst({
			where: {
				runId: run.id,
				type: InspectionType.FAI,
				status: InspectionStatus.PASS,
			},
			select: { id: true },
		});
		if (passedFai) {
			return {
				allowed: false,
				code: "RUN_NOT_AUTHORIZED",
				message: "Run is not authorized or in progress",
			};
		}
		return {
			allowed: false,
			code: "FAI_TRIAL_NOT_READY",
			message: "FAI trial requires an active FAI in INSPECTING status (start FAI first).",
		};
	}

	const distinctTrackedUnits = await db.track.findMany({
		where: {
			unit: { runId: run.id },
			createdAt: { gte: activeFai.startedAt },
		},
		distinct: ["unitId"],
		select: { unitId: true },
	});

	return {
		allowed: true,
		faiId: activeFai.id,
		sampleQty:
			typeof activeFai.sampleQty === "number" && activeFai.sampleQty > 0 ? activeFai.sampleQty : 1,
		startedAt: activeFai.startedAt,
		trackedUnitIds: new Set(distinctTrackedUnits.map((row) => row.unitId)),
	};
};

export const trackIn = async (db: PrismaClient, stationCode: string, data: TrackInInput) => {
	return await tracer.startActiveSpan("mes.execution.track_in", async (span) => {
		setSpanAttributes(span, {
			"mes.station.code": stationCode,
			"mes.unit.sn": data.sn,
			"mes.work_order.wo_no": data.woNo,
			"mes.run.run_no": data.runNo,
		});

		try {
			const station = await db.station.findUnique({
				where: { code: stationCode },
				include: { group: true },
			});
			if (!station) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_NOT_FOUND");
				return { success: false, code: "STATION_NOT_FOUND", message: "Station not found" };
			}

			const tpmEquipment = await db.tpmEquipment.findUnique({
				where: { equipmentCode: station.code },
			});
			if (tpmEquipment) {
				const status = tpmEquipment.status.toLowerCase();
				if (status !== "normal") {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "TPM_EQUIPMENT_UNAVAILABLE");
					return {
						success: false,
						code: "TPM_EQUIPMENT_UNAVAILABLE",
						message: `Equipment status is ${tpmEquipment.status}`,
					};
				}
			}

			const maintenanceTask = await db.tpmMaintenanceTask.findFirst({
				where: {
					equipmentCode: station.code,
					status: { in: ["in_progress", "IN_PROGRESS"] },
				},
			});
			if (maintenanceTask) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "TPM_MAINTENANCE_IN_PROGRESS");
				return {
					success: false,
					code: "TPM_MAINTENANCE_IN_PROGRESS",
					message: "Equipment maintenance in progress",
				};
			}

			const run = await db.run.findUnique({
				where: { runNo: data.runNo },
				include: {
					workOrder: { include: { routing: { include: { steps: true } } } },
					routeVersion: true,
				},
			});
			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
				return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };
			}
			if (!run.routeVersion) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTE_VERSION_NOT_READY");
				return {
					success: false,
					code: "ROUTE_VERSION_NOT_READY",
					message: "Run has no executable route version",
				};
			}
			if (run.lineId && station.lineId && run.lineId !== station.lineId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_LINE_MISMATCH");
				return {
					success: false,
					code: "STATION_LINE_MISMATCH",
					message: "Station does not belong to the run line",
				};
			}

			let faiTrial: FaiTrialGateResult | null = null;
			if (run.status === RunStatus.PREP) {
				const gate = await resolveFaiTrialGate(db, { id: run.id, runNo: run.runNo });
				if (!gate.allowed) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", gate.code);
					return { success: false, code: gate.code, message: gate.message };
				}
				faiTrial = gate;
				span.setAttribute("mes.execution.mode", "FAI_TRIAL");
				span.setAttribute("mes.fai.id", gate.faiId);
			} else if (run.status !== RunStatus.AUTHORIZED && run.status !== RunStatus.IN_PROGRESS) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_AUTHORIZED");
				return {
					success: false,
					code: "RUN_NOT_AUTHORIZED",
					message: "Run is not authorized or in progress",
				};
			}

			if (run.workOrder.woNo !== data.woNo) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_WORK_ORDER_MISMATCH");
				return {
					success: false,
					code: "RUN_WORK_ORDER_MISMATCH",
					message: "Run does not match work order",
				};
			}
			if (!run.workOrder.routing) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "WORK_ORDER_NO_ROUTING");
				return {
					success: false,
					code: "WORK_ORDER_NO_ROUTING",
					message: "Work order has no routing",
				};
			}

			const unit = await db.unit.findUnique({ where: { sn: data.sn } });
			if (unit && unit.woId !== run.woId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_WORK_ORDER_MISMATCH");
				return {
					success: false,
					code: "UNIT_WORK_ORDER_MISMATCH",
					message: "Unit does not belong to work order",
				};
			}
			if (unit?.runId && unit.runId !== run.id) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_RUN_MISMATCH");
				return {
					success: false,
					code: "UNIT_RUN_MISMATCH",
					message: "Unit does not belong to run",
				};
			}
			if (unit?.status === UnitStatus.IN_STATION) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_ALREADY_IN_STATION");
				return {
					success: false,
					code: "UNIT_ALREADY_IN_STATION",
					message: "Unit is already in station",
				};
			}
			if (unit?.status === UnitStatus.DONE) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_ALREADY_DONE");
				return { success: false, code: "UNIT_ALREADY_DONE", message: "Unit already completed" };
			}
			if (unit?.status === UnitStatus.OUT_FAILED) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_OUT_FAILED");
				return {
					success: false,
					code: "UNIT_OUT_FAILED",
					message: "Unit failed last track-out; disposition required before re-entry",
				};
			}
			if (unit?.status === UnitStatus.SCRAPPED) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_SCRAPPED");
				return { success: false, code: "UNIT_SCRAPPED", message: "Unit already scrapped" };
			}

			const snapshotSteps = getSnapshotSteps(run.routeVersion.snapshotJson);
			const steps = snapshotSteps ? [...snapshotSteps].sort((a, b) => a.stepNo - b.stepNo) : [];
			const firstStep = steps[0];
			if (!firstStep) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTING_EMPTY");
				return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps" };
			}
			const currentStepNo = unit?.currentStepNo ?? firstStep.stepNo;
			const currentStep = steps.find((s) => s.stepNo === currentStepNo);
			if (!currentStep) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STEP_MISMATCH");
				return {
					success: false,
					code: "STEP_MISMATCH",
					message: "Current step not found in routing",
				};
			}

			if (faiTrial?.allowed) {
				if (currentStep.stepNo !== firstStep.stepNo) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "FAI_TRIAL_STEP_NOT_ALLOWED");
					return {
						success: false,
						code: "FAI_TRIAL_STEP_NOT_ALLOWED",
						message:
							"FAI trial only allows TrackIn/TrackOut on the first routing step before authorization.",
					};
				}

				const isAlreadyTrialUnit = unit?.id ? faiTrial.trackedUnitIds.has(unit.id) : false;
				if (!isAlreadyTrialUnit && faiTrial.trackedUnitIds.size >= faiTrial.sampleQty) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "FAI_TRIAL_LIMIT_REACHED");
					return {
						success: false,
						code: "FAI_TRIAL_LIMIT_REACHED",
						message: `FAI trial unit limit reached (sampleQty=${faiTrial.sampleQty}).`,
					};
				}
			}

			if (!isValidStationForStep(currentStep, station)) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_MISMATCH");
				return {
					success: false,
					code: "STATION_MISMATCH",
					message: "Station does not match routing step",
				};
			}

			const now = new Date();
			const updatedUnit = await db.$transaction(async (tx) => {
				if (run.status === RunStatus.AUTHORIZED) {
					await tx.run.updateMany({
						where: { id: run.id, status: RunStatus.AUTHORIZED },
						data: {
							status: RunStatus.IN_PROGRESS,
							startedAt: run.startedAt ?? now,
						},
					});
				}

				let resolvedUnit = unit;
				if (!resolvedUnit) {
					return {
						success: false as const,
						code: "UNIT_NOT_FOUND",
						message: `Unit with SN ${data.sn} not found. Please generate units for this run first.`,
					};
				}
				if (!resolvedUnit.runId) {
					resolvedUnit = await tx.unit.update({
						where: { id: resolvedUnit.id },
						data: { runId: run.id },
					});
				}

				const activeTrack = await tx.track.findFirst({
					where: { unitId: resolvedUnit.id, stepNo: currentStep.stepNo, outAt: null },
				});
				if (activeTrack) {
					return {
						success: false as const,
						code: "ACTIVE_TRACK_EXISTS",
						message: "Unit already tracked in",
					};
				}

				await tx.track.create({
					data: {
						unitId: resolvedUnit.id,
						stepNo: currentStep.stepNo,
						stationId: station.id,
						source: TrackSource.MANUAL,
						meta: faiTrial?.allowed
							? { executionMode: "FAI_TRIAL", faiId: faiTrial.faiId }
							: undefined,
						inAt: now,
					},
				});

				await tx.unit.update({
					where: { id: resolvedUnit.id },
					data: { status: UnitStatus.IN_STATION },
				});

				return { success: true as const, unit: resolvedUnit };
			});

			if (!updatedUnit.success) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", updatedUnit.code);
				return { success: false, code: updatedUnit.code, message: updatedUnit.message };
			}

			// T2.4: Track-in to WASH → 完成水洗时间规则实例
			const currentOperation = await db.operation.findUnique({
				where: { id: currentStep.operationId },
				select: { code: true },
			});
			if (currentOperation?.code?.toUpperCase().includes("WASH")) {
				try {
					await completeTimeRuleInstanceByEntity(db, "WASH_4H", "UNIT", updatedUnit.unit.id);
				} catch (error) {
					console.error(`[TrackIn] WASH time rule completion failed for unit ${data.sn}:`, error);
				}
			}

			return { success: true, data: { status: UnitStatus.IN_STATION } };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};

export const trackOut = async (db: PrismaClient, stationCode: string, data: TrackOutInput) => {
	return await tracer.startActiveSpan("mes.execution.track_out", async (span) => {
		setSpanAttributes(span, {
			"mes.station.code": stationCode,
			"mes.unit.sn": data.sn,
			"mes.run.run_no": data.runNo,
			"mes.track.result": data.result,
			"mes.operator.id": data.operatorId,
			"mes.track.data_count": data.data?.length ?? 0,
		});

		try {
			const station = await db.station.findUnique({ where: { code: stationCode } });
			if (!station) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_NOT_FOUND");
				return { success: false, code: "STATION_NOT_FOUND", message: "Station not found" };
			}

			const run = await db.run.findUnique({
				where: { runNo: data.runNo },
				include: {
					workOrder: { include: { routing: { include: { steps: true } } } },
					routeVersion: true,
				},
			});
			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_FOUND");
				return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };
			}
			if (!run.routeVersion) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTE_VERSION_NOT_READY");
				return {
					success: false,
					code: "ROUTE_VERSION_NOT_READY",
					message: "Run has no executable route version",
				};
			}
			if (run.lineId && station.lineId && run.lineId !== station.lineId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_LINE_MISMATCH");
				return {
					success: false,
					code: "STATION_LINE_MISMATCH",
					message: "Station does not belong to the run line",
				};
			}

			let faiTrial: FaiTrialGateResult | null = null;
			if (run.status === RunStatus.PREP) {
				const gate = await resolveFaiTrialGate(db, { id: run.id, runNo: run.runNo });
				if (!gate.allowed) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", gate.code);
					return { success: false, code: gate.code, message: gate.message };
				}
				faiTrial = gate;
				span.setAttribute("mes.execution.mode", "FAI_TRIAL");
				span.setAttribute("mes.fai.id", gate.faiId);
			} else if (run.status !== RunStatus.AUTHORIZED && run.status !== RunStatus.IN_PROGRESS) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "RUN_NOT_AUTHORIZED");
				return {
					success: false,
					code: "RUN_NOT_AUTHORIZED",
					message: "Run is not authorized or in progress",
				};
			}

			const unit = await db.unit.findUnique({
				where: { sn: data.sn },
			});
			if (!unit) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_NOT_FOUND");
				return { success: false, code: "UNIT_NOT_FOUND", message: "Unit not found" };
			}
			if (unit.woId !== run.woId) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_WORK_ORDER_MISMATCH");
				return {
					success: false,
					code: "UNIT_WORK_ORDER_MISMATCH",
					message: "Unit does not belong to work order",
				};
			}
			if (unit.runId && unit.runId !== run.id) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "UNIT_RUN_MISMATCH");
				return {
					success: false,
					code: "UNIT_RUN_MISMATCH",
					message: "Unit does not belong to run",
				};
			}

			const track = await db.track.findFirst({
				where: { unitId: unit.id, stepNo: unit.currentStepNo, stationId: station.id, outAt: null },
				orderBy: { createdAt: "desc" },
			});
			if (!track) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "TRACK_NOT_FOUND");
				return {
					success: false,
					code: "TRACK_NOT_FOUND",
					message: "No active TrackIn record found",
				};
			}

			// Check inspection result records (SPI/AOI) for this track - auto-override if FAIL
			const inspectionFail = await db.inspectionResultRecord.findFirst({
				where: {
					trackId: track.id,
					result: InspectionResultStatus.FAIL,
				},
				orderBy: { eventTime: "desc" },
			});
			const inspectionOverride = inspectionFail !== null;
			if (inspectionOverride) {
				span.setAttribute("mes.inspection.override", true);
				span.setAttribute("mes.inspection.fail_record_id", inspectionFail.id);
			}

			// If inspection FAIL exists, force result to FAIL regardless of manual input
			const result =
				inspectionOverride || data.result === "FAIL" ? TrackResult.FAIL : TrackResult.PASS;

			const snapshotSteps = getSnapshotSteps(run.routeVersion.snapshotJson);
			const steps = snapshotSteps ? [...snapshotSteps].sort((a, b) => a.stepNo - b.stepNo) : [];
			if (steps.length === 0) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "ROUTING_EMPTY");
				return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps" };
			}
			const currentStep = steps.find((s) => s.stepNo === unit.currentStepNo);
			if (!currentStep) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STEP_MISMATCH");
				return {
					success: false,
					code: "STEP_MISMATCH",
					message: "Current step not found in routing",
				};
			}

			if (faiTrial?.allowed) {
				const firstStep = [...steps].sort((a, b) => a.stepNo - b.stepNo)[0];
				if (firstStep && currentStep.stepNo !== firstStep.stepNo) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "FAI_TRIAL_STEP_NOT_ALLOWED");
					return {
						success: false,
						code: "FAI_TRIAL_STEP_NOT_ALLOWED",
						message:
							"FAI trial only allows TrackIn/TrackOut on the first routing step before authorization.",
					};
				}
			}

			if (!isValidStationForStep(currentStep, station)) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "STATION_MISMATCH");
				return {
					success: false,
					code: "STATION_MISMATCH",
					message: "Station does not match routing step",
				};
			}

			const dataItems = data.data ?? [];
			const specNames = dataItems.map((item) => item.specName);
			const boundSpecIds = currentStep.dataSpecIds ?? [];
			const specs = boundSpecIds.length
				? await db.dataCollectionSpec.findMany({
						where: { id: { in: boundSpecIds } },
					})
				: specNames.length
					? await db.dataCollectionSpec.findMany({
							where: {
								operationId: currentStep.operationId,
								name: { in: specNames },
								isActive: true,
							},
						})
					: [];

			if (boundSpecIds.length > 0) {
				const fetchedIds = new Set(specs.map((spec) => spec.id));
				const missingIds = boundSpecIds.filter((id) => !fetchedIds.has(id));
				if (missingIds.length > 0) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_SPEC_NOT_FOUND");
					return {
						success: false,
						code: "DATA_SPEC_NOT_FOUND",
						message: `One or more bound data specs are missing: ${missingIds.join(", ")}`,
					};
				}
			}

			const activeSpecs = boundSpecIds.length > 0 ? specs.filter((spec) => spec.isActive) : specs;
			const specsByName = new Map(activeSpecs.map((spec) => [spec.name, spec]));
			const missingSpecs = specNames.filter((name) => !specsByName.has(name));
			if (missingSpecs.length > 0) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("mes.error_code", "DATA_SPEC_NOT_FOUND");
				return {
					success: false,
					code: "DATA_SPEC_NOT_FOUND",
					message: `Unknown data collection spec: ${missingSpecs.join(", ")}`,
				};
			}

			if (boundSpecIds.length > 0 && result === TrackResult.PASS) {
				const requiredNames = activeSpecs
					.filter((spec) => spec.isRequired)
					.map((spec) => spec.name);
				const missingRequired = requiredNames.filter((name) => !specNames.includes(name));
				if (missingRequired.length > 0) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "REQUIRED_DATA_MISSING");
					return {
						success: false,
						code: "REQUIRED_DATA_MISSING",
						message: `Missing required data specs: ${missingRequired.join(", ")}`,
					};
				}
			}

			for (const item of dataItems) {
				const spec = specsByName.get(item.specName);
				if (!spec) continue;
				if (spec.dataType === "NUMBER" && item.valueNumber === undefined) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_VALUE_INVALID");
					return { success: false, code: "DATA_VALUE_INVALID", message: "Missing numeric value" };
				}
				if (spec.dataType === "TEXT" && item.valueText === undefined) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_VALUE_INVALID");
					return { success: false, code: "DATA_VALUE_INVALID", message: "Missing text value" };
				}
				if (spec.dataType === "BOOLEAN" && item.valueBoolean === undefined) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_VALUE_INVALID");
					return { success: false, code: "DATA_VALUE_INVALID", message: "Missing boolean value" };
				}
				if (spec.dataType === "JSON" && item.valueJson === undefined) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_VALUE_INVALID");
					return { success: false, code: "DATA_VALUE_INVALID", message: "Missing JSON value" };
				}
			}

			const now = new Date();
			const nextStep = steps.find((s) => s.stepNo > unit.currentStepNo);
			const updatedUnit = await db.$transaction(async (tx) => {
				await tx.track.update({
					where: { id: track.id },
					data: {
						outAt: now,
						result,
						operatorId: data.operatorId,
					},
				});

				if (dataItems.length > 0) {
					await tx.dataValue.createMany({
						data: dataItems.map((item) => {
							const spec = specsByName.get(item.specName);
							if (!spec) {
								throw new Error(`Data spec not found: ${item.specName}`);
							}
							return {
								specId: spec.id,
								trackId: track.id,
								collectedAt: now,
								valueNumber: spec.dataType === "NUMBER" ? item.valueNumber : null,
								valueText: spec.dataType === "TEXT" ? item.valueText : null,
								valueBoolean: spec.dataType === "BOOLEAN" ? item.valueBoolean : null,
								valueJson: spec.dataType === "JSON" ? (item.valueJson ?? null) : null,
								source: TrackSource.MANUAL,
							};
						}),
					});
				}

				let nextUnit: typeof unit;
				if (result === TrackResult.PASS) {
					if (!nextStep) {
						nextUnit = await tx.unit.update({
							where: { id: unit.id },
							data: { status: UnitStatus.DONE },
						});
					} else {
						nextUnit = await tx.unit.update({
							where: { id: unit.id },
							data: {
								status: UnitStatus.QUEUED,
								currentStepNo: nextStep.stepNo,
							},
						});
					}
				} else {
					nextUnit = await tx.unit.update({
						where: { id: unit.id },
						data: { status: UnitStatus.OUT_FAILED },
					});
				}

				if (result === TrackResult.PASS) {
					const openReworkTask = await tx.reworkTask.findFirst({
						where: { unitId: unit.id, status: "OPEN" },
						include: { disposition: { include: { defect: true } } },
					});

					if (openReworkTask && unit.currentStepNo >= openReworkTask.fromStepNo) {
						await tx.reworkTask.update({
							where: { id: openReworkTask.id },
							data: {
								status: "DONE",
								doneBy: data.operatorId,
								doneAt: now,
								remark: "Auto-closed after rework step completed",
							},
						});

						await tx.defect.update({
							where: { id: openReworkTask.disposition.defect.id },
							data: { status: "CLOSED" },
						});
					}
				}

				return nextUnit;
			});

			// Auto-create defect record when TrackOut result is FAIL
			if (result === TrackResult.FAIL) {
				const defectCode = data.defectCode ?? "STATION_FAIL";
				createDefectFromTrackOut(
					db,
					track.id,
					defectCode,
					data.defectLocation,
					data.defectRemark,
				).catch((err) => {
					console.error(`[TrackOut FAIL] Auto defect creation failed for track ${track.id}:`, err);
				});
			}

			if (updatedUnit.status === UnitStatus.DONE) {
				try {
					const oqcResult = await checkAndTriggerOqc(db, run.runNo, {
						createdBy: data.operatorId,
					});
					if (!oqcResult.success) {
						console.error(`[TrackOut] OQC trigger failed for run ${run.runNo}:`, oqcResult);
					}
				} catch (error) {
					console.error(`[TrackOut] OQC trigger error for run ${run.runNo}:`, error);
				}
			}

			// T2.4: Track-out from REFLOW → 创建水洗时间规则实例（如果路由有 WASH 工序）
			const trackOutOperation = await db.operation.findUnique({
				where: { id: currentStep.operationId },
				select: { code: true },
			});
			if (
				result === TrackResult.PASS &&
				trackOutOperation?.code?.toUpperCase().includes("REFLOW") &&
				run.routeVersionId
			) {
				try {
					const hasWash = await routeHasWashStep(db, run.routeVersionId);
					if (hasWash) {
						await createTimeRuleInstance(db, {
							definitionCode: "WASH_4H",
							runId: run.id,
							entityType: "UNIT",
							entityId: unit.id,
							entityDisplay: `单元 ${unit.sn} - 回流焊后水洗`,
						});
					}
				} catch (error) {
					console.error(`[TrackOut] WASH time rule creation failed for unit ${unit.sn}:`, error);
				}
			}

			return {
				success: true,
				data: {
					status: updatedUnit.status,
					...(inspectionOverride && { inspectionOverride: true }),
				},
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};

/**
 * Get data collection specs for the current step of a unit
 * Used by the UI to dynamically generate data collection form fields
 */
export const getUnitDataSpecs = async (db: PrismaClient, stationCode: string, sn: string) => {
	const station = await db.station.findUnique({ where: { code: stationCode } });
	if (!station) {
		return { success: false, code: "STATION_NOT_FOUND", message: "Station not found" };
	}

	const unit = await db.unit.findUnique({
		where: { sn },
		include: {
			run: {
				include: {
					routeVersion: true,
				},
			},
		},
	});

	if (!unit) {
		return { success: false, code: "UNIT_NOT_FOUND", message: "Unit not found" };
	}

	if (!unit.run) {
		return { success: false, code: "UNIT_NO_RUN", message: "Unit has no associated run" };
	}

	if (!unit.run.routeVersion) {
		return {
			success: false,
			code: "ROUTE_VERSION_NOT_READY",
			message: "Run has no executable route version",
		};
	}

	const snapshotSteps = getSnapshotSteps(unit.run.routeVersion.snapshotJson);
	if (!snapshotSteps || snapshotSteps.length === 0) {
		return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps" };
	}

	const currentStep = snapshotSteps.find((s) => s.stepNo === unit.currentStepNo);
	if (!currentStep) {
		return { success: false, code: "STEP_MISMATCH", message: "Current step not found in routing" };
	}

	// Get operation info
	const operation = await db.operation.findUnique({
		where: { id: currentStep.operationId },
	});
	if (!operation) {
		return { success: false, code: "OPERATION_NOT_FOUND", message: "Operation not found" };
	}

	// Get data specs for this step
	const dataSpecIds = currentStep.dataSpecIds ?? [];
	let specs: Array<{
		id: string;
		name: string;
		itemType: string;
		dataType: string;
		method: string;
		triggerType: string;
		isRequired: boolean;
		spec: unknown;
	}> = [];

	if (dataSpecIds.length > 0) {
		specs = await db.dataCollectionSpec.findMany({
			where: {
				id: { in: dataSpecIds },
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				itemType: true,
				dataType: true,
				method: true,
				triggerType: true,
				isRequired: true,
				spec: true,
			},
			orderBy: [{ isRequired: "desc" }, { name: "asc" }],
		});
	}

	// Parse spec JSON for each item
	const parseSpec = (specJson: unknown) => {
		if (!specJson || typeof specJson !== "object") return undefined;
		const s = specJson as Record<string, unknown>;
		return {
			min: typeof s.min === "number" ? s.min : undefined,
			max: typeof s.max === "number" ? s.max : undefined,
			target: typeof s.target === "number" ? s.target : undefined,
			lsl: typeof s.lsl === "number" ? s.lsl : undefined,
			usl: typeof s.usl === "number" ? s.usl : undefined,
			unit: typeof s.unit === "string" ? s.unit : undefined,
		};
	};

	return {
		success: true,
		data: {
			sn: unit.sn,
			stepNo: unit.currentStepNo,
			operationCode: operation.code,
			operationName: operation.name,
			specs: specs.map((spec) => ({
				...spec,
				spec: parseSpec(spec.spec),
			})),
		},
	};
};
