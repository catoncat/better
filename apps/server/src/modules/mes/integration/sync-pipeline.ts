import { Prisma, type PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { computeNextSyncAt, hashPayload, toJsonValue } from "./utils";

// ==========================================
// Types
// ==========================================

export type SyncCursor = {
	since?: string | null;
	startRow?: number;
	limit?: number;
	meta?: Record<string, unknown>;
};

export type PullResult<T> = {
	items: T[];
	cursor: {
		nextSyncAt?: string;
		hasMore: boolean;
		nextStartRow?: number;
	};
};

export type IntegrationEnvelope<T> = {
	sourceSystem: string;
	entityType: string;
	cursor: {
		nextSyncAt?: string;
		hasMore: boolean;
	};
	items: T[];
};

export type SyncResult<T> = {
	payload: IntegrationEnvelope<T>;
	messageId: string;
	businessKey: string;
	dedupeKey?: string | null;
	skippedApply?: boolean;
};

export type DedupeStrategy = "skip" | "reapply" | "reapply-mark";

export type SyncPipelineConfig<TRaw, TItem> = {
	sourceSystem: string;
	entityType: string;

	/**
	 * Fetch data from external system.
	 * Should handle pagination internally if needed.
	 */
	pull: (cursor: SyncCursor) => Promise<ServiceResult<PullResult<TRaw>>>;

	/**
	 * Transform raw items to normalized items.
	 */
	normalize: (raw: TRaw[]) => TItem[];

	/**
	 * Apply normalized items to database.
	 * Called within a transaction.
	 */
	apply: (tx: Prisma.TransactionClient, items: TItem[], dedupeKey: string) => Promise<void>;

	/**
	 * Deduplication strategy:
	 * - skip: Return cached result without re-applying
	 * - reapply: Always apply items even if dedupe hit
	 * - reapply-mark: Apply and mark as reapplied
	 */
	dedupeStrategy: DedupeStrategy;

	/**
	 * Batch size for apply transactions.
	 * If set, items will be applied in batches to reduce memory usage.
	 * Default: undefined (all items in one transaction)
	 */
	applyBatchSize?: number;
};

type SyncOptions = {
	since?: string;
	startRow?: number;
	limit?: number;
};

// ==========================================
// Helper Functions
// ==========================================

const buildEnvelope = <T>(
	sourceSystem: string,
	entityType: string,
	items: T[],
	nextSyncAt: Date | null,
	hasMore: boolean,
): IntegrationEnvelope<T> => ({
	sourceSystem,
	entityType,
	cursor: { nextSyncAt: nextSyncAt?.toISOString(), hasMore },
	items,
});

const buildBusinessKey = (sourceSystem: string, entityType: string, since: string | null): string =>
	`${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;

const parseCursorMeta = (meta: unknown): { nextStartRow?: number; since?: string } | null => {
	if (!meta || typeof meta !== "object") return null;
	const raw = meta as Record<string, unknown>;
	const nextStartRow = typeof raw.nextStartRow === "number" ? raw.nextStartRow : undefined;
	const since = typeof raw.since === "string" ? raw.since : undefined;
	return nextStartRow || since ? { nextStartRow, since } : null;
};

// ==========================================
// Sync Pipeline Factory
// ==========================================

/**
 * Creates a sync function for an entity type.
 *
 * B1 Fix: Removed businessKey-based early return that caused polling to stop.
 * B3 Fix: Cursor does not advance when no items are returned.
 * B6 Fix: Added batch processing support to reduce memory usage.
 */
export const createSyncPipeline = <TRaw, TItem extends { updatedAt?: string }>(
	config: SyncPipelineConfig<TRaw, TItem>,
) => {
	return async (
		db: PrismaClient,
		options: SyncOptions,
	): Promise<ServiceResult<SyncResult<TItem>>> => {
		const { sourceSystem, entityType, pull, normalize, apply, dedupeStrategy, applyBatchSize } =
			config;

		// Read existing cursor
		const cursor = await db.integrationSyncCursor.findUnique({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
		});
		const cursorMeta = parseCursorMeta(cursor?.meta ?? null);

		// Determine sync parameters
		const since = options.since ?? cursorMeta?.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
		const startRow = options.startRow ?? cursorMeta?.nextStartRow ?? 0;
		const limit = options.limit ?? 200;
		const businessKey = buildBusinessKey(sourceSystem, entityType, since);

		// B1 Fix: Removed early return based on businessKey cache.
		// Always execute pull to allow cursor to advance.

		// Pull data from external system
		const pullResult = await pull({ since, startRow, limit });

		if (!pullResult.success) {
			await db.integrationMessage.create({
				data: {
					direction: "IN",
					system: sourceSystem,
					entityType,
					businessKey,
					status: "FAILED",
					payload: toJsonValue({
						request: { since, startRow, limit },
						error: { code: pullResult.code, message: pullResult.message },
					}),
					error: pullResult.message,
				},
			});
			return pullResult;
		}

		const rawItems = pullResult.data.items;
		const items = normalize(rawItems);
		const hasMore = pullResult.data.cursor.hasMore;

		// B3 Fix: Compute next sync time conservatively
		const nextSyncAt = computeNextSyncAt(items, since);

		const payload = buildEnvelope(sourceSystem, entityType, items, nextSyncAt, hasMore);
		const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

		// Check for duplicate before apply
		const duplicate = await db.integrationMessage.findFirst({
			where: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				dedupeKey,
				status: "SUCCESS",
			},
			orderBy: { createdAt: "desc" },
		});

		let skippedApply = false;

		// Determine whether to apply based on strategy
		const shouldApply =
			items.length > 0 &&
			(dedupeStrategy === "reapply" || dedupeStrategy === "reapply-mark" || !duplicate);

		// B6 Fix: Apply items in batches to reduce memory usage
		if (shouldApply) {
			if (applyBatchSize && applyBatchSize > 0 && items.length > applyBatchSize) {
				// Batch processing: each batch in its own transaction
				for (let i = 0; i < items.length; i += applyBatchSize) {
					const batch = items.slice(i, i + applyBatchSize);
					await db.$transaction(
						async (tx: Prisma.TransactionClient) => {
							await apply(tx, batch, dedupeKey);
						},
						{ timeout: 60000 },
					);
				}
			} else {
				// Single transaction for all items
				await db.$transaction(
					async (tx: Prisma.TransactionClient) => {
						await apply(tx, items, dedupeKey);
					},
					{ timeout: 60000 },
				);
			}
		} else if (duplicate && dedupeStrategy === "skip") {
			skippedApply = true;
		}

		// Update cursor and create message in final transaction
		const syncResult = await db.$transaction(async (tx: Prisma.TransactionClient) => {
			// Update cursor
			if (!hasMore) {
				await tx.integrationSyncCursor.upsert({
					where: { sourceSystem_entityType: { sourceSystem, entityType } },
					create: {
						sourceSystem,
						entityType,
						lastSyncAt: nextSyncAt,
						meta: Prisma.DbNull,
					},
					update: {
						lastSyncAt: nextSyncAt,
						meta: Prisma.DbNull,
					},
				});
			} else {
				const nextStartRow = startRow + limit;
				await tx.integrationSyncCursor.upsert({
					where: { sourceSystem_entityType: { sourceSystem, entityType } },
					create: {
						sourceSystem,
						entityType,
						lastSyncAt: cursor?.lastSyncAt ?? null,
						meta: toJsonValue({ nextStartRow, since }),
					},
					update: {
						meta: toJsonValue({ nextStartRow, since }),
					},
				});
			}

			// If duplicate and skip strategy, return cached result
			if (duplicate && dedupeStrategy === "skip" && skippedApply) {
				return {
					payload: duplicate.payload as IntegrationEnvelope<TItem>,
					messageId: duplicate.id,
					dedupeKey: duplicate.dedupeKey,
					skippedApply: true,
				};
			}

			// Create new message
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
				skippedApply: false,
			};
		});

		return {
			success: true,
			data: {
				payload: syncResult.payload,
				messageId: syncResult.messageId,
				businessKey,
				dedupeKey: syncResult.dedupeKey,
				skippedApply: syncResult.skippedApply,
			},
		};
	};
};
