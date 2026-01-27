import { DispositionType, type Prisma, type PrismaClient, UnitStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	assignDispositionSchema,
	completeReworkSchema,
	createDefectSchema,
	releaseHoldSchema,
	repairRecordSchema,
} from "./schema";

type CreateDefectInput = Static<typeof createDefectSchema>;
type AssignDispositionInput = Static<typeof assignDispositionSchema>;
type ReleaseHoldInput = Static<typeof releaseHoldSchema>;
type CompleteReworkInput = Static<typeof completeReworkSchema>;
type RepairRecordInput = Static<typeof repairRecordSchema>;

type DefectWithRelations = Prisma.DefectGetPayload<{
	include: {
		unit: true;
		track: { include: { station: true } };
		disposition: { include: { reworkTask: true } };
	};
}>;

type SnapshotStep = {
	stepNo: number;
	operationId: string;
};

type FailureStepMeta = {
	stepNo: number;
	operationCode: string;
	operationName: string | null;
	stationCode: string | null;
	stationName: string | null;
};

type DefectWithFailureStep = DefectWithRelations & {
	failureStep: FailureStepMeta | null;
};

type ReworkTaskWithRelations = Prisma.ReworkTaskGetPayload<{
	include: { unit: true; disposition: { include: { defect: true } } };
}>;

type RepairRecordPayload = {
	reason?: string;
	action: string;
	result: string;
	remark?: string;
	recordedBy?: string | null;
	recordedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const buildRepairRecordMeta = (
	meta: Prisma.JsonValue | null | undefined,
	data: RepairRecordInput,
	recordedBy?: string,
): Prisma.JsonObject => {
	const nextMeta: Prisma.JsonObject = isRecord(meta) ? { ...meta } : {};
	const payload: RepairRecordPayload = {
		action: data.action,
		result: data.result,
		recordedAt: new Date().toISOString(),
		recordedBy: recordedBy ?? null,
	};
	if (data.reason) payload.reason = data.reason;
	if (data.remark) payload.remark = data.remark;
	nextMeta.repairRecordV1 = payload;
	return nextMeta;
};

const DEFECT_STATUS = {
	RECORDED: "RECORDED",
	DISPOSITIONED: "DISPOSITIONED",
	CLOSED: "CLOSED",
} as const;

const REWORK_STATUS = {
	OPEN: "OPEN",
	DONE: "DONE",
	CANCELLED: "CANCELLED",
} as const;

const getSnapshotSteps = (snapshot: Prisma.JsonValue | null | undefined): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];
	return record.steps.filter((step): step is SnapshotStep => !!step && typeof step === "object");
};

const attachFailureStepMeta = async (
	db: PrismaClient,
	defects: DefectWithRelations[],
): Promise<DefectWithFailureStep[]> => {
	if (defects.length === 0) return [];

	const runIds = [
		...new Set(
			defects
				.map((defect) => defect.unit?.runId)
				.filter((runId): runId is string => Boolean(runId)),
		),
	];

	const runs = runIds.length
		? await db.run.findMany({
				where: { id: { in: runIds } },
				select: { id: true, routeVersion: true },
			})
		: [];

	const stepsByRunId = new Map<string, Map<number, SnapshotStep>>();
	const operationIds = new Set<string>();

	for (const run of runs) {
		const steps = getSnapshotSteps(run.routeVersion?.snapshotJson);
		const stepMap = new Map<number, SnapshotStep>();
		for (const step of steps) {
			stepMap.set(step.stepNo, step);
			operationIds.add(step.operationId);
		}
		stepsByRunId.set(run.id, stepMap);
	}

	const operations = operationIds.size
		? await db.operation.findMany({
				where: { id: { in: [...operationIds] } },
				select: { id: true, code: true, name: true },
			})
		: [];
	const operationById = new Map(operations.map((operation) => [operation.id, operation]));

	return defects.map((defect) => {
		const stepNo = defect.track?.stepNo ?? defect.unit?.currentStepNo ?? null;
		const runId = defect.unit?.runId ?? null;
		const step = stepNo && runId ? stepsByRunId.get(runId)?.get(stepNo) : undefined;
		const operation = step ? operationById.get(step.operationId) : null;
		const station = defect.track?.station ?? null;
		const failureStep = stepNo
			? {
					stepNo,
					operationCode: operation?.code ?? "-",
					operationName: operation?.name ?? null,
					stationCode: station?.code ?? null,
					stationName: station?.name ?? null,
				}
			: null;

		return { ...defect, failureStep };
	});
};

