import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import type { IntegrationEnvelope } from "./erp-service";
import { getTimezoneOffsetMinutes } from "../../../utils/datetime";
import type { KingdeeConfig } from "./kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "./kingdee";
import {
	getMockErpMaterials,
	getMockErpWorkCenters,
	mockErpBoms,
	mockErpWorkOrders,
} from "./mock-data";

type SyncOptions = {
	since?: string;
};

type SyncResult<T> = {
	payload: IntegrationEnvelope<T>;
	messageId: string;
	businessKey: string;
	dedupeKey?: string | null;
};

type ErpWorkOrder = {
	woNo: string;
	productCode: string;
	plannedQty: number;
	routingCode?: string;
	status: string;
	pickStatus: string; // FPickMtrlStatus
	dueDate?: string;
	updatedAt: string;
};

type ErpMaterial = {
	materialCode: string;
	name: string;
	category: string;
	unit: string;
	model: string;
	updatedAt: string;
};

type ErpBomItem = {
	parentCode: string;
	childCode: string;
	qty: number;
	unit: string;
	updatedAt: string;
};

type ErpWorkCenter = {
	workCenterCode: string;
	name: string;
	departmentCode: string;
	departmentName: string;
	updatedAt: string;
};

type ErpMasterConfig = {
	workOrderRoutingField?: string | null;
};

const getErpMasterConfig = (): ErpMasterConfig => ({
	workOrderRoutingField: process.env.MES_ERP_KINGDEE_WORK_ORDER_ROUTING_FIELD?.trim() || null,
});

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const hashPayload = (value: unknown) =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

const serializeError = (error: unknown) => {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	if (error && typeof error === "object") return error;
	return { message: String(error ?? "Unknown error") };
};

const getServiceErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean; message?: string };
		if (value.success === false && typeof value.message === "string") return value.message;
	}
	return fallback;
};

const toServiceError = (
	error: unknown,
	fallbackCode: string,
	fallbackMessage: string,
): ServiceResult<never> => {
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean };
		if (value.success === false) {
			return error as ServiceResult<never>;
		}
	}
	return { success: false, code: fallbackCode, message: fallbackMessage };
};

const parseDate = (value?: string | null) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const getLatestTimestamp = (values: Array<string | null | undefined>) => {
	let latest: Date | null = null;
	for (const value of values) {
		const parsed = parseDate(value);
		if (!parsed) continue;
		if (!latest || parsed > latest) latest = parsed;
	}
	return latest;
};

const formatKingdeeDate = (value: string) => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.valueOf())) return value;
	const offsetMinutes = getTimezoneOffsetMinutes();
	const local = new Date(parsed.getTime() + offsetMinutes * 60_000);
	const pad = (num: number) => String(num).padStart(2, "0");
	return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(
		local.getUTCHours(),
	)}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
};

const buildSinceFilter = (field: string, since?: string | null) => {
	if (!since) return "";
	return `${field} >= '${formatKingdeeDate(since)}'`;
};

const getCell = (row: unknown[], index: number) => {
	if (!Array.isArray(row)) return "";
	const val = row[index];
	if (val === null || val === undefined) return "";
	return String(val);
};

const toIso = (value: string) => {
	if (!value) return "";
	const normalized = value.replace(" ", "T");
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString();
};

const toNumber = (value: string) => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const getKingdeeSession = async (): Promise<
	ServiceResult<{ config: KingdeeConfig; cookie: string }>
> => {
	const configResult = getKingdeeConfig();
	if (!configResult.success) return configResult;
	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) return loginResult;
	return { success: true, data: { config: configResult.data, cookie: loginResult.data.cookie } };
};

const fetchKingdeeRows = async (
	session: { config: KingdeeConfig; cookie: string },
	formId: string,
	fieldKeys: string,
	filterString: string,
): Promise<ServiceResult<unknown[]>> => {
	const pageSize = 200;
	let startRow = 0;
	const rows: unknown[] = [];

	for (;;) {
		const result = await kingdeeExecuteBillQuery(session.config, session.cookie, {
			formId,
			fieldKeys,
			filterString,
			startRow,
			limit: pageSize,
		});
		if (!result.success) return result;
		rows.push(...result.data);
		if (result.data.length < pageSize) break;
		startRow += pageSize;
	}

	return { success: true, data: rows };
};

