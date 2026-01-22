import {
	InspectionResultStatus,
	InspectionStatus,
	InspectionType,
	Prisma,
	type PrismaClient,
	ReadinessCheckStatus,
	RunStatus,
} from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import { getLatestCheck } from "../readiness/service";
import type { completeFaiSchema, createFaiSchema, recordFaiItemSchema, signFaiSchema } from "./schema";

type CreateFaiInput = Static<typeof createFaiSchema>;
type RecordFaiItemInput = Static<typeof recordFaiItemSchema>;
type CompleteFaiInput = Static<typeof completeFaiSchema>;
type SignFaiInput = Static<typeof signFaiSchema>;

type InspectionRecord = Prisma.InspectionGetPayload<{
	include: { items: true };
}>;

type FaiTrialSummary = {
	units: Array<{
		sn: string;
		trackOuts: Array<{
			stepNo: number;
			stationCode: string | null;
			outAt: Date | null;
			result: string | null;
			dataValues: Array<{
				name: string;
				value: Prisma.JsonValue | string | number | boolean | null;
				judge: string | null;
				collectedAt: Date;
			}>;
		}>;
		inspections: Array<{
			inspectionType: string;
			result: string;
			stationCode: string;
			stepNo: number;
			eventTime: Date;
		}>;
	}>;
};

type FaiDetailRecord = InspectionRecord & { trialSummary: FaiTrialSummary };

const buildInspectionActiveKey = (runId: string, type: InspectionType) => `${runId}:${type}`;

const resolveDataValue = (value: {
	valueNumber?: number | null;
	valueText?: string | null;
	valueBoolean?: boolean | null;
	valueJson?: Prisma.JsonValue | null;
}) => {
	if (value.valueNumber !== null && value.valueNumber !== undefined) return value.valueNumber;
	if (value.valueText !== null && value.valueText !== undefined) return value.valueText;
	if (value.valueBoolean !== null && value.valueBoolean !== undefined) return value.valueBoolean;
	if (value.valueJson !== null && value.valueJson !== undefined) return value.valueJson;
	return null;
};

const buildFaiTrialSummary = async (
	db: PrismaClient,
	fai: { runId: string; startedAt: Date | null; sampleQty: number | null },
	runNo: string | null,
): Promise<FaiTrialSummary> => {
	if (!fai.startedAt || !runNo) {
		return { units: [] };
	}

	const requiredQty = typeof fai.sampleQty === "number" && fai.sampleQty > 0 ? fai.sampleQty : 1;
	const tracks = await db.track.findMany({
		where: {
			unit: { runId: fai.runId },
			outAt: { not: null },
			createdAt: { gte: fai.startedAt },
		},
		include: {
			unit: { select: { id: true, sn: true } },
			station: { select: { code: true } },
		},
		orderBy: { outAt: "asc" },
	});

	const unitIds: string[] = [];
	const unitSnById = new Map<string, string>();
	for (const track of tracks) {
		if (unitIds.length >= requiredQty) break;
		if (!unitSnById.has(track.unitId)) {
			unitIds.push(track.unitId);
			if (track.unit?.sn) {
				unitSnById.set(track.unitId, track.unit.sn);
			}
		}
	}

	if (unitIds.length === 0) {
		return { units: [] };
	}

	const trialTracks = tracks.filter((track) => unitIds.includes(track.unitId));
	const trackIds = trialTracks.map((track) => track.id);
	const dataValues = trackIds.length
		? await db.dataValue.findMany({
				where: { trackId: { in: trackIds } },
				include: { spec: { select: { name: true } } },
			})
		: [];

	const dataValuesByTrack = new Map<
		string,
		Array<{
			name: string;
			value: Prisma.JsonValue | string | number | boolean | null;
			judge: string | null;
			collectedAt: Date;
		}>
	>();
	for (const value of dataValues) {
		if (!value.trackId) continue;
		const list = dataValuesByTrack.get(value.trackId) ?? [];
		list.push({
			name: value.spec.name,
			value: resolveDataValue(value),
			judge: value.judge ?? null,
			collectedAt: value.collectedAt,
		});
		dataValuesByTrack.set(value.trackId, list);
	}

	const unitSns = unitIds.map((unitId) => unitSnById.get(unitId)).filter(Boolean) as string[];
	const inspectionResults = unitSns.length
		? await db.inspectionResultRecord.findMany({
				where: {
					runNo,
					unitSn: { in: unitSns },
				},
				orderBy: { eventTime: "desc" },
			})
		: [];

	const inspectionsByUnit = new Map<string, FaiTrialSummary["units"][number]["inspections"]>();
	for (const record of inspectionResults) {
		const list = inspectionsByUnit.get(record.unitSn) ?? [];
		list.push({
			inspectionType: record.inspectionType,
			result: record.result,
			stationCode: record.stationCode,
			stepNo: record.stepNo,
			eventTime: record.eventTime,
		});
		inspectionsByUnit.set(record.unitSn, list);
	}

	const tracksByUnit = new Map<string, typeof trialTracks>();
	for (const track of trialTracks) {
		const list = tracksByUnit.get(track.unitId) ?? [];
		list.push(track);
		tracksByUnit.set(track.unitId, list);
	}

	return {
		units: unitIds.map((unitId) => {
			const sn = unitSnById.get(unitId) ?? "-";
			const trackOuts = (tracksByUnit.get(unitId) ?? []).map((track) => ({
				stepNo: track.stepNo,
				stationCode: track.station?.code ?? null,
				outAt: track.outAt,
				result: track.result ?? null,
				dataValues: dataValuesByTrack.get(track.id) ?? [],
			}));

			return {
				sn,
				trackOuts,
				inspections: inspectionsByUnit.get(sn) ?? [],
			};
		}),
	};
};

