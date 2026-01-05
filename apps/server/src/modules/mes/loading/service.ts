import {
	LoadingRecordStatus,
	LoadingVerifyResult,
	type Prisma,
	type PrismaClient,
	RunStatus,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

const LOCK_THRESHOLD = 3;
const BARCODE_SEPARATORS = ["|", ":", "@", "#"];

type VerifyLoadingInput = {
	runNo: string;
	slotCode: string;
	materialLotBarcode: string;
	operatorId: string;
};

type LoadSlotTableResult = {
	runId: string;
	created: number;
};

type LoadingRecordDetail = {
	id: string;
	runNo: string;
	slotId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	materialLotId: string;
	lotNo: string;
	materialCode: string;
	expectedCode: string | null;
	status: LoadingRecordStatus;
	verifyResult: LoadingVerifyResult;
	failReason: string | null;
	loadedAt: string;
	loadedBy: string;
	unloadedAt: string | null;
	unloadedBy: string | null;
};

type RunSlotExpectationDetail = {
	id: string;
	slotId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	expectedMaterialCode: string;
	alternates: string[];
	status: "PENDING" | "LOADED" | "MISMATCH";
	loadedMaterialCode: string | null;
	loadedAt: string | null;
	loadedBy: string | null;
};

type FeederSlotDetail = {
	id: string;
	lineId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	currentMaterialLotId: string | null;
	isLocked: boolean;
	failedAttempts: number;
	lockedAt: string | null;
	lockedReason: string | null;
};

type SlotMaterialMappingDetail = {
	id: string;
	slotId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	productCode: string | null;
	routingId: string | null;
	materialCode: string;
	priority: number;
	isAlternate: boolean;
};

type SlotMappingQuery = {
	lineId?: string;
	slotId?: string;
	productCode?: string;
	routingId?: string;
};

const parseAlternates = (raw: Prisma.JsonValue | null): string[] => {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.filter((item): item is string => typeof item === "string");
	}
	return [];
};

const parseMaterialLotBarcode = (raw: string): { materialCode: string; lotNo: string } | null => {
	const trimmed = raw.trim();
	for (const separator of BARCODE_SEPARATORS) {
		const index = trimmed.indexOf(separator);
		if (index > 0 && index < trimmed.length - 1) {
			const materialCode = trimmed.slice(0, index).trim();
			const lotNo = trimmed.slice(index + 1).trim();
			if (materialCode && lotNo) {
				return { materialCode, lotNo };
			}
		}
	}
	return null;
};

const getOperatorId = (operatorId?: string | null): ServiceResult<string> => {
	if (!operatorId) {
		return {
			success: false,
			code: "OPERATOR_REQUIRED",
			message: "Operator ID is required",
			status: 400,
		};
	}
	return { success: true, data: operatorId };
};

const mapFeederSlot = (slot: {
	id: string;
	lineId: string;
	slotCode: string;
	slotName: string | null;
	position: number;
	currentMaterialLotId: string | null;
	isLocked: boolean;
	failedAttempts: number;
	lockedAt: Date | null;
	lockedReason: string | null;
}): FeederSlotDetail => ({
	id: slot.id,
	lineId: slot.lineId,
	slotCode: slot.slotCode,
	slotName: slot.slotName,
	position: slot.position,
	currentMaterialLotId: slot.currentMaterialLotId,
	isLocked: slot.isLocked,
	failedAttempts: slot.failedAttempts,
	lockedAt: slot.lockedAt ? slot.lockedAt.toISOString() : null,
	lockedReason: slot.lockedReason,
});

const mapSlotMapping = (mapping: {
	id: string;
	slotId: string;
	materialCode: string;
	productCode: string | null;
	routingId: string | null;
	priority: number;
	isAlternate: boolean;
	slot: { slotCode: string; slotName: string | null; position: number };
}): SlotMaterialMappingDetail => ({
	id: mapping.id,
	slotId: mapping.slotId,
	slotCode: mapping.slot.slotCode,
	slotName: mapping.slot.slotName,
	position: mapping.slot.position,
	productCode: mapping.productCode,
	routingId: mapping.routingId,
	materialCode: mapping.materialCode,
	priority: mapping.priority,
	isAlternate: mapping.isAlternate,
});