/**
 * Create a defect record for a unit.
 */
export async function createDefect(
	db: PrismaClient,
	data: CreateDefectInput,
	trackId?: string,
	createdBy?: string,
): Promise<ServiceResult<DefectWithRelations>> {
	const unit = await db.unit.findUnique({ where: { sn: data.unitSn } });
	if (!unit) {
		return {
			success: false as const,
			code: "UNIT_NOT_FOUND",
			message: "Unit not found",
			status: 404,
		};
	}

	const meta: Prisma.JsonObject = {};
	if (data.remark) {
		meta.remark = data.remark;
	}
	if (createdBy) {
		meta.createdBy = createdBy;
	}

	const defect = await db.defect.create({
		data: {
			unitId: unit.id,
			trackId,
			code: data.code,
			location: data.location,
			qty: data.qty ?? 1,
			status: DEFECT_STATUS.RECORDED,
			meta: Object.keys(meta).length > 0 ? meta : undefined,
		},
		include: {
			unit: true,
			track: { include: { station: true } },
			disposition: { include: { reworkTask: true } },
		},
	});

	return { success: true as const, data: defect };
}

/**
 * Assign a disposition to a defect.
 */
export async function assignDisposition(
	db: PrismaClient,
	defectId: string,
	data: AssignDispositionInput,
	decidedBy?: string,
): Promise<ServiceResult<DefectWithRelations>> {
	const defect = await db.defect.findUnique({
		where: { id: defectId },
		include: { unit: true, disposition: true },
	});

	if (!defect) {
		return {
			success: false as const,
			code: "DEFECT_NOT_FOUND",
			message: "Defect not found",
			status: 404,
		};
	}

	if (defect.disposition) {
		return {
			success: false as const,
			code: "ALREADY_DISPOSITIONED",
			message: "Defect already has a disposition",
			status: 400,
		};
	}

	const dispositionType = data.type as DispositionType;
	const reworkStep =
		dispositionType === DispositionType.REWORK
			? {
					fromStepNo: defect.unit.currentStepNo,
					toStepNo: data.toStepNo ?? 1,
				}
			: null;

	if (reworkStep && reworkStep.toStepNo > reworkStep.fromStepNo) {
		return {
			success: false as const,
			code: "REWORK_STEP_INVALID",
			message: "Rework step must be less than or equal to the failure step",
			status: 400,
		};
	}

	const result = await db.$transaction(async (tx) => {
		// Create disposition
		const disposition = await tx.disposition.create({
			data: {
				defectId,
				type: dispositionType,
				decidedBy,
				decidedAt: new Date(),
				reason: data.reason,
			},
		});

		// Update defect status
		await tx.defect.update({
			where: { id: defectId },
			data: { status: DEFECT_STATUS.DISPOSITIONED },
		});

		// Handle each disposition type
		if (dispositionType === DispositionType.REWORK) {
			// Create rework task
			const fromStepNo = reworkStep?.fromStepNo ?? defect.unit.currentStepNo;
			const toStepNo = reworkStep?.toStepNo ?? data.toStepNo ?? 1;

			await tx.reworkTask.create({
				data: {
					dispositionId: disposition.id,
					unitId: defect.unit.id,
					fromStepNo,
					toStepNo,
					status: REWORK_STATUS.OPEN,
				},
			});

			// Update unit status
			await tx.unit.update({
				where: { id: defect.unit.id },
				data: {
					status: UnitStatus.QUEUED,
					currentStepNo: toStepNo,
				},
			});
		} else if (dispositionType === DispositionType.SCRAP) {
			// Update unit status to scrapped
			await tx.unit.update({
				where: { id: defect.unit.id },
				data: { status: UnitStatus.SCRAPPED },
			});

			// Close defect immediately for scrap
			await tx.defect.update({
				where: { id: defectId },
				data: { status: DEFECT_STATUS.CLOSED },
			});
		} else if (dispositionType === DispositionType.HOLD) {
			// Update unit status to hold
			await tx.unit.update({
				where: { id: defect.unit.id },
				data: { status: UnitStatus.ON_HOLD },
			});
		}

		return tx.defect.findUnique({
			where: { id: defectId },
			include: {
				unit: true,
				track: { include: { station: true } },
				disposition: { include: { reworkTask: true } },
			},
		});
	});

	if (!result) {
		return {
			success: false as const,
			code: "DISPOSITION_FAILED",
			message: "Failed to create disposition",
			status: 500,
		};
	}

	return { success: true as const, data: result };
}

