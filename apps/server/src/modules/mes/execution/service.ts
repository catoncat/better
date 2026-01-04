import type { PrismaClient } from "@better-app/db";
import { RunStatus, TrackResult, TrackSource, UnitStatus } from "@better-app/db";
import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Static } from "elysia";
import { createDefectFromTrackOut } from "../defect/service";
import { checkAndTriggerOqc } from "../oqc/trigger-service";
import type { trackInSchema, trackOutSchema } from "./schema";

type TrackInInput = Static<typeof trackInSchema>;
type TrackOutInput = Static<typeof trackOutSchema>;

const tracer = trace.getTracer("mes");

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
			if (run.status !== RunStatus.AUTHORIZED && run.status !== RunStatus.IN_PROGRESS) {
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
					resolvedUnit = await tx.unit.create({
						data: {
							sn: data.sn,
							woId: run.woId,
							runId: run.id,
							status: UnitStatus.QUEUED,
							currentStepNo: currentStep.stepNo,
						},
					});
				} else if (!resolvedUnit.runId) {
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
			if (run.status !== RunStatus.AUTHORIZED && run.status !== RunStatus.IN_PROGRESS) {
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

			const result = data.result === "PASS" ? TrackResult.PASS : TrackResult.FAIL;

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
			const requiredSpecIds = currentStep.dataSpecIds ?? [];
			const specs = requiredSpecIds.length
				? await db.dataCollectionSpec.findMany({
						where: { id: { in: requiredSpecIds } },
					})
				: specNames.length
					? await db.dataCollectionSpec.findMany({
							where: {
								operationId: currentStep.operationId,
								name: { in: specNames },
							},
						})
					: [];

			const specsByName = new Map(specs.map((spec) => [spec.name, spec]));
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

			if (requiredSpecIds.length > 0) {
				if (specs.length !== requiredSpecIds.length) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					span.setAttribute("mes.error_code", "DATA_SPEC_NOT_FOUND");
					return {
						success: false,
						code: "DATA_SPEC_NOT_FOUND",
						message: "One or more required data specs are missing",
					};
				}
				const requiredNames = specs.map((spec) => spec.name);
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

				if (result === TrackResult.PASS) {
					if (!nextStep) {
						return await tx.unit.update({
							where: { id: unit.id },
							data: { status: UnitStatus.DONE },
						});
					}
					return await tx.unit.update({
						where: { id: unit.id },
						data: {
							status: UnitStatus.QUEUED,
							currentStepNo: nextStep.stepNo,
						},
					});
				}

				return await tx.unit.update({
					where: { id: unit.id },
					data: { status: UnitStatus.OUT_FAILED },
				});
			});

			// Auto-create defect record when TrackOut result is FAIL
			if (result === TrackResult.FAIL) {
				const defectCode = data.defectCode ?? "STATION_FAIL";
				createDefectFromTrackOut(db, track.id, defectCode, data.defectLocation).catch((err) => {
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

			return { success: true, data: { status: updatedUnit.status } };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
};