const mapLoadingRecord = (record: {
	id: string;
	run: { runNo: string };
	slot: { id: string; slotCode: string; slotName: string | null; position: number };
	materialLot: { id: string; lotNo: string; materialCode: string };
	expectedCode: string | null;
	status: LoadingRecordStatus;
	verifyResult: LoadingVerifyResult;
	failReason: string | null;
	loadedAt: Date;
	loadedBy: string;
	unloadedAt: Date | null;
	unloadedBy: string | null;
}): LoadingRecordDetail => ({
	id: record.id,
	runNo: record.run.runNo,
	slotId: record.slot.id,
	slotCode: record.slot.slotCode,
	slotName: record.slot.slotName,
	position: record.slot.position,
	materialLotId: record.materialLot.id,
	lotNo: record.materialLot.lotNo,
	materialCode: record.materialLot.materialCode,
	expectedCode: record.expectedCode,
	status: record.status,
	verifyResult: record.verifyResult,
	failReason: record.failReason,
	loadedAt: record.loadedAt.toISOString(),
	loadedBy: record.loadedBy,
	unloadedAt: record.unloadedAt ? record.unloadedAt.toISOString() : null,
	unloadedBy: record.unloadedBy,
});

const mapExpectation = (expectation: {
	id: string;
	expectedMaterialCode: string;
	alternates: Prisma.JsonValue | null;
	status: string;
	loadedMaterialCode: string | null;
	loadedAt: Date | null;
	loadedBy: string | null;
	slot: { id: string; slotCode: string; slotName: string | null; position: number };
}): RunSlotExpectationDetail => ({
	id: expectation.id,
	slotId: expectation.slot.id,
	slotCode: expectation.slot.slotCode,
	slotName: expectation.slot.slotName,
	position: expectation.slot.position,
	expectedMaterialCode: expectation.expectedMaterialCode,
	alternates: parseAlternates(expectation.alternates),
	status: expectation.status as "PENDING" | "LOADED" | "MISMATCH",
	loadedMaterialCode: expectation.loadedMaterialCode,
	loadedAt: expectation.loadedAt ? expectation.loadedAt.toISOString() : null,
	loadedBy: expectation.loadedBy,
});

