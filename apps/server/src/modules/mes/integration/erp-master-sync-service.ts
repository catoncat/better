import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import type { IntegrationEnvelope } from "./erp-service";
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
	routingCode: string;
	status: string;
	dueDate: string;
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
	baseUrl?: string;
	apiKey?: string;
	workOrderPath: string;
	materialPath: string;
	bomPath: string;
	workCenterPath: string;
};

const getErpMasterConfig = (): ErpMasterConfig => ({
	baseUrl: process.env.MES_ERP_BASE_URL,
	apiKey: process.env.MES_ERP_API_KEY,
	workOrderPath: process.env.MES_ERP_WORK_ORDER_PATH ?? "/api/erp/work-orders",
	materialPath: process.env.MES_ERP_MATERIAL_PATH ?? "/api/erp/materials",
	bomPath: process.env.MES_ERP_BOM_PATH ?? "/api/erp/boms",
	workCenterPath: process.env.MES_ERP_WORK_CENTER_PATH ?? "/api/erp/work-centers",
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

const fetchErpList = async <T>(
	baseUrl: string,
	path: string,
	apiKey: string | undefined,
	since?: string | null,
): Promise<ServiceResult<T[]>> => {
	const url = new URL(path, baseUrl);
	if (since) url.searchParams.set("since", since);

	try {
		const response = await fetch(url.toString(), {
			headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
		});
		if (!response.ok) {
			return {
				success: false,
				code: "ERP_FETCH_FAILED",
				message: `ERP request failed (${response.status})`,
				status: 502,
			};
		}
		const data = (await response.json()) as unknown;
		if (Array.isArray(data)) {
			return { success: true, data: data as T[] };
		}
		if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
			return { success: true, data: (data as { items: T[] }).items };
		}
		return { success: true, data: [] };
	} catch (error) {
		return {
			success: false,
			code: "ERP_FETCH_ERROR",
			message: error instanceof Error ? error.message : "ERP request error",
			status: 502,
		};
	}
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

const mapWorkOrderStatus = (status: string | undefined) => {
	if (!status) return WorkOrderStatus.RECEIVED;
	const normalized = status.trim().toUpperCase();
	switch (normalized) {
		case "RELEASED":
			return WorkOrderStatus.RELEASED;
		case "IN_PROGRESS":
			return WorkOrderStatus.IN_PROGRESS;
		case "COMPLETED":
			return WorkOrderStatus.COMPLETED;
		case "CLOSED":
			return WorkOrderStatus.CLOSED;
		case "CANCELLED":
			return WorkOrderStatus.CANCELLED;
		default:
			return WorkOrderStatus.RECEIVED;
	}
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
		if (config.baseUrl) {
			const result = await fetchErpList<ErpWorkOrder>(
				config.baseUrl,
				config.workOrderPath,
				config.apiKey,
				since,
			);
			if (!result.success) throw result;
			return result.data;
		}
		return mockErpWorkOrders;
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpWorkOrder[]) => {
		for (const item of items) {
			const routing = item.routingCode
				? await tx.routing.findUnique({ where: { code: item.routingCode } })
				: null;
			await tx.workOrder.upsert({
				where: { woNo: item.woNo },
				update: {
					productCode: item.productCode,
					plannedQty: Math.round(item.plannedQty),
					routingId: routing?.id,
					dueDate: parseDate(item.dueDate),
					status: mapWorkOrderStatus(item.status),
					meta: { erpStatus: item.status },
				},
				create: {
					woNo: item.woNo,
					productCode: item.productCode,
					plannedQty: Math.round(item.plannedQty),
					routingId: routing?.id,
					dueDate: parseDate(item.dueDate),
					status: mapWorkOrderStatus(item.status),
					meta: { erpStatus: item.status },
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
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		if (config.baseUrl) {
			const result = await fetchErpList<ErpMaterial>(
				config.baseUrl,
				config.materialPath,
				config.apiKey,
				since,
			);
			if (!result.success) throw result;
			return result.data;
		}
		return await getMockErpMaterials();
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
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		if (config.baseUrl) {
			const result = await fetchErpList<ErpBomItem>(
				config.baseUrl,
				config.bomPath,
				config.apiKey,
				since,
			);
			if (!result.success) throw result;
			return result.data;
		}
		return mockErpBoms;
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
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		if (config.baseUrl) {
			const result = await fetchErpList<ErpWorkCenter>(
				config.baseUrl,
				config.workCenterPath,
				config.apiKey,
				since,
			);
			if (!result.success) throw result;
			return result.data;
		}
		return await getMockErpWorkCenters();
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