const buildEnvelope = <T>(
	entityType: string,
	items: T[],
	nextSyncAt: Date | null,
): IntegrationEnvelope<T> => ({
	sourceSystem: "ERP",
	entityType,
	cursor: { nextSyncAt: nextSyncAt?.toISOString(), hasMore: false },
	items,
});

const mapWorkOrderStatus = (erpStatus: string | undefined) => {
	if (!erpStatus) return WorkOrderStatus.RECEIVED;
	const normalized = erpStatus.trim();
	switch (normalized) {
		case "1": // 拟定
			return WorkOrderStatus.RECEIVED;
		case "2": // 下达
			return WorkOrderStatus.RELEASED;
		case "3": // 开工
			return WorkOrderStatus.IN_PROGRESS;
		case "4": // 完工
			return WorkOrderStatus.COMPLETED;
		case "5": // 结案
		case "6": // 完工结案
			return WorkOrderStatus.CLOSED;
		case "7": // 作废
			return WorkOrderStatus.CANCELLED;
		default:
			return WorkOrderStatus.RECEIVED;
	}
};

type RoutingResolution = {
	routing: { id: string; code: string } | null;
	mode: "routing_code" | "product_code" | "ambiguous" | "not_found";
	candidateCodes?: string[];
};

const resolveRoutingForWorkOrder = async (
	tx: Prisma.TransactionClient,
	item: ErpWorkOrder,
): Promise<RoutingResolution> => {
	if (item.routingCode) {
		const routing = await tx.routing.findUnique({
			where: { code: item.routingCode },
			select: { id: true, code: true },
		});
		return { routing: routing ?? null, mode: routing ? "routing_code" : "not_found" };
	}

	const now = new Date();
	const candidates = await tx.routing.findMany({
		where: {
			productCode: item.productCode,
			isActive: true,
			AND: [
				{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
				{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
			],
		},
		orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
		select: { id: true, code: true },
		take: 2,
	});

	if (candidates.length === 1) {
		return { routing: candidates[0], mode: "product_code" };
	}
	if (candidates.length > 1) {
		return {
			routing: null,
			mode: "ambiguous",
			candidateCodes: candidates.map((candidate) => candidate.code),
		};
	}

	return { routing: null, mode: "not_found" };
};

const WORK_ORDER_FIELDS = [
	"FBillNo",
	"FMaterialId.FNumber",
	"FQty",
	"FPlanFinishDate",
	"FStatus", // 业务状态
	"FPickMtrlStatus", // 领料状态
	"FModifyDate",
];

const WORK_ORDER_INDEX = {
	woNo: 0,
	productCode: 1,
	plannedQty: 2,
	dueDate: 3,
	erpStatus: 4,
	erpPickStatus: 5,
	updatedAt: 6,
} as const;

const MATERIAL_FIELDS = [
	"FNumber",
	"FName",
	"FCategoryID.FName",
	"FBaseUnitId.FName",
	"FModifyDate",
];

const MATERIAL_INDEX = {
	code: 0,
	name: 1,
	category: 2,
	unit: 3,
	updatedAt: 4,
} as const;

const BOM_FIELDS = ["FMaterialID.FNumber", "FMaterialIDChild.FNumber", "FNumerator", "FModifyDate"];

const BOM_INDEX = {
	parentCode: 0,
	childCode: 1,
	qty: 2,
	updatedAt: 3,
} as const;

const WORK_CENTER_FIELDS = ["FNumber", "FName", "FModifyDate"];
const WORK_CENTER_FORM_IDS = ["BD_WorkCenter", "PRD_WorkCenter"] as const;

const WORK_CENTER_INDEX = {
	code: 0,
	name: 1,
	updatedAt: 2,
} as const;

const normalizeWorkOrders = (rows: unknown[], routingFieldIndex: number | null): ErpWorkOrder[] => {
	const items: ErpWorkOrder[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const woNo = getCell(row, WORK_ORDER_INDEX.woNo).trim();
		const productCode = getCell(row, WORK_ORDER_INDEX.productCode).trim();
		if (!woNo || !productCode) continue;

		const plannedQty = toNumber(getCell(row, WORK_ORDER_INDEX.plannedQty));
		const erpStatus = getCell(row, WORK_ORDER_INDEX.erpStatus).trim();
		const erpPickStatus = getCell(row, WORK_ORDER_INDEX.erpPickStatus).trim();
		const dueDateRaw = getCell(row, WORK_ORDER_INDEX.dueDate).trim();
		const updatedAtRaw = getCell(row, WORK_ORDER_INDEX.updatedAt).trim();
		const routingRaw = routingFieldIndex !== null ? getCell(row, routingFieldIndex).trim() : "";

		const dueDate = dueDateRaw ? toIso(dueDateRaw) : "";
		const updatedAt = toIso(updatedAtRaw) || dueDate || new Date().toISOString();

		items.push({
			woNo,
			productCode,
			plannedQty,
			routingCode: routingRaw || undefined,
			status: erpStatus,
			pickStatus: erpPickStatus,
			dueDate: dueDate || undefined,
			updatedAt,
		});
	}

	return items;
};

const normalizeMaterials = (rows: unknown[]): ErpMaterial[] => {
	const items: ErpMaterial[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const materialCode = getCell(row, MATERIAL_INDEX.code).trim();
		if (!materialCode) continue;

		const name = getCell(row, MATERIAL_INDEX.name).trim();
		const category = getCell(row, MATERIAL_INDEX.category).trim();
		const unit = getCell(row, MATERIAL_INDEX.unit).trim();
		const updatedAtRaw = getCell(row, MATERIAL_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			materialCode,
			name: name || materialCode,
			category,
			unit,
			model: "",
			updatedAt,
		});
	}

	return items;
};

const normalizeBoms = (rows: unknown[]): ErpBomItem[] => {
	const items: ErpBomItem[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const parentCode = getCell(row, BOM_INDEX.parentCode).trim();
		const childCode = getCell(row, BOM_INDEX.childCode).trim();
		if (!parentCode || !childCode) continue;

		const qty = toNumber(getCell(row, BOM_INDEX.qty));
		const updatedAtRaw = getCell(row, BOM_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			parentCode,
			childCode,
			qty,
			unit: "",
			updatedAt,
		});
	}

	return items;
};