export async function loadSlotTable(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<LoadSlotTableResult>> {
	const run = await db.run.findUnique({
		where: { runNo },
		select: {
			id: true,
			lineId: true,
			status: true,
			routeVersionId: true,
			workOrder: { select: { productCode: true } },
		},
	});

	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	if (!run.lineId) {
		return {
			success: false,
			code: "RUN_LINE_NOT_SET",
			message: "Run line is not assigned",
			status: 400,
		};
	}

	if (run.status !== RunStatus.PREP) {
		return {
			success: false,
			code: "RUN_STATUS_INVALID",
			message: "Loading table can only be prepared in PREP status",
			status: 400,
		};
	}

	const existingRecordCount = await db.loadingRecord.count({ where: { runId: run.id } });
	if (existingRecordCount > 0) {
		return {
			success: false,
			code: "LOADING_ALREADY_STARTED",
			message: "Loading records already exist for this run",
			status: 409,
		};
	}

	const routingId = run.routeVersionId
		? await db.executableRouteVersion
				.findUnique({
					where: { id: run.routeVersionId },
					select: { routingId: true },
				})
				.then((version) => version?.routingId ?? null)
		: null;

	const slots = await db.feederSlot.findMany({
		where: { lineId: run.lineId },
		orderBy: [{ position: "asc" }, { slotCode: "asc" }],
	});

	if (slots.length === 0) {
		return {
			success: false,
			code: "FEEDER_SLOTS_NOT_FOUND",
			message: "No feeder slots configured for this line",
			status: 400,
		};
	}

	const mappingWhere: Prisma.SlotMaterialMappingWhereInput = {
		slotId: { in: slots.map((slot) => slot.id) },
	};

	if (run.workOrder.productCode) {
		mappingWhere.OR = [{ productCode: null }, { productCode: run.workOrder.productCode }];
	} else {
		mappingWhere.productCode = null;
	}

	if (routingId) {
		const conditions: Prisma.SlotMaterialMappingWhereInput[] = [{ routingId: null }, { routingId }];
		const existingAnd = (mappingWhere.AND as Prisma.SlotMaterialMappingWhereInput[]) ?? [];
		mappingWhere.AND = [...existingAnd, { OR: conditions }];
	} else {
		const existingAnd = (mappingWhere.AND as Prisma.SlotMaterialMappingWhereInput[]) ?? [];
		mappingWhere.AND = [...existingAnd, { routingId: null }];
	}

	const mappings = await db.slotMaterialMapping.findMany({
		where: mappingWhere,
		orderBy: [{ slotId: "asc" }, { priority: "asc" }, { isAlternate: "asc" }],
	});

	const mappingsBySlot = new Map<string, typeof mappings>();
	for (const mapping of mappings) {
		const current = mappingsBySlot.get(mapping.slotId) ?? [];
		current.push(mapping);
		mappingsBySlot.set(mapping.slotId, current);
	}

	const missingSlots: string[] = [];
	const expectations = slots.flatMap((slot) => {
		const candidates = (mappingsBySlot.get(slot.id) ?? []).filter((mapping) => {
			const productMatch =
				!mapping.productCode || mapping.productCode === run.workOrder.productCode;
			const routingMatch = !mapping.routingId || mapping.routingId === routingId;
			return productMatch && routingMatch;
		});

		if (candidates.length === 0) {
			missingSlots.push(slot.slotCode);
			return [];
		}

		const maxSpecificity = Math.max(
			...candidates.map((mapping) => (mapping.productCode ? 1 : 0) + (mapping.routingId ? 1 : 0)),
		);
		const scoped = candidates.filter(
			(mapping) => (mapping.productCode ? 1 : 0) + (mapping.routingId ? 1 : 0) === maxSpecificity,
		);
		const sorted = [...scoped].sort((a, b) => a.priority - b.priority);
		const primary = sorted.find((item) => !item.isAlternate) ?? sorted[0];

		if (!primary) {
			missingSlots.push(slot.slotCode);
			return [];
		}

		const alternates = sorted
			.filter((item) => item.materialCode !== primary.materialCode)
			.map((item) => item.materialCode);

		return [
			{
				runId: run.id,
				slotId: slot.id,
				expectedMaterialCode: primary.materialCode,
				alternates: alternates.length > 0 ? (alternates as Prisma.InputJsonValue) : null,
				status: "PENDING",
			},
		];
	});

	if (missingSlots.length > 0) {
		return {
			success: false,
			code: "SLOT_MAPPING_MISSING",
			message: `Missing slot mapping for slots: ${missingSlots.join(", ")}`,
			status: 400,
		};
	}

	return db.$transaction(async (tx) => {
		await tx.runSlotExpectation.deleteMany({ where: { runId: run.id } });
		if (expectations.length > 0) {
			await tx.runSlotExpectation.createMany({
				data: expectations as Prisma.RunSlotExpectationCreateManyInput[],
			});
		}
		return {
			success: true,
			data: { runId: run.id, created: expectations.length },
		};
	});
}

export async function verifyLoading(
	db: PrismaClient,
	input: VerifyLoadingInput,
): Promise<ServiceResult<LoadingRecordDetail>> {
	const run = await db.run.findUnique({
		where: { runNo: input.runNo },
		select: { id: true, lineId: true, status: true },
	});

	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	if (!run.lineId) {
		return {
			success: false,
			code: "RUN_LINE_NOT_SET",
			message: "Run line is not assigned",
			status: 400,
		};
	}

	if (run.status !== RunStatus.PREP) {
		return {
			success: false,
			code: "RUN_STATUS_INVALID",
			message: "Loading verification is only allowed in PREP status",
			status: 400,
		};
	}

	const operatorCheck = getOperatorId(input.operatorId);
	if (!operatorCheck.success) {
		return operatorCheck;
	}

	const parsed = parseMaterialLotBarcode(input.materialLotBarcode);
	const fallbackLotNo = input.materialLotBarcode.trim();

	return db.$transaction(async (tx) => {
		const slot = await tx.feederSlot.findFirst({
			where: { lineId: run.lineId ?? undefined, slotCode: input.slotCode },
		});

		if (!slot) {
			return {
				success: false as const,
				code: "SLOT_NOT_FOUND",
				message: "Feeder slot not found for this line",
				status: 404,
			};
		}

		if (slot.isLocked) {
			return {
				success: false as const,
				code: "SLOT_LOCKED",
				message: "Feeder slot is locked. Manual unlock required.",
				status: 409,
			};
		}

		const expectation = await tx.runSlotExpectation.findUnique({
			where: {
				runId_slotId: {
					runId: run.id,
					slotId: slot.id,
				},
			},
		});

		if (!expectation) {
			return {
				success: false as const,
				code: "SLOT_EXPECTATION_MISSING",
				message: "Run slot expectation not loaded",
				status: 400,
			};
		}

		// Idempotent re-scan: if slot is already loaded, check if same material is being scanned
		if (expectation.status === "LOADED") {
			// Parse barcode to get material info for comparison
			let scannedMaterialCode = "";
			if (parsed) {
				scannedMaterialCode = parsed.materialCode;
			} else {
				const candidates = await tx.materialLot.findMany({
					where: { lotNo: fallbackLotNo },
					take: 2,
					select: { materialCode: true },
				});
				if (candidates.length === 1) {
					const [candidate] = candidates;
					if (candidate) scannedMaterialCode = candidate.materialCode;
				}
			}

			// If same material is scanned, return existing record (idempotent)
			if (
				scannedMaterialCode &&
				scannedMaterialCode === (expectation.loadedMaterialCode as string)
			) {
				const existingRecord = await tx.loadingRecord.findFirst({
					where: {
						runId: run.id,
						slotId: slot.id,
						status: LoadingRecordStatus.LOADED,
					},
					orderBy: { loadedAt: "desc" },
					include: {
						run: { select: { runNo: true } },
						slot: { select: { id: true, slotCode: true, slotName: true, position: true } },
						materialLot: { select: { id: true, lotNo: true, materialCode: true } },
					},
				});
				if (existingRecord) {
					return { success: true as const, data: mapLoadingRecord(existingRecord) };
				}
			}

			// Different material or no match - require explicit replace
			return {
				success: false as const,
				code: "SLOT_ALREADY_LOADED",
				message: "Slot already loaded. Use replace endpoint to change material.",
				status: 409,
			};
		}

		let materialLot: { id: string; lotNo: string; materialCode: string } | null = null;
		let materialCode = "";
		let lotNo = "";

		if (parsed) {
			materialCode = parsed.materialCode;
			lotNo = parsed.lotNo;
			materialLot = await tx.materialLot.upsert({
				where: { materialCode_lotNo: { materialCode, lotNo } },
				create: { materialCode, lotNo },
				update: {},
				select: { id: true, lotNo: true, materialCode: true },
			});
		} else {
			const candidates = await tx.materialLot.findMany({
				where: { lotNo: fallbackLotNo },
				take: 2,
				select: { id: true, lotNo: true, materialCode: true },
			});
			if (candidates.length === 1) {
				const [candidate] = candidates;
				if (candidate) {
					materialLot = candidate;
					materialCode = candidate.materialCode;
					lotNo = candidate.lotNo;
				}
			} else if (candidates.length > 1) {
				return {
					success: false as const,
					code: "MATERIAL_LOT_AMBIGUOUS",
					message: "Material lot barcode is ambiguous",
					status: 400,
				};
			} else {
				return {
					success: false as const,
					code: "MATERIAL_LOT_NOT_FOUND",
					message: "Material lot not found for barcode",
					status: 404,
				};
			}
		}

		const alternates = parseAlternates(expectation.alternates);
		const isExpected = materialCode === expectation.expectedMaterialCode;
		const isAlternate = alternates.includes(materialCode);

		let verifyResult: LoadingVerifyResult;
		let recordStatus: LoadingRecordStatus;
		let failReason: string | null = null;
		const now = new Date();

		if (!materialLot) {
			return {
				success: false as const,
				code: "MATERIAL_LOT_NOT_FOUND",
				message: "Material lot not found",
				status: 404,
			};
		}

		if (isExpected || isAlternate) {
			verifyResult = isExpected ? LoadingVerifyResult.PASS : LoadingVerifyResult.WARNING;
			recordStatus = LoadingRecordStatus.LOADED;
			await tx.feederSlot.update({
				where: { id: slot.id },
				data: {
					currentMaterialLotId: materialLot.id,
					failedAttempts: 0,
					isLocked: false,
					lockedAt: null,
					lockedReason: null,
				},
			});
			await tx.runSlotExpectation.update({
				where: { id: expectation.id },
				data: {
					status: "LOADED",
					loadedMaterialCode: materialCode,
					loadedAt: now,
					loadedBy: operatorCheck.data,
				},
			});
		} else {
			verifyResult = LoadingVerifyResult.FAIL;
			recordStatus = LoadingRecordStatus.UNLOADED;
			failReason = `Material mismatch. Expected ${expectation.expectedMaterialCode}, got ${materialCode}`;
			const failedAttempts = slot.failedAttempts + 1;
			const locked = failedAttempts >= LOCK_THRESHOLD;
			await tx.feederSlot.update({
				where: { id: slot.id },
				data: {
					failedAttempts,
					isLocked: locked,
					lockedAt: locked ? now : null,
					lockedReason: locked ? "3 consecutive failures" : null,
				},
			});
			await tx.runSlotExpectation.update({
				where: { id: expectation.id },
				data: {
					status: "MISMATCH",
				},
			});
		}

		const record = await tx.loadingRecord.create({
			data: {
				runId: run.id,
				slotId: slot.id,
				runSlotExpectationId: expectation.id,
				materialLotId: materialLot.id,
				materialCode,
				expectedCode: expectation.expectedMaterialCode,
				status: recordStatus,
				verifyResult,
				failReason,
				loadedAt: now,
				loadedBy: operatorCheck.data,
			},
			include: {
				run: { select: { runNo: true } },
				slot: { select: { id: true, slotCode: true, slotName: true, position: true } },
				materialLot: { select: { id: true, lotNo: true, materialCode: true } },
			},
		});

		return { success: true as const, data: mapLoadingRecord(record) };
	});
}

export async function unlockSlot(
	db: PrismaClient,
	slotId: string,
	operatorId: string,
	reason: string,
): Promise<ServiceResult<FeederSlotDetail>> {
	const operatorCheck = getOperatorId(operatorId);
	if (!operatorCheck.success) {
		return operatorCheck;
	}

	const slot = await db.feederSlot.findUnique({ where: { id: slotId } });
	if (!slot) {
		return {
			success: false,
			code: "SLOT_NOT_FOUND",
			message: "Feeder slot not found",
			status: 404,
		};
	}

	const existingMeta = (slot.meta as Prisma.InputJsonObject) ?? {};
	const unlockHistory = Array.isArray(existingMeta.unlockHistory)
		? (existingMeta.unlockHistory as Prisma.InputJsonArray)
		: [];

	const unlockEvent = {
		by: operatorCheck.data,
		reason,
		at: new Date().toISOString(),
		previousLockedAt: slot.lockedAt?.toISOString() ?? null,
		previousLockedReason: slot.lockedReason,
	};

	const updated = await db.feederSlot.update({
		where: { id: slotId },
		data: {
			isLocked: false,
			failedAttempts: 0,
			lockedAt: null,
			lockedReason: null,
			meta: {
				...existingMeta,
				unlockHistory: [...unlockHistory, unlockEvent],
			},
		},
	});

	return { success: true, data: mapFeederSlot(updated) };
}

type ReplaceLoadingInput = {
	runNo: string;
	slotCode: string;
	newMaterialLotBarcode: string;
	operatorId: string;
	reason: string;
};

export async function replaceLoading(
	db: PrismaClient,
	input: ReplaceLoadingInput,
): Promise<ServiceResult<LoadingRecordDetail>> {
	const run = await db.run.findUnique({
		where: { runNo: input.runNo },
		select: { id: true, lineId: true, status: true },
	});

	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	if (!run.lineId) {
		return {
			success: false,
			code: "RUN_LINE_NOT_SET",
			message: "Run line is not assigned",
			status: 400,
		};
	}

	if (run.status !== RunStatus.PREP) {
		return {
			success: false,
			code: "RUN_STATUS_INVALID",
			message: "Loading replacement is only allowed in PREP status",
			status: 400,
		};
	}

	const operatorCheck = getOperatorId(input.operatorId);
	if (!operatorCheck.success) {
		return operatorCheck;
	}

	if (!input.reason || input.reason.trim().length === 0) {
		return {
			success: false,
			code: "REASON_REQUIRED",
			message: "Replacement reason is required",
			status: 400,
		};
	}

	const parsed = parseMaterialLotBarcode(input.newMaterialLotBarcode);
	const fallbackLotNo = input.newMaterialLotBarcode.trim();

	return db.$transaction(async (tx) => {
		const slot = await tx.feederSlot.findFirst({
			where: { lineId: run.lineId ?? undefined, slotCode: input.slotCode },
		});

		if (!slot) {
			return {
				success: false as const,
				code: "SLOT_NOT_FOUND",
				message: "Feeder slot not found for this line",
				status: 404,
			};
		}

		if (slot.isLocked) {
			return {
				success: false as const,
				code: "SLOT_LOCKED",
				message: "Feeder slot is locked. Manual unlock required before replacement.",
				status: 409,
			};
		}

		const expectation = await tx.runSlotExpectation.findUnique({
			where: {
				runId_slotId: {
					runId: run.id,
					slotId: slot.id,
				},
			},
		});

		if (!expectation) {
			return {
				success: false as const,
				code: "SLOT_EXPECTATION_MISSING",
				message: "Run slot expectation not loaded",
				status: 400,
			};
		}

		if (expectation.status !== "LOADED") {
			return {
				success: false as const,
				code: "SLOT_NOT_LOADED",
				message: "Slot is not loaded. Use verify endpoint for initial loading.",
				status: 400,
			};
		}

		// Mark previous LOADED record as REPLACED
		await tx.loadingRecord.updateMany({
			where: {
				runId: run.id,
				slotId: slot.id,
				status: LoadingRecordStatus.LOADED,
			},
			data: {
				status: LoadingRecordStatus.REPLACED,
				unloadedAt: new Date(),
				unloadedBy: operatorCheck.data,
			},
		});

		// Resolve new material lot
		let materialLot: { id: string; lotNo: string; materialCode: string } | null = null;
		let materialCode = "";
		let lotNo = "";

		if (parsed) {
			materialCode = parsed.materialCode;
			lotNo = parsed.lotNo;
			materialLot = await tx.materialLot.upsert({
				where: { materialCode_lotNo: { materialCode, lotNo } },
				create: { materialCode, lotNo },
				update: {},
				select: { id: true, lotNo: true, materialCode: true },
			});
		} else {
			const candidates = await tx.materialLot.findMany({
				where: { lotNo: fallbackLotNo },
				take: 2,
				select: { id: true, lotNo: true, materialCode: true },
			});
			if (candidates.length === 1) {
				const [candidate] = candidates;
				if (candidate) {
					materialLot = candidate;
					materialCode = candidate.materialCode;
					lotNo = candidate.lotNo;
				}
			} else if (candidates.length > 1) {
				return {
					success: false as const,
					code: "MATERIAL_LOT_AMBIGUOUS",
					message: "Material lot barcode is ambiguous",
					status: 400,
				};
			} else {
				return {
					success: false as const,
					code: "MATERIAL_LOT_NOT_FOUND",
					message: "Material lot not found for barcode",
					status: 404,
				};
			}
		}

		// Verify new material
		if (!materialLot) {
			return {
				success: false as const,
				code: "MATERIAL_LOT_NOT_FOUND",
				message: "Material lot not found",
				status: 404,
			};
		}

		const alternates = parseAlternates(expectation.alternates);
		const isExpected = materialCode === expectation.expectedMaterialCode;
		const isAlternate = alternates.includes(materialCode);

		let verifyResult: LoadingVerifyResult;
		let failReason: string | null = null;
		const now = new Date();

		if (isExpected || isAlternate) {
			verifyResult = isExpected ? LoadingVerifyResult.PASS : LoadingVerifyResult.WARNING;

			await tx.feederSlot.update({
				where: { id: slot.id },
				data: {
					currentMaterialLotId: materialLot.id,
					failedAttempts: 0,
					isLocked: false,
					lockedAt: null,
					lockedReason: null,
				},
			});

			await tx.runSlotExpectation.update({
				where: { id: expectation.id },
				data: {
					loadedMaterialCode: materialCode,
					loadedAt: now,
					loadedBy: operatorCheck.data,
				},
			});
		} else {
			verifyResult = LoadingVerifyResult.FAIL;
			failReason = `Material mismatch. Expected ${expectation.expectedMaterialCode}, got ${materialCode}`;

			const failedAttempts = slot.failedAttempts + 1;
			const locked = failedAttempts >= LOCK_THRESHOLD;

			await tx.feederSlot.update({
				where: { id: slot.id },
				data: {
					currentMaterialLotId: null,
					failedAttempts,
					isLocked: locked,
					lockedAt: locked ? now : null,
					lockedReason: locked ? "3 consecutive failures" : null,
				},
			});

			await tx.runSlotExpectation.update({
				where: { id: expectation.id },
				data: {
					status: "MISMATCH",
					loadedMaterialCode: null,
					loadedAt: null,
					loadedBy: null,
				},
			});
		}

		const record = await tx.loadingRecord.create({
			data: {
				runId: run.id,
				slotId: slot.id,
				runSlotExpectationId: expectation.id,
				materialLotId: materialLot.id,
				materialCode,
				expectedCode: expectation.expectedMaterialCode,
				status:
					verifyResult === LoadingVerifyResult.FAIL
						? LoadingRecordStatus.UNLOADED
						: LoadingRecordStatus.LOADED,
				verifyResult,
				failReason,
				loadedAt: now,
				loadedBy: operatorCheck.data,
				meta: { replaceReason: input.reason },
			},
			include: {
				run: { select: { runNo: true } },
				slot: { select: { id: true, slotCode: true, slotName: true, position: true } },
				materialLot: { select: { id: true, lotNo: true, materialCode: true } },
			},
		});

		return { success: true as const, data: mapLoadingRecord(record) };
	});
}

export async function getRunLoadingRecords(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ items: LoadingRecordDetail[] }>> {
	const run = await db.run.findUnique({ where: { runNo }, select: { id: true } });
	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	const records = await db.loadingRecord.findMany({
		where: { runId: run.id },
		include: {
			run: { select: { runNo: true } },
			slot: { select: { id: true, slotCode: true, slotName: true, position: true } },
			materialLot: { select: { id: true, lotNo: true, materialCode: true } },
		},
		orderBy: { loadedAt: "desc" },
	});

	return { success: true, data: { items: records.map(mapLoadingRecord) } };
}

export async function getRunLoadingExpectations(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ items: RunSlotExpectationDetail[] }>> {
	const run = await db.run.findUnique({ where: { runNo }, select: { id: true } });
	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	const expectations = await db.runSlotExpectation.findMany({
		where: { runId: run.id },
		include: { slot: { select: { id: true, slotCode: true, slotName: true, position: true } } },
		orderBy: { slot: { position: "asc" } },
	});

	return { success: true, data: { items: expectations.map(mapExpectation) } };
}

export async function getFeederSlots(
	db: PrismaClient,
	lineId: string,
): Promise<ServiceResult<{ items: FeederSlotDetail[] }>> {
	const line = await db.line.findUnique({ where: { id: lineId }, select: { id: true } });
	if (!line) {
		return { success: false, code: "LINE_NOT_FOUND", message: "Line not found", status: 404 };
	}

	const slots = await db.feederSlot.findMany({
		where: { lineId },
		orderBy: [{ position: "asc" }, { slotCode: "asc" }],
	});

	return { success: true, data: { items: slots.map(mapFeederSlot) } };
}

export async function createFeederSlot(
	db: PrismaClient,
	lineId: string,
	input: { slotCode: string; slotName?: string; position: number },
): Promise<ServiceResult<FeederSlotDetail>> {
	const line = await db.line.findUnique({ where: { id: lineId }, select: { id: true } });
	if (!line) {
		return { success: false, code: "LINE_NOT_FOUND", message: "Line not found", status: 404 };
	}

	const created = await db.feederSlot.create({
		data: {
			lineId,
			slotCode: input.slotCode,
			slotName: input.slotName ?? null,
			position: input.position,
		},
	});

	return { success: true, data: mapFeederSlot(created) };
}

export async function updateFeederSlot(
	db: PrismaClient,
	slotId: string,
	input: { slotCode?: string; slotName?: string; position?: number },
): Promise<ServiceResult<FeederSlotDetail>> {
	const slot = await db.feederSlot.findUnique({ where: { id: slotId } });
	if (!slot) {
		return {
			success: false,
			code: "SLOT_NOT_FOUND",
			message: "Feeder slot not found",
			status: 404,
		};
	}

	const updated = await db.feederSlot.update({
		where: { id: slotId },
		data: {
			slotCode: input.slotCode ?? undefined,
			slotName: input.slotName ?? undefined,
			position: input.position ?? undefined,
		},
	});

	return { success: true, data: mapFeederSlot(updated) };
}

export async function deleteFeederSlot(
	db: PrismaClient,
	slotId: string,
): Promise<ServiceResult<{ id: string }>> {
	const slot = await db.feederSlot.findUnique({ where: { id: slotId } });
	if (!slot) {
		return {
			success: false,
			code: "SLOT_NOT_FOUND",
			message: "Feeder slot not found",
			status: 404,
		};
	}

	const usageCount = await db.slotMaterialMapping.count({ where: { slotId } });
	if (usageCount > 0) {
		return {
			success: false,
			code: "SLOT_IN_USE",
			message: "Slot has material mappings and cannot be deleted",
			status: 409,
		};
	}

	const recordCount = await db.loadingRecord.count({ where: { slotId } });
	if (recordCount > 0) {
		return {
			success: false,
			code: "SLOT_IN_USE",
			message: "Slot has loading records and cannot be deleted",
			status: 409,
		};
	}

	await db.feederSlot.delete({ where: { id: slotId } });
	return { success: true, data: { id: slotId } };
}

export async function listSlotMaterialMappings(
	db: PrismaClient,
	query: SlotMappingQuery,
): Promise<ServiceResult<{ items: SlotMaterialMappingDetail[] }>> {
	const mappings = await db.slotMaterialMapping.findMany({
		where: {
			slotId: query.slotId,
			productCode: query.productCode,
			routingId: query.routingId,
			...(query.lineId
				? {
						slot: {
							lineId: query.lineId,
						},
					}
				: {}),
		},
		include: { slot: { select: { slotCode: true, slotName: true, position: true } } },
		orderBy: [{ slotId: "asc" }, { priority: "asc" }],
	});

	return { success: true, data: { items: mappings.map(mapSlotMapping) } };
}

export async function createSlotMaterialMapping(
	db: PrismaClient,
	input: {
		slotId: string;
		materialCode: string;
		productCode?: string;
		routingId?: string;
		priority?: number;
		isAlternate?: boolean;
	},
): Promise<ServiceResult<SlotMaterialMappingDetail>> {
	const slot = await db.feederSlot.findUnique({ where: { id: input.slotId } });
	if (!slot) {
		return {
			success: false,
			code: "SLOT_NOT_FOUND",
			message: "Feeder slot not found",
			status: 404,
		};
	}

	if (input.routingId) {
		const routing = await db.routing.findUnique({ where: { id: input.routingId } });
		if (!routing) {
			return {
				success: false,
				code: "ROUTING_NOT_FOUND",
				message: "Routing not found",
				status: 404,
			};
		}
	}

	const created = await db.slotMaterialMapping.create({
		data: {
			slotId: input.slotId,
			materialCode: input.materialCode,
			productCode: input.productCode ?? null,
			routingId: input.routingId ?? null,
			priority: input.priority ?? 1,
			isAlternate: input.isAlternate ?? false,
		},
		include: { slot: { select: { slotCode: true, slotName: true, position: true } } },
	});

	return { success: true, data: mapSlotMapping(created) };
}

export async function updateSlotMaterialMapping(
	db: PrismaClient,
	id: string,
	input: {
		materialCode?: string;
		productCode?: string | null;
		routingId?: string | null;
		priority?: number;
		isAlternate?: boolean;
	},
): Promise<ServiceResult<SlotMaterialMappingDetail>> {
	const mapping = await db.slotMaterialMapping.findUnique({ where: { id } });
	if (!mapping) {
		return {
			success: false,
			code: "SLOT_MAPPING_NOT_FOUND",
			message: "Slot material mapping not found",
			status: 404,
		};
	}

	if (input.routingId) {
		const routing = await db.routing.findUnique({ where: { id: input.routingId } });
		if (!routing) {
			return {
				success: false,
				code: "ROUTING_NOT_FOUND",
				message: "Routing not found",
				status: 404,
			};
		}
	}

	const updated = await db.slotMaterialMapping.update({
		where: { id },
		data: {
			materialCode: input.materialCode ?? undefined,
			productCode: input.productCode === undefined ? undefined : input.productCode,
			routingId: input.routingId === undefined ? undefined : input.routingId,
			priority: input.priority ?? undefined,
			isAlternate: input.isAlternate ?? undefined,
		},
		include: { slot: { select: { slotCode: true, slotName: true, position: true } } },
	});

	return { success: true, data: mapSlotMapping(updated) };
}

export async function deleteSlotMaterialMapping(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<{ id: string }>> {
	const mapping = await db.slotMaterialMapping.findUnique({ where: { id } });
	if (!mapping) {
		return {
			success: false,
			code: "SLOT_MAPPING_NOT_FOUND",
			message: "Slot material mapping not found",
			status: 404,
		};
	}

	await db.slotMaterialMapping.delete({ where: { id } });
	return { success: true, data: { id } };
}