const ensureFaiTrialCompleted = async (
	db: PrismaClient,
	fai: { runId: string; startedAt: Date | null; sampleQty: number | null },
	context: "record" | "complete",
): Promise<ServiceResult<null>> => {
	if (!fai.startedAt) {
		return {
			success: false as const,
			code: "FAI_TRIAL_NOT_STARTED",
			message: "FAI trial requires the inspection to be started first",
			status: 400,
		};
	}

	const requiredQty = typeof fai.sampleQty === "number" && fai.sampleQty > 0 ? fai.sampleQty : 1;
	const trackedUnits = await db.track.findMany({
		where: {
			unit: { runId: fai.runId },
			outAt: { not: null },
			createdAt: { gte: fai.startedAt },
		},
		distinct: ["unitId"],
		select: { unitId: true },
	});

	if (trackedUnits.length < requiredQty) {
		const action = context === "record" ? "record inspection items" : "complete FAI";
		return {
			success: false as const,
			code: "FAI_TRIAL_REQUIRED",
			message: `FAI trial TrackIn/TrackOut is required before ${action} (${trackedUnits.length}/${requiredQty}).`,
			status: 400,
		};
	}

	return { success: true as const, data: null };
};

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
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	// Check if run is in a valid state for FAI creation
	if (run.status !== RunStatus.PREP) {
		return {
			success: false as const,
			code: "INVALID_RUN_STATUS",
			message: `Run status ${run.status} does not allow FAI creation`,
			status: 400,
		};
	}

	// Check if readiness check has passed (required before FAI creation)
	const readinessResult = await getLatestCheck(db, runNo, "FORMAL");
	if (!readinessResult.success) {
		return readinessResult;
	}
	const latestCheck = readinessResult.data;
	if (!latestCheck || latestCheck.status !== ReadinessCheckStatus.PASSED) {
		return {
			success: false as const,
			code: "READINESS_CHECK_NOT_PASSED",
			message: "就绪检查未通过，无法创建 FAI",
			status: 400,
		};
	}

	const activeKey = buildInspectionActiveKey(run.id, InspectionType.FAI);

	// Check if there's already an active FAI
	const existingFai = await db.inspection.findFirst({
		where: {
			runId: run.id,
			type: InspectionType.FAI,
			status: { in: [InspectionStatus.PENDING, InspectionStatus.INSPECTING] },
		},
	});

	if (existingFai) {
		if (!existingFai.activeKey) {
			try {
				await db.inspection.update({
					where: { id: existingFai.id },
					data: { activeKey },
				});
			} catch (error) {
				if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
					throw error;
				}
			}
		}
		return {
			success: false as const,
			code: "FAI_ALREADY_EXISTS",
			message: "An active FAI task already exists for this run",
			status: 400,
		};
	}

	const existingUnitCount = await db.unit.count({ where: { runId: run.id } });
	if (existingUnitCount < data.sampleQty) {
		return {
			success: false as const,
			code: "FAI_SAMPLE_UNITS_INSUFFICIENT",
			message: `Run has insufficient units for FAI sample quantity (${existingUnitCount}/${data.sampleQty}).`,
			status: 400,
		};
	}

	let fai: InspectionRecord;
	try {
		fai = await db.$transaction(async (tx) => {
			// Create the FAI inspection
			const inspection = await tx.inspection.create({
				data: {
					runId: run.id,
					type: InspectionType.FAI,
					status: InspectionStatus.PENDING,
					activeKey,
					sampleQty: data.sampleQty,
					passedQty: 0,
					failedQty: 0,
					remark: data.remark,
				},
				include: { items: true },
			});

			return inspection;
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false as const,
				code: "FAI_ALREADY_EXISTS",
				message: "An active FAI task already exists for this run",
				status: 400,
			};
		}
		throw error;
	}

	return { success: true as const, data: fai };
}

