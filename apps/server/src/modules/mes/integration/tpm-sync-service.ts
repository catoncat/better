import { createHash } from "node:crypto";
import type { PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import type { IntegrationEnvelope } from "./erp-service";
import {
	mockTpmEquipments,
	mockTpmMaintenanceTasks,
	mockTpmStatusLogs,
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

type TpmEquipment = {
	equipmentCode: string;
	name: string;
	status: string;
	workshopCode: string;
	location: string;
	updatedAt: string;
};

type TpmStatusLog = {
	equipmentCode: string;
	status: string;
	reason: string | null;
	startedAt: string;
	endedAt: string | null;
};

type TpmMaintenanceTask = {
	taskNo: string;
	equipmentCode: string;
	type: string;
	status: string;
	scheduledDate: string;
	startTime: string;
	completedAt: string | null;
};

type TpmConfig = {
	baseUrl?: string;
	apiKey?: string;
	equipmentPath?: string;
	statusLogPath?: string;
	maintenanceTaskPath?: string;
};

const getTpmConfig = (): TpmConfig => ({
	baseUrl: process.env.MES_TPM_BASE_URL,
	apiKey: process.env.MES_TPM_API_KEY,
	equipmentPath: process.env.MES_TPM_EQUIPMENT_PATH ?? "/api/tpm/equipment",
	statusLogPath: process.env.MES_TPM_STATUS_LOG_PATH ?? "/api/tpm/status-logs",
	maintenanceTaskPath: process.env.MES_TPM_MAINTENANCE_TASK_PATH ?? "/api/tpm/maintenance-tasks",
});

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const hashPayload = (value: unknown) =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

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

const fetchTpmList = async <T>(
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
				code: "TPM_FETCH_FAILED",
				message: `TPM request failed (${response.status})`,
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
			code: "TPM_FETCH_ERROR",
			message: error instanceof Error ? error.message : "TPM request error",
			status: 502,
		};
	}
};

const buildEnvelope = <T>(entityType: string, items: T[], nextSyncAt: Date | null): IntegrationEnvelope<T> => ({
	sourceSystem: "TPM",
	entityType,
	cursor: { nextSyncAt: nextSyncAt?.toISOString(), hasMore: false },
	items,
});