/**
 * Release a unit from ON_HOLD status.
 */
export async function releaseHold(
	db: PrismaClient,
	defectId: string,
	data: ReleaseHoldInput,
	releasedBy?: string,
): Promise<ServiceResult<DefectWithRelations>> {
	const defect = await db.defect.findUnique({
		where: { id: defectId },
		include: { unit: true, disposition: true },
	});

	if (!defect) {
		return {
			success: false as const,
			code: "DEFECT_NOT_FOUND",
			message: "Defect not found",
			status: 404,
		};
	}

	if (!defect.disposition || defect.disposition.type !== DispositionType.HOLD) {
		return {
			success: false as const,
			code: "NOT_HOLD_DISPOSITION",
			message: "Defect is not held",
			status: 400,
		};
	}

	if (defect.unit.status !== UnitStatus.ON_HOLD) {
		return {
			success: false as const,
			code: "UNIT_NOT_HELD",
			message: "Unit is not in ON_HOLD status",
			status: 400,
		};
	}

	const result = await db.$transaction(async (tx) => {
		// Release unit back to queued
		await tx.unit.update({
			where: { id: defect.unit.id },
			data: { status: UnitStatus.QUEUED },
		});

		// Close defect
		await tx.defect.update({
			where: { id: defectId },
			data: {
				status: DEFECT_STATUS.CLOSED,
				meta: {
					...(defect.meta as object | undefined),
					releasedBy,
					releaseReason: data.reason,
					releasedAt: new Date().toISOString(),
				},
			},
		});

		return tx.defect.findUnique({
			where: { id: defectId },
			include: {
				unit: true,
				track: { include: { station: true } },
				disposition: { include: { reworkTask: true } },
			},
		});
	});

	if (!result) {
		return {
			success: false as const,
			code: "RELEASE_FAILED",
			message: "Failed to release hold",
			status: 500,
		};
	}

	return { success: true as const, data: result };
}

/**
 * Complete a rework task.
 */
export async function completeRework(
	db: PrismaClient,
	reworkTaskId: string,
	data: CompleteReworkInput,
	doneBy?: string,
): Promise<ServiceResult<ReworkTaskWithRelations>> {
	const reworkTask = await db.reworkTask.findUnique({
		where: { id: reworkTaskId },
		include: { unit: true, disposition: { include: { defect: true } } },
	});

	if (!reworkTask) {
		return {
			success: false as const,
			code: "REWORK_TASK_NOT_FOUND",
			message: "Rework task not found",
			status: 404,
		};
	}

	if (reworkTask.status !== REWORK_STATUS.OPEN) {
		return {
			success: false as const,
			code: "REWORK_NOT_OPEN",
			message: `Rework task status is ${reworkTask.status}, cannot complete`,
			status: 400,
		};
	}

	const result = await db.$transaction(async (tx) => {
		// Complete rework task
		await tx.reworkTask.update({
			where: { id: reworkTaskId },
			data: {
				status: REWORK_STATUS.DONE,
				doneBy,
				doneAt: new Date(),
				remark: data.remark,
			},
		});

		// Update unit status back to queued
		await tx.unit.update({
			where: { id: reworkTask.unitId },
			data: { status: UnitStatus.QUEUED },
		});

		// Close defect
		await tx.defect.update({
			where: { id: reworkTask.disposition.defect.id },
			data: { status: DEFECT_STATUS.CLOSED },
		});

		return tx.reworkTask.findUnique({
			where: { id: reworkTaskId },
			include: { unit: true, disposition: { include: { defect: true } } },
		});
	});

	if (!result) {
		return {
			success: false as const,
			code: "COMPLETE_FAILED",
			message: "Failed to complete rework",
			status: 500,
		};
	}

	return { success: true as const, data: result };
}

/**
 * Record repair details for a rework task (QR-Pro-012).
 */