/**
 * Start FAI inspection - changes status from PENDING to INSPECTING.
 */
export async function startFai(
	db: PrismaClient,
	faiId: string,
	inspectorId?: string,
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

	const existingUnitCount = await db.unit.count({ where: { runId: fai.runId } });
	if (existingUnitCount === 0) {
		return {
			success: false as const,
			code: "FAI_UNITS_REQUIRED",
			message: "Run has no units. Generate units before starting FAI.",
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

	const trialCheck = await ensureFaiTrialCompleted(db, fai, "record");
	if (!trialCheck.success) {
		return trialCheck;
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

	const trialCheck = await ensureFaiTrialCompleted(db, fai, "complete");
	if (!trialCheck.success) {
		return trialCheck;
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

		// Check for SPI/AOI inspection failures on FAI sample units
		// If decision is PASS but there are inspection FAILs, block completion
		const inspectionFailCount = await db.inspectionResultRecord.count({
			where: {
				runNo: fai.run?.runNo,
				result: InspectionResultStatus.FAIL,
			},
		});

		if (inspectionFailCount > 0) {
			return {
				success: false as const,
				code: "INSPECTION_FAILURES_EXIST",
				message: `Cannot mark FAI as PASS: ${inspectionFailCount} SPI/AOI inspection failure(s) exist for this run`,
				status: 400,
			};
		}

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
			activeKey: null,
			passedQty,
			failedQty,
			decidedBy,
			decidedAt: new Date(),
			remark: data.remark ?? fai.remark,
		},
		include: { items: true },
	});

	return { success: true as const, data: updated };
}

/**
 * Sign FAI - add signature to a PASS FAI before run authorization.
 */
export async function signFai(
	db: PrismaClient,
	faiId: string,
	data: SignFaiInput,
	signedBy: string,
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

	if (fai.type !== InspectionType.FAI) {
		return {
			success: false as const,
			code: "NOT_FAI_INSPECTION",
			message: "This is not a FAI inspection",
			status: 400,
		};
	}

	if (fai.status !== InspectionStatus.PASS) {
		return {
			success: false as const,
			code: "FAI_NOT_PASSED",
			message: "Only PASS FAI can be signed",
			status: 400,
		};
	}

	if (fai.signedBy && fai.signedAt) {
		return {
			success: false as const,
			code: "FAI_ALREADY_SIGNED",
			message: "FAI has already been signed",
			status: 400,
		};
	}

	const updated = await db.inspection.update({
		where: { id: faiId },
		data: {
			signedBy,
			signedAt: new Date(),
			signatureRemark: data.remark,
		},
		include: { items: true },
	});

	return { success: true as const, data: updated };
}

/**
 * Get FAI details by ID.
 */
export async function getFai(
	db: PrismaClient,
	faiId: string,
): Promise<ServiceResult<FaiDetailRecord>> {
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

	const run = await db.run.findUnique({
		where: { id: fai.runId },
		select: { runNo: true },
	});
	const trialSummary = await buildFaiTrialSummary(db, fai, run?.runNo ?? null);
	return { success: true as const, data: { ...fai, trialSummary } };
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
): Promise<ServiceResult<{ requiresFai: boolean; faiPassed: boolean; faiSigned: boolean; faiId?: string }>> {
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
			data: { requiresFai: false, faiPassed: true, faiSigned: true },
		};
	}

	if (run.authorizationType === "MRB_OVERRIDE" && run.mrbFaiWaiver && run.mrbWaiverReason) {
		return {
			success: true as const,
			data: { requiresFai: true, faiPassed: true, faiSigned: true },
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
			faiSigned: Boolean(latestFai?.signedBy && latestFai?.signedAt),
			faiId: latestFai?.status === InspectionStatus.PASS ? latestFai.id : undefined,
		},
	};
}