export const syncTpmEquipment = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<TpmEquipment>>> => {
	const sourceSystem = "TPM";
	const entityType = "EQUIPMENT";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const businessKey = `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;

	const existing = await db.integrationMessage.findFirst({
		where: { direction: "IN", system: sourceSystem, entityType, businessKey, status: "SUCCESS" },
		orderBy: { createdAt: "desc" },
	});
	if (existing?.payload && typeof existing.payload === "object") {
		return {
			success: true,
			data: {
				payload: existing.payload as IntegrationEnvelope<TpmEquipment>,
				messageId: existing.id,
				businessKey,
				dedupeKey: existing.dedupeKey,
			},
		};
	}

	const config = getTpmConfig();
	const pullResult = config.baseUrl
		? await fetchTpmList<TpmEquipment>(config.baseUrl, config.equipmentPath!, config.apiKey, since)
		: { success: true as const, data: mockTpmEquipments };

	if (!pullResult.success) {
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				status: "FAILED",
				payload: {
					request: { since },
					error: { code: pullResult.code, message: pullResult.message },
				},
				error: pullResult.message,
			},
		});
		return pullResult;
	}

	const nextSyncAt = getLatestTimestamp(pullResult.data.map((item) => item.updatedAt)) ?? new Date();
	const payload = buildEnvelope(entityType, pullResult.data, nextSyncAt);
	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

	const syncResult = await db.$transaction(async (tx) => {
		await tx.integrationSyncCursor.upsert({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
			create: { sourceSystem, entityType, lastSyncAt: nextSyncAt },
			update: { lastSyncAt: nextSyncAt },
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
				payload: duplicate.payload as IntegrationEnvelope<TpmEquipment>,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		for (const item of pullResult.data) {
			await tx.tpmEquipment.upsert({
				where: { equipmentCode: item.equipmentCode },
				update: {
					name: item.name,
					status: item.status,
					workshopCode: item.workshopCode,
					location: item.location,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
				create: {
					equipmentCode: item.equipmentCode,
					name: item.name,
					status: item.status,
					workshopCode: item.workshopCode,
					location: item.location,
					sourceUpdatedAt: parseDate(item.updatedAt),
				},
			});
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload,
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

export const syncTpmStatusLogs = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<TpmStatusLog>>> => {
	const sourceSystem = "TPM";
	const entityType = "STATUS_LOG";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const businessKey = `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;

	const existing = await db.integrationMessage.findFirst({
		where: { direction: "IN", system: sourceSystem, entityType, businessKey, status: "SUCCESS" },
		orderBy: { createdAt: "desc" },
	});
	if (existing?.payload && typeof existing.payload === "object") {
		return {
			success: true,
			data: {
				payload: existing.payload as IntegrationEnvelope<TpmStatusLog>,
				messageId: existing.id,
				businessKey,
				dedupeKey: existing.dedupeKey,
			},
		};
	}

	const config = getTpmConfig();
	const pullResult = config.baseUrl
		? await fetchTpmList<TpmStatusLog>(config.baseUrl, config.statusLogPath!, config.apiKey, since)
		: { success: true as const, data: mockTpmStatusLogs };

	if (!pullResult.success) {
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				status: "FAILED",
				payload: {
					request: { since },
					error: { code: pullResult.code, message: pullResult.message },
				},
				error: pullResult.message,
			},
		});
		return pullResult;
	}

	const nextSyncAt =
		getLatestTimestamp(
			pullResult.data.map((item) => item.endedAt ?? item.startedAt),
		) ?? new Date();
	const payload = buildEnvelope(entityType, pullResult.data, nextSyncAt);
	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

	const syncResult = await db.$transaction(async (tx) => {
		await tx.integrationSyncCursor.upsert({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
			create: { sourceSystem, entityType, lastSyncAt: nextSyncAt },
			update: { lastSyncAt: nextSyncAt },
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
				payload: duplicate.payload as IntegrationEnvelope<TpmStatusLog>,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		for (const item of pullResult.data) {
			const startedAt = parseDate(item.startedAt);
			if (!startedAt) continue;
			const endedAt = parseDate(item.endedAt);
			const sourceUpdatedAt = endedAt ?? startedAt;
			await tx.tpmStatusLog.upsert({
				where: { equipmentCode_startedAt: { equipmentCode: item.equipmentCode, startedAt } },
				update: {
					status: item.status,
					reason: item.reason ?? null,
					endedAt,
					sourceUpdatedAt,
				},
				create: {
					equipmentCode: item.equipmentCode,
					status: item.status,
					reason: item.reason ?? null,
					startedAt,
					endedAt,
					sourceUpdatedAt,
				},
			});
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload,
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

export const syncTpmMaintenanceTasks = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<TpmMaintenanceTask>>> => {
	const sourceSystem = "TPM";
	const entityType = "MAINTENANCE_TASK";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const businessKey = `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;

	const existing = await db.integrationMessage.findFirst({
		where: { direction: "IN", system: sourceSystem, entityType, businessKey, status: "SUCCESS" },
		orderBy: { createdAt: "desc" },
	});
	if (existing?.payload && typeof existing.payload === "object") {
		return {
			success: true,
			data: {
				payload: existing.payload as IntegrationEnvelope<TpmMaintenanceTask>,
				messageId: existing.id,
				businessKey,
				dedupeKey: existing.dedupeKey,
			},
		};
	}

	const config = getTpmConfig();
	const pullResult = config.baseUrl
		? await fetchTpmList<TpmMaintenanceTask>(
				config.baseUrl,
				config.maintenanceTaskPath!,
				config.apiKey,
				since,
			)
		: { success: true as const, data: mockTpmMaintenanceTasks };

	if (!pullResult.success) {
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				status: "FAILED",
				payload: {
					request: { since },
					error: { code: pullResult.code, message: pullResult.message },
				},
				error: pullResult.message,
			},
		});
		return pullResult;
	}

	const nextSyncAt =
		getLatestTimestamp(
			pullResult.data.map((item) => item.completedAt ?? item.startTime ?? item.scheduledDate),
		) ?? new Date();
	const payload = buildEnvelope(entityType, pullResult.data, nextSyncAt);
	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

	const syncResult = await db.$transaction(async (tx) => {
		await tx.integrationSyncCursor.upsert({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
			create: { sourceSystem, entityType, lastSyncAt: nextSyncAt },
			update: { lastSyncAt: nextSyncAt },
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
				payload: duplicate.payload as IntegrationEnvelope<TpmMaintenanceTask>,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		for (const item of pullResult.data) {
			await tx.tpmMaintenanceTask.upsert({
				where: { taskNo: item.taskNo },
				update: {
					equipmentCode: item.equipmentCode,
					type: item.type,
					status: item.status,
					scheduledDate: parseDate(item.scheduledDate),
					startTime: parseDate(item.startTime),
					completedAt: parseDate(item.completedAt),
					sourceUpdatedAt:
						parseDate(item.completedAt) ?? parseDate(item.startTime) ?? parseDate(item.scheduledDate),
				},
				create: {
					taskNo: item.taskNo,
					equipmentCode: item.equipmentCode,
					type: item.type,
					status: item.status,
					scheduledDate: parseDate(item.scheduledDate),
					startTime: parseDate(item.startTime),
					completedAt: parseDate(item.completedAt),
					sourceUpdatedAt:
						parseDate(item.completedAt) ?? parseDate(item.startTime) ?? parseDate(item.scheduledDate),
				},
			});
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload,
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