const normalizeWorkCenters = (rows: unknown[]): ErpWorkCenter[] => {
	const items: ErpWorkCenter[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const workCenterCode = getCell(row, WORK_CENTER_INDEX.code).trim();
		if (!workCenterCode) continue;

		const name = getCell(row, WORK_CENTER_INDEX.name).trim();
		const updatedAtRaw = getCell(row, WORK_CENTER_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			workCenterCode,
			name: name || workCenterCode,
			departmentCode: "",
			departmentName: "",
			updatedAt,
		});
	}

	return items;
};

const syncEnvelope = async <T>(
	db: PrismaClient,
	sourceSystem: string,
	entityType: string,
	since: string | null,
	payloadBuilder: () => Promise<T[]>,
	applyItems: (tx: Prisma.TransactionClient, items: T[]) => Promise<void>,
): Promise<ServiceResult<SyncResult<T>>> => {
	const businessKey = `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;
	const existing = await db.integrationMessage.findFirst({
		where: { direction: "IN", system: sourceSystem, entityType, businessKey, status: "SUCCESS" },
		orderBy: { createdAt: "desc" },
	});
	if (existing?.payload && typeof existing.payload === "object") {
		return {
			success: true,
			data: {
				payload: existing.payload as IntegrationEnvelope<T>,
				messageId: existing.id,
				businessKey,
				dedupeKey: existing.dedupeKey,
			},
		};
	}

	const items = await payloadBuilder();
	const nextSyncAt = getLatestTimestamp(
		items.map((item) => (item as { updatedAt?: string }).updatedAt),
	);
	const payload = buildEnvelope(entityType, items, nextSyncAt ?? new Date());
	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

	const syncResult = await db.$transaction(async (tx) => {
		await tx.integrationSyncCursor.upsert({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
			create: { sourceSystem, entityType, lastSyncAt: nextSyncAt ?? new Date() },
			update: { lastSyncAt: nextSyncAt ?? new Date() },
		});

		const duplicate = await tx.integrationMessage.findFirst({
			where: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				dedupeKey,
				status: "SUCCESS",
			},
			orderBy: { createdAt: "desc" },
		});
		if (duplicate?.payload && typeof duplicate.payload === "object") {
			return {
				payload: duplicate.payload as IntegrationEnvelope<T>,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		if (items.length > 0) {
			await applyItems(tx, items);
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: toJsonValue(payload),
			},
			select: { id: true, dedupeKey: true },
		});

		return {
			payload,
			messageId: message.id,
			dedupeKey: message.dedupeKey,
		};
	});

	return {
		success: true,
		data: {
			payload: syncResult.payload,
			messageId: syncResult.messageId,
			businessKey,
			dedupeKey: syncResult.dedupeKey,
		},
	};
};

export const syncErpWorkOrders = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpWorkOrder>>> => {
	const sourceSystem = "ERP";
	const entityType = "WORK_ORDER";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return mockErpWorkOrders;
			throw sessionResult;
		}

		const fields = config.workOrderRoutingField
			? [...WORK_ORDER_FIELDS, config.workOrderRoutingField]
			: WORK_ORDER_FIELDS;
		const routingFieldIndex = config.workOrderRoutingField ? WORK_ORDER_FIELDS.length : null;
		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			"PRD_MO",
			fields.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeWorkOrders(rowsResult.data, routingFieldIndex);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpWorkOrder[]) => {
		for (const item of items) {
			const routingResolution = await resolveRoutingForWorkOrder(tx, item);
			const routing = routingResolution.routing;
			const routingMeta: Record<string, unknown> = {
				mode: routingResolution.mode,
				routingCode: item.routingCode ?? null,
				resolvedCode: routing?.code ?? null,
			};
			if (routingResolution.candidateCodes?.length) {
				routingMeta.candidateCodes = routingResolution.candidateCodes;
			}
			await tx.workOrder.upsert({
				where: { woNo: item.woNo },
				update: {
					productCode: item.productCode,
					plannedQty: Math.round(item.plannedQty),
					routingId: routing?.id,
					dueDate: parseDate(item.dueDate),
					status: mapWorkOrderStatus(item.status),
					erpStatus: item.status,
					erpPickStatus: item.pickStatus,
					meta: {
						erpStatus: item.status,
						erpPickStatus: item.pickStatus,
						erpRouting: routingMeta,
					},
				},
				create: {
					woNo: item.woNo,
					productCode: item.productCode,
					plannedQty: Math.round(item.plannedQty),
					routingId: routing?.id,
					dueDate: parseDate(item.dueDate),
					status: mapWorkOrderStatus(item.status),
					erpStatus: item.status,
					erpPickStatus: item.pickStatus,
					meta: {
						erpStatus: item.status,
						erpPickStatus: item.pickStatus,
						erpRouting: routingMeta,
					},
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP work order fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpMaterials = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpMaterial>>> => {
	const sourceSystem = "ERP";
	const entityType = "MATERIAL";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return await getMockErpMaterials();
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			"BD_Material",
			MATERIAL_FIELDS.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeMaterials(rowsResult.data);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpMaterial[]) => {
		for (const item of items) {
			await tx.material.upsert({
				where: { code: item.materialCode },
				update: {
					name: item.name,
					category: item.category,
					unit: item.unit,
					model: item.model,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
				create: {
					code: item.materialCode,
					name: item.name,
					category: item.category,
					unit: item.unit,
					model: item.model,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP material fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpBoms = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpBomItem>>> => {
	const sourceSystem = "ERP";
	const entityType = "BOM";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return mockErpBoms;
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			"ENG_BOM",
			BOM_FIELDS.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeBoms(rowsResult.data);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpBomItem[]) => {
		for (const item of items) {
			await tx.bomItem.upsert({
				where: { parentCode_childCode: { parentCode: item.parentCode, childCode: item.childCode } },
				update: {
					qty: item.qty,
					unit: item.unit,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
				create: {
					parentCode: item.parentCode,
					childCode: item.childCode,
					qty: item.qty,
					unit: item.unit,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP BOM fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpWorkCenters = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpWorkCenter>>> => {
	const sourceSystem = "ERP";
	const entityType = "WORK_CENTER";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return await getMockErpWorkCenters();
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		for (const formId of WORK_CENTER_FORM_IDS) {
			const rowsResult = await fetchKingdeeRows(
				sessionResult.data,
				formId,
				WORK_CENTER_FIELDS.join(","),
				filterString,
			);
			if (!rowsResult.success) throw rowsResult;
			if (rowsResult.data.length > 0) {
				return normalizeWorkCenters(rowsResult.data);
			}
		}

		return [];
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpWorkCenter[]) => {
		for (const item of items) {
			await tx.workCenter.upsert({
				where: { code: item.workCenterCode },
				update: {
					name: item.name,
					departmentCode: item.departmentCode,
					departmentName: item.departmentName,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
				create: {
					code: item.workCenterCode,
					name: item.name,
					departmentCode: item.departmentCode,
					departmentName: item.departmentName,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP work center fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};