export async function saveRepairRecord(
	db: PrismaClient,
	reworkTaskId: string,
	data: RepairRecordInput,
	recordedBy?: string,
): Promise<ServiceResult<ReworkTaskWithRelations>> {
	const reworkTask = await db.reworkTask.findUnique({
		where: { id: reworkTaskId },
		include: { unit: true, disposition: { include: { defect: true } } },
	});

	if (!reworkTask) {
		return {
			success: false as const,
			code: "REWORK_TASK_NOT_FOUND",
			message: "Rework task not found",
			status: 404,
		};
	}

	if (reworkTask.status !== REWORK_STATUS.OPEN) {
		return {
			success: false as const,
			code: "REWORK_TASK_NOT_OPEN",
			message: `Rework task status is ${reworkTask.status}, cannot record repair`,
			status: 400,
		};
	}

	const updated = await db.reworkTask.update({
		where: { id: reworkTaskId },
		data: {
			meta: buildRepairRecordMeta(reworkTask.meta, data, recordedBy),
		},
		include: { unit: true, disposition: { include: { defect: true } } },
	});

	return { success: true as const, data: updated };
}

/**
 * Get defect by ID.
 */
export async function getDefect(
	db: PrismaClient,
	defectId: string,
): Promise<ServiceResult<DefectWithFailureStep>> {
	const defect = await db.defect.findUnique({
		where: { id: defectId },
		include: {
			unit: true,
			track: { include: { station: true } },
			disposition: { include: { reworkTask: true } },
		},
	});

	if (!defect) {
		return {
			success: false as const,
			code: "DEFECT_NOT_FOUND",
			message: "Defect not found",
			status: 404,
		};
	}

	const [enriched] = await attachFailureStepMeta(db, [defect]);
	return {
		success: true as const,
		data: enriched ?? { ...defect, failureStep: null },
	};
}

/**
 * List defects with filters.
 */
export async function listDefects(
	db: PrismaClient,
	query: {
		unitSn?: string;
		runNo?: string;
		status?: string;
		code?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<{
	items: DefectWithFailureStep[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);

	const where: Prisma.DefectWhereInput = {};

	if (query.unitSn) {
		const unit = await db.unit.findUnique({ where: { sn: query.unitSn } });
		if (unit) {
			where.unitId = unit.id;
		} else {
			return { items: [], total: 0, page, pageSize };
		}
	}

	if (query.runNo) {
		const run = await db.run.findUnique({ where: { runNo: query.runNo } });
		if (run) {
			where.unit = { runId: run.id };
		} else {
			return { items: [], total: 0, page, pageSize };
		}
	}

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean);
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	if (query.code) {
		where.code = { contains: query.code };
	}

	const [items, total] = await Promise.all([
		db.defect.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: {
				unit: true,
				track: { include: { station: true } },
				disposition: { include: { reworkTask: true } },
			},
		}),
		db.defect.count({ where }),
	]);

	const enrichedItems = await attachFailureStepMeta(db, items);
	return { items: enrichedItems, total, page, pageSize };
}

/**
 * List rework tasks with filters.
 */
export async function listReworkTasks(
	db: PrismaClient,
	query: {
		unitSn?: string;
		runNo?: string;
		status?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<{
	items: ReworkTaskWithRelations[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);

	const where: Prisma.ReworkTaskWhereInput = {};

	if (query.unitSn) {
		const unit = await db.unit.findUnique({ where: { sn: query.unitSn } });
		if (unit) {
			where.unitId = unit.id;
		} else {
			return { items: [], total: 0, page, pageSize };
		}
	}

	if (query.runNo) {
		const run = await db.run.findUnique({ where: { runNo: query.runNo } });
		if (run) {
			where.unit = { runId: run.id };
		} else {
			return { items: [], total: 0, page, pageSize };
		}
	}

	if (query.status) {
		const statuses = query.status.split(",").filter(Boolean);
		if (statuses.length > 0) {
			where.status = { in: statuses };
		}
	}

	const [items, total] = await Promise.all([
		db.reworkTask.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
			include: { unit: true, disposition: { include: { defect: true } } },
		}),
		db.reworkTask.count({ where }),
	]);

	return { items, total, page, pageSize };
}

/**
 * Create defect from TrackOut FAIL.
 * Called internally when a unit fails at a station.
 */
export async function createDefectFromTrackOut(
	db: PrismaClient,
	trackId: string,
	defectCode: string,
	location?: string,
	remark?: string,
): Promise<ServiceResult<DefectWithRelations>> {
	const track = await db.track.findUnique({
		where: { id: trackId },
		include: { unit: true },
	});

	if (!track) {
		return {
			success: false as const,
			code: "TRACK_NOT_FOUND",
			message: "Track record not found",
			status: 404,
		};
	}

	return createDefect(
		db,
		{
			unitSn: track.unit.sn,
			code: defectCode,
			location,
			remark,
		},
		trackId,
	);
}
