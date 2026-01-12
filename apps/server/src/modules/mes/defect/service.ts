import { DispositionType, type Prisma, type PrismaClient, UnitStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type {
	assignDispositionSchema,
	completeReworkSchema,
	createDefectSchema,
	releaseHoldSchema,
} from "./schema";

type CreateDefectInput = Static<typeof createDefectSchema>;
type AssignDispositionInput = Static<typeof assignDispositionSchema>;
type ReleaseHoldInput = Static<typeof releaseHoldSchema>;
type CompleteReworkInput = Static<typeof completeReworkSchema>;

type DefectWithRelations = Prisma.DefectGetPayload<{
	include: { unit: true; track: true; disposition: { include: { reworkTask: true } } };
}>;

type ReworkTaskWithRelations = Prisma.ReworkTaskGetPayload<{
	include: { unit: true; disposition: { include: { defect: true } } };
}>;

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
			track: true,
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
			const fromStepNo = defect.unit.currentStepNo;
			const toStepNo = data.toStepNo ?? 1;

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
				track: true,
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
				track: true,
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
 * Get defect by ID.
 */
export async function getDefect(
	db: PrismaClient,
	defectId: string,
): Promise<ServiceResult<DefectWithRelations>> {
	const defect = await db.defect.findUnique({
		where: { id: defectId },
		include: {
			unit: true,
			track: true,
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

	return { success: true as const, data: defect };
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
	items: DefectWithRelations[];
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
				track: true,
				disposition: { include: { reworkTask: true } },
			},
		}),
		db.defect.count({ where }),
	]);

	return { items, total, page, pageSize };
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
		},
		trackId,
	);
}
