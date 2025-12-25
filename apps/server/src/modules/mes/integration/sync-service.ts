import { createHash } from "node:crypto";
import type { PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { pullErpRoutes } from "./erp-service";

type SyncOptions = {
	since?: string;
	startRow?: number;
	limit?: number;
};

type IntegrationCursor = {
	nextSyncAt?: string;
	hasMore: boolean;
};

type IntegrationEnvelope<T> = {
	sourceSystem: string;
	entityType: string;
	cursor: IntegrationCursor;
	items: T[];
};

type SyncResult<T> = {
	payload: IntegrationEnvelope<T>;
	messageId: string;
	businessKey: string;
	dedupeKey?: string | null;
};

type CursorMeta = {
	nextStartRow?: number;
	since?: string;
};

const isEnvelope = (value: unknown): value is IntegrationEnvelope<unknown> => {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.sourceSystem === "string" &&
		typeof record.entityType === "string" &&
		typeof record.cursor === "object" &&
		Array.isArray(record.items)
	);
};

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const hashPayload = (value: unknown) =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

const parseCursorMeta = (meta: unknown): CursorMeta | null => {
	if (!meta || typeof meta !== "object") return null;
	const raw = meta as Record<string, unknown>;
	const nextStartRow = typeof raw.nextStartRow === "number" ? raw.nextStartRow : undefined;
	const since = typeof raw.since === "string" ? raw.since : undefined;
	return nextStartRow || since ? { nextStartRow, since } : null;
};

const resolveSyncTimestamp = (value?: string) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const buildBusinessKey = (sourceSystem: string, entityType: string, since: string | null, startRow: number, limit: number) =>
	`${sourceSystem}:${entityType}:since:${since ?? "NONE"}:start:${startRow}:limit:${limit}`;

export const syncErpRoutes = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<unknown>>> => {
	const sourceSystem = "ERP";
	const entityType = "ROUTING";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const cursorMeta = parseCursorMeta(cursor?.meta ?? null);
	const startRow = options.startRow ?? cursorMeta?.nextStartRow ?? 0;
	const limit = options.limit ?? 200;
	const since = options.since ?? cursorMeta?.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const businessKey = buildBusinessKey(sourceSystem, entityType, since, startRow, limit);

	const existing = await db.integrationMessage.findFirst({
		where: {
			direction: "IN",
			system: sourceSystem,
			entityType,
			businessKey,
			status: "SUCCESS",
		},
		orderBy: { createdAt: "desc" },
	});

	if (existing?.payload && typeof existing.payload === "object") {
		if (!isEnvelope(existing.payload)) {
			// fall through to refresh if payload doesn't match expected envelope
		} else {
		return {
			success: true,
			data: {
				payload: existing.payload,
				messageId: existing.id,
				businessKey,
				dedupeKey: existing.dedupeKey,
			},
		};
		}
	}

	const pullResult = await pullErpRoutes({
		since: since ?? undefined,
		startRow,
		limit,
	});

	if (!pullResult.success) {
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				status: "FAILED",
				payload: {
					request: { since, startRow, limit },
					error: { code: pullResult.code, message: pullResult.message },
				},
				error: pullResult.message,
			},
		});
		return pullResult;
	}

	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(pullResult.data)}`;
	const nextSyncAt = resolveSyncTimestamp(pullResult.data.cursor.nextSyncAt);
	const hasMore = pullResult.data.cursor.hasMore;
	const nextStartRow = startRow + limit;

	const syncResult = await db.$transaction(async (tx) => {
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

		if (!hasMore) {
			await tx.integrationSyncCursor.upsert({
				where: { sourceSystem_entityType: { sourceSystem, entityType } },
				create: {
					sourceSystem,
					entityType,
					lastSyncAt: nextSyncAt,
					meta: null,
				},
				update: {
					lastSyncAt: nextSyncAt ?? undefined,
					meta: null,
				},
			});
		} else {
			await tx.integrationSyncCursor.upsert({
				where: { sourceSystem_entityType: { sourceSystem, entityType } },
				create: {
					sourceSystem,
					entityType,
					lastSyncAt: cursor?.lastSyncAt ?? null,
					meta: {
						nextStartRow,
						since,
					},
				},
				update: {
					meta: {
						nextStartRow,
						since,
					},
				},
			});
		}

		if (duplicate?.payload && isEnvelope(duplicate.payload)) {
			return {
				payload: duplicate.payload,
				messageId: duplicate.id,
				dedupeKey: duplicate.dedupeKey,
			};
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: pullResult.data,
			},
			select: { id: true, dedupeKey: true },
		});

		return {
			payload: pullResult.data,
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
