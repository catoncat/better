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
import { SpanStatusCode, trace } from "@opentelemetry/api";
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

const tracer = trace.getTracer("mes.readiness");
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
	return tracer.startActiveSpan("readiness.checkEquipment", async (span) => {
		try {
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

				if (!equipment) continue;

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
				});
			}

			return results;
		} finally {
			span.end();
		}
	});
}

export async function checkMaterial(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	return tracer.startActiveSpan("readiness.checkMaterial", async (span) => {
		try {
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
		} finally {
			span.end();
		}
	});
}

export async function checkRoute(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	return tracer.startActiveSpan("readiness.checkRoute", async (span) => {
		try {
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

			return [
				{
					itemType: ReadinessItemType.ROUTE,
					itemKey: String(version.versionNo),
					status: ReadinessItemStatus.PASSED,
				},
			];
		} finally {
			span.end();
		}
	});
}

/**
 * Check stencil status for the run's line.
 * Queries LineStencil → StencilStatusRecord, verifies status is READY.
 */
export async function checkStencil(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	return tracer.startActiveSpan("readiness.checkStencil", async (span) => {
		try {
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
						tensionValue: latestStatus.tensionValue,
					},
				},
			];
		} finally {
			span.end();
		}
	});
}

/**
 * Check solder paste status for the run's line.
 * Queries LineSolderPaste → SolderPasteStatusRecord, verifies status is COMPLIANT.
 */
export async function checkSolderPaste(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	return tracer.startActiveSpan("readiness.checkSolderPaste", async (span) => {
		try {
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
					},
				},
			];
		} finally {
			span.end();
		}
	});
}

/**
 * Check loading status for the run.
 * Queries RunSlotExpectation, verifies all slots are LOADED.
 */
export async function checkLoading(db: PrismaClient, run: Run): Promise<CheckItemResult[]> {
	return tracer.startActiveSpan("readiness.checkLoading", async (span) => {
		try {
			// Find all slot expectations for this run
			const expectations = await db.runSlotExpectation.findMany({
				where: { runId: run.id },
				include: { slot: true },
			});

			if (expectations.length === 0) {
				// No loading requirements configured - pass
				return [];
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
		} finally {
			span.end();
		}
	});
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
	return tracer.startActiveSpan("readiness.performCheck", async (span) => {
		span.setAttribute("readiness.runNo", runNo);
		span.setAttribute("readiness.type", type);

		try {
			const run = await db.run.findUnique({ where: { runNo } });
			if (!run) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.setAttribute("readiness.error", "RUN_NOT_FOUND");
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
			] = await Promise.all([
				shouldRunCheck(ReadinessItemType.EQUIPMENT) ? checkEquipment(db, run) : Promise.resolve([]),
				shouldRunCheck(ReadinessItemType.MATERIAL) ? checkMaterial(db, run) : Promise.resolve([]),
				shouldRunCheck(ReadinessItemType.ROUTE) ? checkRoute(db, run) : Promise.resolve([]),
				shouldRunCheck(ReadinessItemType.STENCIL) ? checkStencil(db, run) : Promise.resolve([]),
				shouldRunCheck(ReadinessItemType.SOLDER_PASTE)
					? checkSolderPaste(db, run)
					: Promise.resolve([]),
				shouldRunCheck(ReadinessItemType.LOADING) ? checkLoading(db, run) : Promise.resolve([]),
			]);

			const allResults = [
				...equipmentResults,
				...materialResults,
				...routeResults,
				...stencilResults,
				...solderPasteResults,
				...loadingResults,
			];
			const summary = calculateSummary(allResults);
			const checkStatus =
				summary.failed > 0 ? ReadinessCheckStatus.FAILED : ReadinessCheckStatus.PASSED;

			const checkType =
				type === "PRECHECK" ? ReadinessCheckType.PRECHECK : ReadinessCheckType.FORMAL;

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

			span.setAttribute("readiness.status", checkStatus);
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
	return tracer.startActiveSpan("readiness.canAuthorize", async (span) => {
		span.setAttribute("readiness.runNo", runNo);

		try {
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
		} finally {
			span.end();
		}
	});
}

export async function waiveItem(
	db: PrismaClient,
	itemId: string,
	waivedBy: string,
	waiveReason: string,
): Promise<ServiceResult<WaiveResult>> {
	return tracer.startActiveSpan("readiness.waiveItem", async (span) => {
		span.setAttribute("readiness.itemId", itemId);

		try {
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
		} finally {
			span.end();
		}
	});
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
