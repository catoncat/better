import type { PrismaClient } from "@better-app/db";
import { RunStatus, TrackResult, TrackSource, UnitStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { trackInSchema, trackOutSchema } from "./schema";

type TrackInInput = Static<typeof trackInSchema>;
type TrackOutInput = Static<typeof trackOutSchema>;

const isValidStationForStep = (step: { stationGroupId: string | null; stationType: string }, station: { groupId: string | null; stationType: string }) => {
	if (step.stationGroupId && step.stationGroupId !== station.groupId) {
		return false;
	}
	return step.stationType === station.stationType;
};

export const trackIn = async (db: PrismaClient, stationCode: string, data: TrackInInput) => {
	const station = await db.station.findUnique({
		where: { code: stationCode },
		include: { group: true },
	});
	if (!station) return { success: false, code: "STATION_NOT_FOUND", message: "Station not found" };

	const run = await db.run.findUnique({
		where: { runNo: data.runNo },
		include: { workOrder: { include: { routing: { include: { steps: true } } } } },
	});
	if (!run) return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };
	if (run.status !== RunStatus.AUTHORIZED) {
		return { success: false, code: "RUN_NOT_AUTHORIZED", message: "Run not authorized" };
	}
	if (run.workOrder.woNo !== data.woNo) {
		return { success: false, code: "RUN_WORK_ORDER_MISMATCH", message: "Run does not match work order" };
	}
	if (!run.workOrder.routing) {
		return { success: false, code: "WORK_ORDER_NO_ROUTING", message: "Work order has no routing" };
	}

	let unit = await db.unit.findUnique({ where: { sn: data.sn } });
	if (unit && unit.woId !== run.woId) {
		return { success: false, code: "UNIT_WORK_ORDER_MISMATCH", message: "Unit does not belong to work order" };
	}
	if (unit?.runId && unit.runId !== run.id) {
		return { success: false, code: "UNIT_RUN_MISMATCH", message: "Unit does not belong to run" };
	}
	if (unit?.status === UnitStatus.IN_STATION) {
		return { success: false, code: "UNIT_ALREADY_IN_STATION", message: "Unit is already in station" };
	}
	if (unit?.status === UnitStatus.DONE) {
		return { success: false, code: "UNIT_ALREADY_DONE", message: "Unit already completed" };
	}

	const steps = [...run.workOrder.routing.steps].sort((a, b) => a.stepNo - b.stepNo);
	if (steps.length === 0) {
		return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps" };
	}
	const currentStepNo = unit?.currentStepNo ?? steps[0].stepNo;
	const currentStep = steps.find((s) => s.stepNo === currentStepNo);
	if (!currentStep) {
		return { success: false, code: "STEP_MISMATCH", message: "Current step not found in routing" };
	}
	if (!isValidStationForStep(currentStep, station)) {
		return { success: false, code: "STATION_MISMATCH", message: "Station does not match routing step" };
	}

	const now = new Date();
	const updatedUnit = await db.$transaction(async (tx) => {
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
			return { success: false as const, code: "ACTIVE_TRACK_EXISTS", message: "Unit already tracked in" };
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
		return { success: false, code: updatedUnit.code, message: updatedUnit.message };
	}

	return { success: true, data: { status: UnitStatus.IN_STATION } };
};

export const trackOut = async (db: PrismaClient, stationCode: string, data: TrackOutInput) => {
	const station = await db.station.findUnique({ where: { code: stationCode } });
	if (!station) return { success: false, code: "STATION_NOT_FOUND", message: "Station not found" };

	const run = await db.run.findUnique({
		where: { runNo: data.runNo },
		include: { workOrder: { include: { routing: { include: { steps: true } } } } },
	});
	if (!run) return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };
	if (run.status !== RunStatus.AUTHORIZED) {
		return { success: false, code: "RUN_NOT_AUTHORIZED", message: "Run not authorized" };
	}

	const unit = await db.unit.findUnique({
		where: { sn: data.sn },
		include: { workOrder: { include: { routing: { include: { steps: true } } } } },
	});
	if (!unit) return { success: false, code: "UNIT_NOT_FOUND", message: "Unit not found" };
	if (unit.woId !== run.woId) {
		return { success: false, code: "UNIT_WORK_ORDER_MISMATCH", message: "Unit does not belong to work order" };
	}
	if (unit.runId && unit.runId !== run.id) {
		return { success: false, code: "UNIT_RUN_MISMATCH", message: "Unit does not belong to run" };
	}

	const track = await db.track.findFirst({
		where: { unitId: unit.id, stepNo: unit.currentStepNo, stationId: station.id, outAt: null },
		orderBy: { createdAt: "desc" },
	});
	if (!track) return { success: false, code: "TRACK_NOT_FOUND", message: "No active TrackIn record found" };

	const result = data.result === "PASS" ? TrackResult.PASS : TrackResult.FAIL;

	const routing = unit.workOrder.routing ?? run.workOrder.routing;
	const steps = routing ? [...routing.steps].sort((a, b) => a.stepNo - b.stepNo) : [];
	if (steps.length === 0) {
		return { success: false, code: "ROUTING_EMPTY", message: "Routing has no steps" };
	}
	const currentStep = steps.find((s) => s.stepNo === unit.currentStepNo);
	if (!currentStep) {
		return { success: false, code: "STEP_MISMATCH", message: "Current step not found in routing" };
	}

	if (!isValidStationForStep(currentStep, station)) {
		return { success: false, code: "STATION_MISMATCH", message: "Station does not match routing step" };
	}

	const dataItems = data.data ?? [];
	const specNames = dataItems.map((item) => item.specName);
	const specs = specNames.length
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
		return {
			success: false,
			code: "DATA_SPEC_NOT_FOUND",
			message: `Unknown data collection spec: ${missingSpecs.join(", ")}`,
		};
	}

	for (const item of dataItems) {
		const spec = specsByName.get(item.specName);
		if (!spec) continue;
		if (spec.dataType === "NUMBER" && item.valueNumber === undefined) {
			return { success: false, code: "DATA_VALUE_INVALID", message: "Missing numeric value" };
		}
		if (spec.dataType === "TEXT" && item.valueText === undefined) {
			return { success: false, code: "DATA_VALUE_INVALID", message: "Missing text value" };
		}
		if (spec.dataType === "BOOLEAN" && item.valueBoolean === undefined) {
			return { success: false, code: "DATA_VALUE_INVALID", message: "Missing boolean value" };
		}
		if (spec.dataType === "JSON" && item.valueJson === undefined) {
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
					const spec = specsByName.get(item.specName)!;
					return {
						specId: spec.id,
						trackId: track.id,
						collectedAt: now,
						valueNumber: spec.dataType === "NUMBER" ? item.valueNumber : null,
						valueText: spec.dataType === "TEXT" ? item.valueText : null,
						valueJson:
							spec.dataType === "JSON"
								? item.valueJson ?? null
								: spec.dataType === "BOOLEAN"
									? item.valueBoolean ?? null
									: null,
						source: TrackSource.MANUAL,
					};
				}),
			});
		}

		if (result === TrackResult.PASS) {
			if (currentStep.isLast || !nextStep) {
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

	return { success: true, data: { status: updatedUnit.status } };
};
