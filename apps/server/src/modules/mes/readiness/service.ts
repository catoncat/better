import {
	type Prisma,
	type PrismaClient,
	ReadinessCheckStatus,
	ReadinessCheckType,
	ReadinessItemStatus,
	ReadinessItemType,
	type Run,
	SolderPasteStatus,
	StencilStatus,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import type {
	CanAuthorizeResult,
	CheckHistoryEntry,
	CheckItemResult,
	CheckResult,
	CheckSummary,
	ExceptionItem,
	ExceptionsListResult,
	ExceptionsQuery,
	WaiveResult,
} from "./types";

const readinessItemTypes = new Set(Object.values(ReadinessItemType));

const isJsonObject = (value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseEnabledReadinessChecks = (meta: Prisma.JsonValue | null | undefined) => {
	if (!isJsonObject(meta)) return null;
	const readinessChecks = meta.readinessChecks;
	if (!isJsonObject(readinessChecks)) return null;
	const enabled = readinessChecks.enabled;
	if (!Array.isArray(enabled)) return null;
	return enabled.filter(
		(item): item is ReadinessItemType =>
			typeof item === "string" && readinessItemTypes.has(item as ReadinessItemType),
	);
};

export async function checkEquipment(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	const stations = await db.station.findMany({
		where: { lineId: run.lineId },
		select: { code: true },
	});

	const results: CheckItemResult[] = [];

	for (const station of stations) {
		const equipment = await db.tpmEquipment.findFirst({
			where: { equipmentCode: station.code },
		});

		if (!equipment) {
			results.push({
				itemType: ReadinessItemType.EQUIPMENT,
				itemKey: station.code,
				status: ReadinessItemStatus.FAILED,
				failReason: `设备 ${station.code} 无 TPM 主数据`,
				evidenceJson: { stationCode: station.code, sourceSystem: "TPM" },
			});
			continue;
		}

		if (equipment.status !== "normal") {
			results.push({
				itemType: ReadinessItemType.EQUIPMENT,
				itemKey: equipment.equipmentCode,
				status: ReadinessItemStatus.FAILED,
				failReason: `设备状态异常: ${equipment.status}`,
				evidenceJson: { equipmentStatus: equipment.status },
			});
			continue;
		}

		const blockingTask = await db.tpmMaintenanceTask.findFirst({
			where: {
				equipmentCode: equipment.equipmentCode,
				status: { in: ["PENDING", "IN_PROGRESS"] },
				type: { in: ["REPAIR", "CRITICAL", "breakdown"] },
			},
		});

		if (blockingTask) {
			results.push({
				itemType: ReadinessItemType.EQUIPMENT,
				itemKey: equipment.equipmentCode,
				status: ReadinessItemStatus.FAILED,
				failReason: `有未完成的阻断性维保任务: ${blockingTask.taskNo}`,
				evidenceJson: {
					taskNo: blockingTask.taskNo,
					taskType: blockingTask.type,
				},
			});
			continue;
		}

		results.push({
			itemType: ReadinessItemType.EQUIPMENT,
			itemKey: equipment.equipmentCode,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: { stationCode: equipment.equipmentCode, sourceSystem: "TPM" },
		});
	}

	return results;
}

export async function checkMaterial(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	const workOrder = await db.workOrder.findUnique({
		where: { id: run.woId },
		select: { productCode: true },
	});

	if (!workOrder) {
		return [
			{
				itemType: ReadinessItemType.MATERIAL,
				itemKey: run.woId,
				status: ReadinessItemStatus.FAILED,
				failReason: "工单不存在",
			},
		];
	}

	const bomItems = await db.bomItem.findMany({
		where: { parentCode: workOrder.productCode },
	});

	if (bomItems.length === 0) {
		return [
			{
				itemType: ReadinessItemType.MATERIAL,
				itemKey: workOrder.productCode,
				status: ReadinessItemStatus.FAILED,
				failReason: `产品 ${workOrder.productCode} 无 BOM 定义`,
			},
		];
	}

	const results: CheckItemResult[] = [];

	for (const item of bomItems) {
		const material = await db.material.findUnique({
			where: { code: item.childCode },
		});

		results.push({
			itemType: ReadinessItemType.MATERIAL,
			itemKey: item.childCode,
			status: material ? ReadinessItemStatus.PASSED : ReadinessItemStatus.FAILED,
			failReason: material ? undefined : `物料 ${item.childCode} 无主数据`,
		});
	}

	return results;
}

export async function checkRoute(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.routeVersionId) {
		return [
			{
				itemType: ReadinessItemType.ROUTE,
				itemKey: run.runNo,
				status: ReadinessItemStatus.FAILED,
				failReason: "未绑定可执行路由版本",
			},
		];
	}

	const version = await db.executableRouteVersion.findUnique({
		where: { id: run.routeVersionId },
	});

	if (!version) {
		return [
			{
				itemType: ReadinessItemType.ROUTE,
				itemKey: run.routeVersionId,
				status: ReadinessItemStatus.FAILED,
				failReason: "绑定的路由版本不存在",
			},
		];
	}

	if (version.status !== "READY") {
		return [
			{
				itemType: ReadinessItemType.ROUTE,
				itemKey: String(version.versionNo),
				status: ReadinessItemStatus.FAILED,
				failReason: `路由版本状态为 ${version.status}，非 READY`,
			},
		];
	}

	if (run.lineId) {
		const snapshot = version.snapshotJson;
		const steps = (() => {
			if (!snapshot || typeof snapshot !== "object") return [];
			const record = snapshot as { steps?: unknown };
			if (!Array.isArray(record.steps)) return [];
			return record.steps
				.map((step) => {
					if (!step || typeof step !== "object") return null;
					const value = step as {
						stepNo?: unknown;
						stationType?: unknown;
						stationGroupId?: unknown;
						allowedStationIds?: unknown;
					};
					const stepNo = typeof value.stepNo === "number" ? value.stepNo : null;
					const stationType = typeof value.stationType === "string" ? value.stationType : null;
					const stationGroupId =
						typeof value.stationGroupId === "string" ? value.stationGroupId : null;
					const allowedStationIds = Array.isArray(value.allowedStationIds)
						? value.allowedStationIds.filter((id): id is string => typeof id === "string")
						: [];
					if (!stepNo || !stationType) return null;
					return { stepNo, stationType, stationGroupId, allowedStationIds };
				})
				.filter((step): step is NonNullable<typeof step> => Boolean(step))
				.sort((a, b) => a.stepNo - b.stepNo);
		})();

		const stations = await db.station.findMany({
			where: { lineId: run.lineId },
			select: { id: true, stationType: true, groupId: true },
		});

		const isStationValidForStep = (
			step: {
				stationType: string;
				stationGroupId: string | null;
				allowedStationIds: string[];
			},
			station: { id: string; stationType: string; groupId: string | null },
		) => {
			if (step.stationType !== station.stationType) return false;
			if (step.allowedStationIds.length > 0 && !step.allowedStationIds.includes(station.id))
				return false;
			if (step.stationGroupId && step.stationGroupId !== station.groupId) return false;
			return true;
		};

		const incompatibleSteps = steps.filter(
			(step) => !stations.some((station) => isStationValidForStep(step, station)),
		);

		if (incompatibleSteps.length > 0) {
			const line = await db.line.findUnique({
				where: { id: run.lineId },
				select: { code: true },
			});

			const missingGroupIds = [
				...new Set(
					incompatibleSteps
						.map((s) => s.stationGroupId)
						.filter((id): id is string => typeof id === "string" && id.length > 0),
				),
			];
			const groupById = new Map(
				(missingGroupIds.length
					? await db.stationGroup.findMany({
							where: { id: { in: missingGroupIds } },
							select: { id: true, code: true },
						})
					: []
				).map((g) => [g.id, g.code]),
			);
			const groupLabels = missingGroupIds
				.map((id) => groupById.get(id) ?? id)
				.filter(Boolean)
				.join(", ");
			const stepNos = incompatibleSteps.map((s) => s.stepNo).join(", ");

			return [
				{
					itemType: ReadinessItemType.ROUTE,
					itemKey: String(version.versionNo),
					status: ReadinessItemStatus.FAILED,
					failReason:
						groupLabels.length > 0
							? `产线 ${line?.code ?? run.lineId} 与路由不兼容：缺少站点组 ${groupLabels}（stepNo: ${stepNos}）`
							: `产线 ${line?.code ?? run.lineId} 与路由不兼容（stepNo: ${stepNos}）`,
				},
			];
		}
	}

	return [
		{
			itemType: ReadinessItemType.ROUTE,
			itemKey: String(version.versionNo),
			status: ReadinessItemStatus.PASSED,
		},
	];
}

/**
 * Check stencil status for the run's line.
 * Queries LineStencil → StencilStatusRecord, verifies status is READY.
 */
export async function checkStencil(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	// Find current stencil binding for the line
	const currentBinding = await db.lineStencil.findFirst({
		where: { lineId: run.lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return [
			{
				itemType: ReadinessItemType.STENCIL,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线未绑定钢网",
			},
		];
	}

	// Find the latest status record for this stencil
	const latestStatus = await db.stencilStatusRecord.findFirst({
		where: { stencilId: currentBinding.stencilId },
		orderBy: { eventTime: "desc" },
	});

	if (!latestStatus) {
		return [
			{
				itemType: ReadinessItemType.STENCIL,
				itemKey: currentBinding.stencilId,
				status: ReadinessItemStatus.FAILED,
				failReason: `钢网 ${currentBinding.stencilId} 无状态记录`,
			},
		];
	}

	if (latestStatus.status !== StencilStatus.READY) {
		return [
			{
				itemType: ReadinessItemType.STENCIL,
				itemKey: currentBinding.stencilId,
				status: ReadinessItemStatus.FAILED,
				failReason: `钢网状态为 ${latestStatus.status}，需要 READY`,
				evidenceJson: {
					stencilId: currentBinding.stencilId,
					status: latestStatus.status,
					source: latestStatus.source,
					operatorId: latestStatus.operatorId,
					tensionValue: latestStatus.tensionValue,
					lastCleanedAt: latestStatus.lastCleanedAt?.toISOString(),
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.STENCIL,
			itemKey: currentBinding.stencilId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				stencilId: currentBinding.stencilId,
				status: latestStatus.status,
				source: latestStatus.source,
				operatorId: latestStatus.operatorId,
				tensionValue: latestStatus.tensionValue,
			},
		},
	];
}

/**
 * Check solder paste status for the run's line.
 * Queries LineSolderPaste → SolderPasteStatusRecord, verifies status is COMPLIANT.
 */
export async function checkSolderPaste(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	// Find current solder paste binding for the line
	const currentBinding = await db.lineSolderPaste.findFirst({
		where: { lineId: run.lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return [
			{
				itemType: ReadinessItemType.SOLDER_PASTE,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线未绑定锡膏",
			},
		];
	}

	// Find the latest status record for this solder paste lot
	const latestStatus = await db.solderPasteStatusRecord.findFirst({
		where: { lotId: currentBinding.lotId },
		orderBy: { eventTime: "desc" },
	});

	if (!latestStatus) {
		return [
			{
				itemType: ReadinessItemType.SOLDER_PASTE,
				itemKey: currentBinding.lotId,
				status: ReadinessItemStatus.FAILED,
				failReason: `锡膏批次 ${currentBinding.lotId} 无状态记录`,
			},
		];
	}

	if (latestStatus.status !== SolderPasteStatus.COMPLIANT) {
		return [
			{
				itemType: ReadinessItemType.SOLDER_PASTE,
				itemKey: currentBinding.lotId,
				status: ReadinessItemStatus.FAILED,
				failReason: `锡膏状态为 ${latestStatus.status}，需要 COMPLIANT`,
				evidenceJson: {
					lotId: currentBinding.lotId,
					status: latestStatus.status,
					source: latestStatus.source,
					operatorId: latestStatus.operatorId,
					expiresAt: latestStatus.expiresAt?.toISOString(),
					thawedAt: latestStatus.thawedAt?.toISOString(),
					stirredAt: latestStatus.stirredAt?.toISOString(),
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.SOLDER_PASTE,
			itemKey: currentBinding.lotId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				lotId: currentBinding.lotId,
				status: latestStatus.status,
				source: latestStatus.source,
				operatorId: latestStatus.operatorId,
			},
		},
	];
}

/**
 * Check stencil cleaning record for the run's current stencil.
 * Queries LineStencil → StencilCleaningRecord, verifies at least one record exists.
 */
export async function checkPrepStencilClean(
	db: PrismaClient,
	run: Run,
): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	const currentBinding = await db.lineStencil.findFirst({
		where: { lineId: run.lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return [
			{
				itemType: ReadinessItemType.PREP_STENCIL_CLEAN,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线未绑定钢网，无法检查清洗记录",
				evidenceJson: { lineId: run.lineId },
			},
		];
	}

	let latestCleaning = await db.stencilCleaningRecord.findFirst({
		where: { runId: run.id, stencilId: currentBinding.stencilId },
		orderBy: [{ cleanedAt: "desc" }, { createdAt: "desc" }],
	});
	let recordSource: "runId" | "lineId" | "global" | null = latestCleaning ? "runId" : null;

	if (!latestCleaning) {
		latestCleaning = await db.stencilCleaningRecord.findFirst({
			where: {
				runId: null,
				stencilId: currentBinding.stencilId,
				OR: [{ lineId: run.lineId }, { lineId: null }],
			},
			orderBy: [{ cleanedAt: "desc" }, { createdAt: "desc" }],
		});
		if (latestCleaning) {
			recordSource = latestCleaning.lineId ? "lineId" : "global";
		}
	}

	if (!latestCleaning) {
		return [
			{
				itemType: ReadinessItemType.PREP_STENCIL_CLEAN,
				itemKey: currentBinding.stencilId,
				status: ReadinessItemStatus.FAILED,
				failReason: `钢网 ${currentBinding.stencilId} 无清洗记录`,
				evidenceJson: {
					stencilId: currentBinding.stencilId,
					lineId: run.lineId,
					runId: run.id,
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_STENCIL_CLEAN,
			itemKey: currentBinding.stencilId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				stencilId: currentBinding.stencilId,
				cleaningRecordId: latestCleaning.id,
				source: recordSource ?? "unknown",
				runId: latestCleaning.runId ?? undefined,
				routingStepId: latestCleaning.routingStepId ?? undefined,
				cleanedAt: latestCleaning.cleanedAt.toISOString(),
				cleanedBy: latestCleaning.cleanedBy,
				recordLineId: latestCleaning.lineId,
			},
		},
	];
}

/**
 * Check squeegee inspection record for the run's line.
 * Queries latest SqueegeeUsageRecord for the line, verifies record exists and check fields are present and passing.
 */
export async function checkPrepScraper(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	let latestUsage = await db.squeegeeUsageRecord.findFirst({
		where: { runId: run.id },
		orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
	});
	let recordSource: "runId" | "lineId" | "global" | null = latestUsage ? "runId" : null;

	if (!latestUsage) {
		latestUsage = await db.squeegeeUsageRecord.findFirst({
			where: {
				runId: null,
				OR: [{ lineId: run.lineId }, { lineId: null }],
			},
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
		});
		if (latestUsage) {
			recordSource = latestUsage.lineId ? "lineId" : "global";
		}
	}

	if (!latestUsage) {
		return [
			{
				itemType: ReadinessItemType.PREP_SCRAPER,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线无刮刀点检记录",
				evidenceJson: { lineId: run.lineId },
			},
		];
	}

	const failures: string[] = [];
	if (latestUsage.checkSurface === null) failures.push("表面检查未填写");
	else if (latestUsage.checkSurface === false) failures.push("表面检查不通过");

	if (latestUsage.checkEdge === null) failures.push("刀口检查未填写");
	else if (latestUsage.checkEdge === false) failures.push("刀口检查不通过");

	if (latestUsage.checkFlatness === null) failures.push("平整度检查未填写");
	else if (latestUsage.checkFlatness === false) failures.push("平整度检查不通过");

	if (
		typeof latestUsage.lifeLimit === "number" &&
		typeof latestUsage.totalPrintCount === "number" &&
		latestUsage.totalPrintCount > latestUsage.lifeLimit
	) {
		failures.push(
			`超过寿命上限: totalPrintCount=${latestUsage.totalPrintCount} > lifeLimit=${latestUsage.lifeLimit}`,
		);
	}

	if (failures.length > 0) {
		return [
			{
				itemType: ReadinessItemType.PREP_SCRAPER,
				itemKey: latestUsage.squeegeeId,
				status: ReadinessItemStatus.FAILED,
				failReason: failures.join("；"),
				evidenceJson: {
					squeegeeId: latestUsage.squeegeeId,
					usageRecordId: latestUsage.id,
					source: recordSource ?? "unknown",
					runId: latestUsage.runId ?? undefined,
					routingStepId: latestUsage.routingStepId ?? undefined,
					recordDate: latestUsage.recordDate.toISOString(),
					lineId: run.lineId,
					checkSurface: latestUsage.checkSurface,
					checkEdge: latestUsage.checkEdge,
					checkFlatness: latestUsage.checkFlatness,
					totalPrintCount: latestUsage.totalPrintCount,
					lifeLimit: latestUsage.lifeLimit,
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_SCRAPER,
			itemKey: latestUsage.squeegeeId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				squeegeeId: latestUsage.squeegeeId,
				usageRecordId: latestUsage.id,
				source: recordSource ?? "unknown",
				runId: latestUsage.runId ?? undefined,
				routingStepId: latestUsage.routingStepId ?? undefined,
				recordDate: latestUsage.recordDate.toISOString(),
				lineId: run.lineId,
				checkSurface: latestUsage.checkSurface,
				checkEdge: latestUsage.checkEdge,
				checkFlatness: latestUsage.checkFlatness,
				totalPrintCount: latestUsage.totalPrintCount,
				lifeLimit: latestUsage.lifeLimit,
			},
		},
	];
}

/**
 * Check loading status for the run.
 * Queries RunSlotExpectation, verifies all slots are LOADED.
 */
export async function checkLoading(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	// Find all slot expectations for this run
	const expectations = await db.runSlotExpectation.findMany({
		where: { runId: run.id },
		include: { slot: true },
	});

	if (expectations.length === 0) {
		if (!run.lineId) {
			return [];
		}

		const slotCount = await db.feederSlot.count({ where: { lineId: run.lineId } });
		if (slotCount === 0) {
			return [];
		}

		return [
			{
				itemType: ReadinessItemType.LOADING,
				itemKey: "SLOT_TABLE",
				status: ReadinessItemStatus.FAILED,
				failReason: "请先加载站位表",
				evidenceJson: {
					code: "SLOT_TABLE_MISSING",
					slotCount,
				},
			},
		];
	}

	const results: CheckItemResult[] = [];

	for (const exp of expectations) {
		if (exp.status === "LOADED") {
			results.push({
				itemType: ReadinessItemType.LOADING,
				itemKey: exp.slot.slotCode,
				status: ReadinessItemStatus.PASSED,
				evidenceJson: {
					slotCode: exp.slot.slotCode,
					expectedMaterialCode: exp.expectedMaterialCode,
					loadedMaterialCode: exp.loadedMaterialCode,
				},
			});
		} else if (exp.status === "MISMATCH") {
			results.push({
				itemType: ReadinessItemType.LOADING,
				itemKey: exp.slot.slotCode,
				status: ReadinessItemStatus.FAILED,
				failReason: `站位 ${exp.slot.slotCode} 物料不匹配: 期望 ${exp.expectedMaterialCode}，实际 ${exp.loadedMaterialCode ?? "未上料"}`,
				evidenceJson: {
					slotCode: exp.slot.slotCode,
					expectedMaterialCode: exp.expectedMaterialCode,
					loadedMaterialCode: exp.loadedMaterialCode,
				},
			});
		} else {
			// PENDING status - not yet loaded
			results.push({
				itemType: ReadinessItemType.LOADING,
				itemKey: exp.slot.slotCode,
				status: ReadinessItemStatus.FAILED,
				failReason: `站位 ${exp.slot.slotCode} 未完成上料`,
				evidenceJson: {
					slotCode: exp.slot.slotCode,
					expectedMaterialCode: exp.expectedMaterialCode,
					status: exp.status,
				},
			});
		}
	}

	return results;
}

async function checkPrepBake(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	let latestRecord = await db.bakeRecord.findFirst({
		where: { runId: run.id },
		orderBy: { outAt: "desc" },
	});
	let recordSource: "runId" | "productCode" | null = latestRecord ? "runId" : null;

	if (!latestRecord) {
		const workOrder = await db.workOrder.findUnique({
			where: { id: run.woId },
			select: { productCode: true },
		});
		if (workOrder?.productCode) {
			latestRecord = await db.bakeRecord.findFirst({
				where: { itemCode: workOrder.productCode },
				orderBy: { outAt: "desc" },
			});
			if (latestRecord) {
				recordSource = "productCode";
			}
		}
	}

	if (!latestRecord) {
		return [
			{
				itemType: ReadinessItemType.PREP_BAKE,
				itemKey: run.runNo,
				status: ReadinessItemStatus.FAILED,
				failReason: "未找到烘烤记录",
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_BAKE,
			itemKey: latestRecord.itemCode,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				recordId: latestRecord.id,
				source: recordSource ?? "unknown",
				itemCode: latestRecord.itemCode,
				inAt: latestRecord.inAt.toISOString(),
				outAt: latestRecord.outAt.toISOString(),
				materialLotId: latestRecord.materialLotId ?? undefined,
			},
		},
	];
}

async function checkPrepPaste(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	const currentBinding = await db.lineSolderPaste.findFirst({
		where: { lineId: run.lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return [
			{
				itemType: ReadinessItemType.PREP_PASTE,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线未绑定锡膏，无法验证准备记录",
			},
		];
	}

	let latestRecord = await db.solderPasteUsageRecord.findFirst({
		where: {
			lotId: currentBinding.lotId,
			runId: run.id,
		},
		orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
	});
	let recordSource: "runId" | "lineId" | "global" | null = latestRecord ? "runId" : null;

	if (!latestRecord) {
		latestRecord = await db.solderPasteUsageRecord.findFirst({
			where: {
				lotId: currentBinding.lotId,
				runId: null,
				...(run.lineId && {
					OR: [{ lineId: run.lineId }, { lineId: null }],
				}),
			},
			orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
		});
		if (latestRecord) {
			recordSource = latestRecord.lineId ? "lineId" : "global";
		}
	}

	if (!latestRecord) {
		return [
			{
				itemType: ReadinessItemType.PREP_PASTE,
				itemKey: currentBinding.lotId,
				status: ReadinessItemStatus.FAILED,
				failReason: "未找到锡膏使用记录",
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_PASTE,
			itemKey: currentBinding.lotId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				recordId: latestRecord.id,
				source: recordSource ?? "unknown",
				lotId: latestRecord.lotId,
				runId: latestRecord.runId ?? undefined,
				lineId: latestRecord.lineId ?? undefined,
				routingStepId: latestRecord.routingStepId ?? undefined,
				receivedAt: latestRecord.receivedAt?.toISOString(),
				thawedAt: latestRecord.thawedAt?.toISOString(),
				issuedAt: latestRecord.issuedAt?.toISOString(),
			},
		},
	];
}

async function checkPrepStencilUsage(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	const currentBinding = await db.lineStencil.findFirst({
		where: { lineId: run.lineId, isCurrent: true },
	});

	if (!currentBinding) {
		return [
			{
				itemType: ReadinessItemType.PREP_STENCIL_USAGE,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线未绑定钢网，无法验证使用记录",
			},
		];
	}

	let latestRecord = await db.stencilUsageRecord.findFirst({
		where: {
			stencilId: currentBinding.stencilId,
			runId: run.id,
		},
		orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
	});
	let recordSource: "runId" | "lineId" | "global" | null = latestRecord ? "runId" : null;

	if (!latestRecord) {
		latestRecord = await db.stencilUsageRecord.findFirst({
			where: {
				stencilId: currentBinding.stencilId,
				runId: null,
				OR: [{ lineId: run.lineId }, { lineId: null }],
			},
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
		});
		if (latestRecord) {
			recordSource = latestRecord.lineId ? "lineId" : "global";
		}
	}

	if (!latestRecord) {
		return [
			{
				itemType: ReadinessItemType.PREP_STENCIL_USAGE,
				itemKey: currentBinding.stencilId,
				status: ReadinessItemStatus.FAILED,
				failReason: "未找到钢网使用记录",
			},
		];
	}

	if (
		latestRecord.lifeLimit !== null &&
		latestRecord.totalPrintCount !== null &&
		latestRecord.totalPrintCount > latestRecord.lifeLimit
	) {
		return [
			{
				itemType: ReadinessItemType.PREP_STENCIL_USAGE,
				itemKey: currentBinding.stencilId,
				status: ReadinessItemStatus.FAILED,
				failReason: `钢网使用寿命超限: ${latestRecord.totalPrintCount}/${latestRecord.lifeLimit}`,
				evidenceJson: {
					recordId: latestRecord.id,
					source: recordSource ?? "unknown",
					runId: latestRecord.runId ?? undefined,
					routingStepId: latestRecord.routingStepId ?? undefined,
					totalPrintCount: latestRecord.totalPrintCount,
					lifeLimit: latestRecord.lifeLimit,
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_STENCIL_USAGE,
			itemKey: currentBinding.stencilId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				recordId: latestRecord.id,
				source: recordSource ?? "unknown",
				runId: latestRecord.runId ?? undefined,
				routingStepId: latestRecord.routingStepId ?? undefined,
				recordDate: latestRecord.recordDate.toISOString(),
				totalPrintCount: latestRecord.totalPrintCount ?? undefined,
				lifeLimit: latestRecord.lifeLimit ?? undefined,
			},
		},
	];
}

async function checkPrepFixture(_db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.lineId) {
		return [];
	}

	let latestUsage = await _db.fixtureUsageRecord.findFirst({
		where: { runId: run.id },
		orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
	});
	let recordSource: "runId" | "lineId" | "global" | null = latestUsage ? "runId" : null;

	if (!latestUsage) {
		latestUsage = await _db.fixtureUsageRecord.findFirst({
			where: {
				runId: null,
				OR: [{ lineId: run.lineId }, { lineId: null }],
			},
			orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
		});
		if (latestUsage) {
			recordSource = latestUsage.lineId ? "lineId" : "global";
		}
	}

	if (!latestUsage) {
		return [
			{
				itemType: ReadinessItemType.PREP_FIXTURE,
				itemKey: run.lineId,
				status: ReadinessItemStatus.FAILED,
				failReason: "产线无夹具使用记录",
				evidenceJson: { lineId: run.lineId },
			},
		];
	}

	if (
		typeof latestUsage.lifeLimit === "number" &&
		typeof latestUsage.totalUsageCount === "number" &&
		latestUsage.totalUsageCount > latestUsage.lifeLimit
	) {
		return [
			{
				itemType: ReadinessItemType.PREP_FIXTURE,
				itemKey: latestUsage.fixtureId,
				status: ReadinessItemStatus.FAILED,
				failReason: `夹具寿命超限: ${latestUsage.totalUsageCount}/${latestUsage.lifeLimit}`,
				evidenceJson: {
					fixtureId: latestUsage.fixtureId,
					usageRecordId: latestUsage.id,
					source: recordSource ?? "unknown",
					runId: latestUsage.runId ?? undefined,
					routingStepId: latestUsage.routingStepId ?? undefined,
					recordDate: latestUsage.recordDate.toISOString(),
					lineId: run.lineId,
					totalUsageCount: latestUsage.totalUsageCount,
					lifeLimit: latestUsage.lifeLimit,
				},
			},
		];
	}

	return [
		{
			itemType: ReadinessItemType.PREP_FIXTURE,
			itemKey: latestUsage.fixtureId,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				fixtureId: latestUsage.fixtureId,
				usageRecordId: latestUsage.id,
				source: recordSource ?? "unknown",
				runId: latestUsage.runId ?? undefined,
				routingStepId: latestUsage.routingStepId ?? undefined,
				recordDate: latestUsage.recordDate.toISOString(),
				lineId: run.lineId,
				totalUsageCount: latestUsage.totalUsageCount ?? undefined,
				lifeLimit: latestUsage.lifeLimit ?? undefined,
			},
		},
	];
}

/**
 * Check reflow profile/program consistency for the run.
 * Verifies that the actual oven program matches the expected profile from routing.
 * T2.6: Program consistency check
 */
export async function checkProgram(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	if (!run.routeVersionId) {
		return [];
	}

	// Get the routing ID from the executable route version
	const routeVersion = await db.executableRouteVersion.findUnique({
		where: { id: run.routeVersionId },
		select: { routingId: true },
	});

	if (!routeVersion) {
		return [];
	}

	// Find routing steps that have expected reflow profiles
	const stepsWithProfiles = await db.routingStep.findMany({
		where: {
			routingId: routeVersion.routingId,
			expectedReflowProfileId: { not: null },
		},
		include: {
			expectedReflowProfile: { select: { id: true, code: true, name: true, status: true } },
			operation: { select: { code: true, name: true } },
		},
	});

	if (stepsWithProfiles.length === 0) {
		return [];
	}

	const results: CheckItemResult[] = [];

	for (const step of stepsWithProfiles) {
		const profile = step.expectedReflowProfile;
		if (!profile) continue;

		// Check if profile is active
		if (profile.status !== "ACTIVE") {
			results.push({
				itemType: ReadinessItemType.PREP_PROGRAM,
				itemKey: `STEP_${step.stepNo}_PROFILE`,
				status: ReadinessItemStatus.FAILED,
				failReason: `炉温程式 ${profile.code} 状态为 ${profile.status}，无法使用`,
				evidenceJson: {
					stepNo: step.stepNo,
					operationCode: step.operation.code,
					profileId: profile.id,
					profileCode: profile.code,
					profileStatus: profile.status,
				},
			});
			continue;
		}

		// Check for recent usage records that match
		// This is a preparatory check - actual verification happens during execution
		// For Readiness, we just verify the profile exists and is active
		results.push({
			itemType: ReadinessItemType.PREP_PROGRAM,
			itemKey: `STEP_${step.stepNo}_PROFILE`,
			status: ReadinessItemStatus.PASSED,
			evidenceJson: {
				stepNo: step.stepNo,
				operationCode: step.operation.code,
				profileId: profile.id,
				profileCode: profile.code,
				profileName: profile.name,
			},
		});
	}

	return results;
}

/**
 * Check for expired or active time rule instances
 * Returns FAILED items for expired instances, PASSED for active ones within limits
 */
export async function checkTimeRules(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	const instances = await db.timeRuleInstance.findMany({
		where: { runId: run.id },
		include: { definition: true },
	});

	const results: CheckItemResult[] = [];

	for (const instance of instances) {
		if (instance.status === "EXPIRED") {
			results.push({
				itemType: ReadinessItemType.TIME_RULE,
				itemKey: `${instance.definition.code}:${instance.entityId}`,
				status: ReadinessItemStatus.FAILED,
				failReason: `时间规则超时: ${instance.definition.name} - ${instance.entityDisplay ?? instance.entityId}`,
				evidenceJson: {
					instanceId: instance.id,
					definitionCode: instance.definition.code,
					entityType: instance.entityType,
					entityId: instance.entityId,
					startedAt: instance.startedAt.toISOString(),
					expiredAt: instance.expiredAt?.toISOString(),
				},
			});
		} else if (instance.status === "WAIVED") {
			results.push({
				itemType: ReadinessItemType.TIME_RULE,
				itemKey: `${instance.definition.code}:${instance.entityId}`,
				status: ReadinessItemStatus.WAIVED,
				evidenceJson: {
					instanceId: instance.id,
					definitionCode: instance.definition.code,
					waivedAt: instance.waivedAt?.toISOString(),
					waivedBy: instance.waivedBy,
					waiveReason: instance.waiveReason,
				},
			});
		} else if (instance.status === "ACTIVE") {
			// Active instances are OK - they haven't expired yet
			results.push({
				itemType: ReadinessItemType.TIME_RULE,
				itemKey: `${instance.definition.code}:${instance.entityId}`,
				status: ReadinessItemStatus.PASSED,
				evidenceJson: {
					instanceId: instance.id,
					definitionCode: instance.definition.code,
					entityType: instance.entityType,
					entityId: instance.entityId,
					startedAt: instance.startedAt.toISOString(),
					expiresAt: instance.expiresAt.toISOString(),
				},
			});
		}
		// COMPLETED instances are not included in readiness check results
	}

	return results;
}

function calculateSummary(items: Array<{ status: ReadinessItemStatus }>): CheckSummary {
	let passed = 0;
	let failed = 0;
	let waived = 0;

	for (const item of items) {
		switch (item.status) {
			case ReadinessItemStatus.PASSED:
				passed++;
				break;
			case ReadinessItemStatus.FAILED:
				failed++;
				break;
			case ReadinessItemStatus.WAIVED:
				waived++;
				break;
		}
	}

	return { total: items.length, passed, failed, waived };
}

export async function performCheck(
	db: PrismaClient,
	runNo: string,
	type: "PRECHECK" | "FORMAL",
	checkedBy?: string,
): Promise<ServiceResult<CheckResult>> {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const line = run.lineId
		? await db.line.findUnique({ where: { id: run.lineId }, select: { meta: true } })
		: null;
	const enabledChecks = parseEnabledReadinessChecks(line?.meta);
	const hasExplicitEnabled = enabledChecks !== null;
	const enabledSet = new Set(enabledChecks ?? []);
	const shouldRunCheck = (checkType: ReadinessItemType) =>
		!hasExplicitEnabled || enabledSet.has(checkType);

	const [
		equipmentResults,
		materialResults,
		routeResults,
		stencilResults,
		solderPasteResults,
		loadingResults,
		prepBakeResults,
		prepPasteResults,
		prepStencilUsageResults,
		prepStencilCleanResults,
		prepScraperResults,
		prepFixtureResults,
		prepProgramResults,
		timeRuleResults,
	] = await Promise.all([
		shouldRunCheck(ReadinessItemType.EQUIPMENT) ? checkEquipment(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.MATERIAL) ? checkMaterial(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.ROUTE) ? checkRoute(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.STENCIL) ? checkStencil(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.SOLDER_PASTE)
			? checkSolderPaste(db, run)
			: Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.LOADING) ? checkLoading(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_BAKE) ? checkPrepBake(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_PASTE) ? checkPrepPaste(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_STENCIL_USAGE)
			? checkPrepStencilUsage(db, run)
			: Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_STENCIL_CLEAN)
			? checkPrepStencilClean(db, run)
			: Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_SCRAPER)
			? checkPrepScraper(db, run)
			: Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_FIXTURE)
			? checkPrepFixture(db, run)
			: Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.PREP_PROGRAM) ? checkProgram(db, run) : Promise.resolve([]),
		shouldRunCheck(ReadinessItemType.TIME_RULE) ? checkTimeRules(db, run) : Promise.resolve([]),
	]);

	const allResults = [
		...equipmentResults,
		...materialResults,
		...routeResults,
		...stencilResults,
		...solderPasteResults,
		...loadingResults,
		...prepBakeResults,
		...prepPasteResults,
		...prepStencilUsageResults,
		...prepStencilCleanResults,
		...prepScraperResults,
		...prepFixtureResults,
		...prepProgramResults,
		...timeRuleResults,
	];
	const summary = calculateSummary(allResults);
	const checkStatus =
		summary.failed > 0 ? ReadinessCheckStatus.FAILED : ReadinessCheckStatus.PASSED;

	const checkType = type === "PRECHECK" ? ReadinessCheckType.PRECHECK : ReadinessCheckType.FORMAL;

	const check = await db.$transaction(async (tx) => {
		const newCheck = await tx.readinessCheck.create({
			data: {
				runId: run.id,
				type: checkType,
				status: checkStatus,
				checkedAt: new Date(),
				checkedBy: type === "FORMAL" ? checkedBy : null,
			},
		});

		if (allResults.length > 0) {
			await tx.readinessCheckItem.createMany({
				data: allResults.map((r) => ({
					checkId: newCheck.id,
					itemType: r.itemType,
					itemKey: r.itemKey,
					status: r.status,
					failReason: r.failReason,
					evidenceJson: r.evidenceJson as Prisma.InputJsonValue | undefined,
				})),
			});
		}

		return newCheck;
	});

	const items = await db.readinessCheckItem.findMany({
		where: { checkId: check.id },
	});

	const result: CheckResult = {
		checkId: check.id,
		type: check.type,
		status: check.status,
		checkedAt: check.checkedAt.toISOString(),
		checkedBy: check.checkedBy,
		items: items.map((i) => ({
			id: i.id,
			itemType: i.itemType,
			itemKey: i.itemKey,
			status: i.status,
			failReason: i.failReason,
			waivedAt: i.waivedAt?.toISOString() ?? null,
			waivedBy: i.waivedBy,
			waiveReason: i.waiveReason,
		})),
		summary,
	};

	return { success: true as const, data: result };
}

export async function getLatestCheck(
	db: PrismaClient,
	runNo: string,
	type?: "PRECHECK" | "FORMAL",
): Promise<ServiceResult<CheckResult | null>> {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const check = await db.readinessCheck.findFirst({
		where: {
			runId: run.id,
			...(type && {
				type: type === "PRECHECK" ? ReadinessCheckType.PRECHECK : ReadinessCheckType.FORMAL,
			}),
		},
		orderBy: { checkedAt: "desc" },
		include: { items: true },
	});

	if (!check) {
		return { success: true, data: null };
	}

	const summary = calculateSummary(check.items);

	return {
		success: true,
		data: {
			checkId: check.id,
			type: check.type,
			status: check.status,
			checkedAt: check.checkedAt.toISOString(),
			checkedBy: check.checkedBy,
			items: check.items.map((i) => ({
				id: i.id,
				itemType: i.itemType,
				itemKey: i.itemKey,
				status: i.status,
				failReason: i.failReason,
				waivedAt: i.waivedAt?.toISOString() ?? null,
				waivedBy: i.waivedBy,
				waiveReason: i.waiveReason,
			})),
			summary,
		},
	};
}

export async function getCheckHistory(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ checks: CheckHistoryEntry[] }>> {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const checks = await db.readinessCheck.findMany({
		where: { runId: run.id },
		orderBy: { checkedAt: "desc" },
		select: {
			id: true,
			type: true,
			status: true,
			checkedAt: true,
			checkedBy: true,
		},
	});

	return {
		success: true,
		data: {
			checks: checks.map((c) => ({
				checkId: c.id,
				type: c.type,
				status: c.status,
				checkedAt: c.checkedAt.toISOString(),
				checkedBy: c.checkedBy,
			})),
		},
	};
}

export async function canAuthorize(
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<CanAuthorizeResult>> {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const latestFormal = await db.readinessCheck.findFirst({
		where: {
			runId: run.id,
			type: ReadinessCheckType.FORMAL,
		},
		orderBy: { checkedAt: "desc" },
		include: { items: true },
	});

	if (!latestFormal) {
		const checkResult = await performCheck(db, runNo, "FORMAL");
		if (!checkResult.success) {
			return checkResult as ServiceResult<CanAuthorizeResult>;
		}

		const failedItems = checkResult.data.items
			.filter((i) => i.status === ReadinessItemStatus.FAILED)
			.map((i) => ({
				itemType: i.itemType,
				itemKey: i.itemKey,
				status: i.status,
				failReason: i.failReason ?? undefined,
			}));

		return {
			success: true as const,
			data: {
				canAuthorize: failedItems.length === 0,
				failedItems: failedItems.length > 0 ? failedItems : undefined,
			},
		};
	}

	const failedItems = latestFormal.items
		.filter((i) => i.status === ReadinessItemStatus.FAILED)
		.map((i) => ({
			itemType: i.itemType,
			itemKey: i.itemKey,
			status: i.status,
			failReason: i.failReason ?? undefined,
		}));

	return {
		success: true as const,
		data: {
			canAuthorize: failedItems.length === 0,
			failedItems: failedItems.length > 0 ? failedItems : undefined,
		},
	};
}

export async function waiveItem(
	db: PrismaClient,
	runNo: string,
	itemId: string,
	waivedBy: string,
	waiveReason: string,
): Promise<ServiceResult<WaiveResult>> {
	const run = await db.run.findUnique({ where: { runNo }, select: { id: true } });
	if (!run) {
		return {
			success: false as const,
			code: "RUN_NOT_FOUND",
			message: "Run not found",
			status: 404,
		};
	}

	const item = await db.readinessCheckItem.findUnique({
		where: { id: itemId },
		include: { check: { select: { runId: true } } },
	});

	if (!item) {
		return {
			success: false as const,
			code: "ITEM_NOT_FOUND",
			message: "Check item not found",
			status: 404,
		};
	}

	if (item.check.runId !== run.id) {
		return {
			success: false as const,
			code: "RUN_MISMATCH",
			message: `Check item does not belong to run ${runNo}`,
			status: 400,
		};
	}

	if (item.status !== ReadinessItemStatus.FAILED) {
		return {
			success: false as const,
			code: "ITEM_NOT_FAILED",
			message: "Can only waive failed items",
			status: 400,
		};
	}

	const now = new Date();

	await db.$transaction(async (tx) => {
		await tx.readinessCheckItem.update({
			where: { id: itemId },
			data: {
				status: ReadinessItemStatus.WAIVED,
				waivedAt: now,
				waivedBy,
				waiveReason,
			},
		});

		const allItems = await tx.readinessCheckItem.findMany({
			where: { checkId: item.checkId },
		});

		const hasFailedItems = allItems.some((i) => i.status === ReadinessItemStatus.FAILED);

		if (!hasFailedItems) {
			await tx.readinessCheck.update({
				where: { id: item.checkId },
				data: { status: ReadinessCheckStatus.PASSED },
			});
		}
	});

	return {
		success: true as const,
		data: {
			itemId,
			status: ReadinessItemStatus.WAIVED,
			waivedAt: now.toISOString(),
			waivedBy,
			waiveReason,
		},
	};
}

export async function triggerPrecheckForAffectedRuns(
	db: PrismaClient,
	filter: { equipmentCodes?: string[]; routeVersionId?: string },
): Promise<void> {
	const { equipmentCodes, routeVersionId } = filter;

	const activeStatuses = ["PREP"];

	let runs: { runNo: string }[] = [];

	if (equipmentCodes && equipmentCodes.length > 0) {
		const stations = await db.station.findMany({
			where: { code: { in: equipmentCodes } },
			select: { lineId: true },
		});

		const lineIds = [...new Set(stations.map((s) => s.lineId).filter(Boolean))] as string[];

		if (lineIds.length > 0) {
			runs = await db.run.findMany({
				where: {
					status: { in: activeStatuses as never[] },
					lineId: { in: lineIds },
				},
				select: { runNo: true },
			});
		}
	}

	if (routeVersionId) {
		const routeRuns = await db.run.findMany({
			where: {
				status: { in: activeStatuses as never[] },
				routeVersionId,
			},
			select: { runNo: true },
		});
		runs = [...runs, ...routeRuns];
	}

	const uniqueRunNos = [...new Set(runs.map((r) => r.runNo))];

	for (const runNo of uniqueRunNos) {
		performCheck(db, runNo, "PRECHECK").catch(() => {});
	}
}

/**
 * Trigger precheck for all PREP status runs on a given line.
 * Used when maintenance is completed on equipment/fixtures that might affect readiness.
 */
export async function triggerPrecheckForLine(db: PrismaClient, lineId: string): Promise<void> {
	const runs = await db.run.findMany({
		where: {
			status: "PREP",
			lineId,
		},
		select: { runNo: true },
	});

	for (const run of runs) {
		performCheck(db, run.runNo, "PRECHECK").catch(() => {});
	}
}

export async function listRunsWithExceptions(
	db: PrismaClient,
	query: ExceptionsQuery,
): Promise<ServiceResult<ExceptionsListResult>> {
	const { lineId, status, from, to, page = 1, limit = 20 } = query;

	const runStatusFilter = status === "ALL" || !status ? ["PREP"] : [status];

	const dateFilter: { gte?: Date; lte?: Date } = {};
	if (from) dateFilter.gte = new Date(from);
	if (to) dateFilter.lte = new Date(to);

	const checks = await db.readinessCheck.findMany({
		where: {
			run: {
				status: { in: runStatusFilter as never[] },
				...(lineId && { lineId }),
			},
			...(Object.keys(dateFilter).length > 0 && { checkedAt: dateFilter }),
		},
		include: {
			run: {
				include: {
					workOrder: { select: { productCode: true } },
					line: { select: { code: true, name: true } },
				},
			},
			items: {
				select: { status: true },
			},
		},
		orderBy: { checkedAt: "desc" },
	});

	const runCheckMap = new Map<
		string,
		{
			check: (typeof checks)[0];
			failedCount: number;
			waivedCount: number;
		}
	>();

	for (const check of checks) {
		const existing = runCheckMap.get(check.run.runNo);
		if (!existing || new Date(check.checkedAt) > new Date(existing.check.checkedAt)) {
			const failedCount = check.items.filter((i) => i.status === ReadinessItemStatus.FAILED).length;
			const waivedCount = check.items.filter((i) => i.status === ReadinessItemStatus.WAIVED).length;
			runCheckMap.set(check.run.runNo, { check, failedCount, waivedCount });
		}
	}

	const allItems: ExceptionItem[] = [];
	for (const [runNo, { check, failedCount, waivedCount }] of runCheckMap.entries()) {
		if (check.status !== ReadinessCheckStatus.FAILED) {
			continue;
		}
		allItems.push({
			runNo,
			runStatus: check.run.status,
			productCode: check.run.workOrder.productCode,
			lineCode: check.run.line?.code ?? null,
			lineName: check.run.line?.name ?? null,
			checkId: check.id,
			checkType: check.type,
			checkStatus: check.status,
			checkedAt: check.checkedAt.toISOString(),
			failedCount,
			waivedCount,
		});
	}

	const total = allItems.length;
	const startIdx = (page - 1) * limit;
	const items = allItems.slice(startIdx, startIdx + limit);

	return {
		success: true,
		data: { items, total, page, limit },
	};
}
