import { MesEventStatus, type Prisma, type PrismaClient } from "@better-app/db";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MAX_ATTEMPTS = 10;

export const MES_EVENT_TYPES = {
	TRACK_IN: "TRACK_IN",
	TRACK_OUT: "TRACK_OUT",
	SOLDER_PASTE_USAGE_CREATE: "SOLDER_PASTE_USAGE_CREATE",
} as const;

export type MesEventType = (typeof MES_EVENT_TYPES)[keyof typeof MES_EVENT_TYPES];

export type CreateMesEventInput = {
	eventType: MesEventType;
	idempotencyKey: string;
	occurredAt?: Date;
	entityType?: string;
	entityId?: string;
	runId?: string | null;
	payload?: Prisma.InputJsonValue;
	nextAttemptAt?: Date | null;
	maxAttempts?: number;
	retentionDays?: number;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export const buildMesEventIdempotencyKey = (eventType: MesEventType, source: string) =>
	`mes-event:${eventType}:${source}`;

export const createMesEvent = async (db: DbClient, input: CreateMesEventInput) => {
	if (!input.idempotencyKey) {
		throw new Error("idempotencyKey is required for mes events");
	}

	const now = new Date();
	const retentionDays = input.retentionDays ?? DEFAULT_RETENTION_DAYS;
	const retentionUntil = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

	return await db.mesEvent.upsert({
		where: { idempotencyKey: input.idempotencyKey },
		create: {
			eventType: input.eventType,
			status: MesEventStatus.PENDING,
			attempts: 0,
			maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
			nextAttemptAt: input.nextAttemptAt ?? now,
			processedAt: null,
			occurredAt: input.occurredAt ?? now,
			idempotencyKey: input.idempotencyKey,
			entityType: input.entityType ?? null,
			entityId: input.entityId ?? null,
			runId: input.runId ?? null,
			errorCode: null,
			errorMessage: null,
			payload: input.payload ?? undefined,
			retentionUntil,
		},
		update: { updatedAt: now },
		select: { id: true },
	});
};
