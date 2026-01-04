import type { IntegrationSource, Prisma, PrismaClient, SolderPasteStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { solderPasteStatusReceiveSchema } from "./loading-schema";
import { parseDate, toJsonValue } from "./utils";

type ReceiveSolderPasteStatusInput = Static<typeof solderPasteStatusReceiveSchema>;

export type ReceiveSolderPasteStatusResult = {
	id: string;
	eventId: string;
	lotId: string;
	status: string;
	receivedAt: string;
	isDuplicate: boolean;
};

/**
 * Receives solder paste status from WMS system (or manual entry).
 * Uses eventId for idempotency - returns existing record if already received.
 * Logs to IntegrationMessage for audit trail.
 */
export const receiveSolderPasteStatus = async (
	db: PrismaClient,
	input: ReceiveSolderPasteStatusInput,
): Promise<ReceiveSolderPasteStatusResult> => {
	const sourceSystem = "WMS";
	const entityType = "SOLDER_PASTE_STATUS";
	const businessKey = `solder-paste:${input.lotId}:${input.eventId}`;
	const dedupeKey = `solder-paste-status:${input.eventId}`;

	// Check for existing event (idempotency)
	const existing = await db.solderPasteStatusRecord.findUnique({
		where: { eventId: input.eventId },
	});

	if (existing) {
		// Log duplicate attempt to IntegrationMessage
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "DUPLICATE",
				payload: toJsonValue({ input, existingId: existing.id }),
			},
		});

		return {
			id: existing.id,
			eventId: existing.eventId,
			lotId: existing.lotId,
			status: existing.status,
			receivedAt: existing.receivedAt.toISOString(),
			isDuplicate: true,
		};
	}

	// Validate MANUAL source requires operatorId
	if (input.source === "MANUAL" && !input.operatorId) {
		throw new Error("operatorId is required for MANUAL source");
	}

	const meta = input.meta as Prisma.InputJsonValue | undefined;

	// Create new record within transaction
	const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
		const record = await tx.solderPasteStatusRecord.create({
			data: {
				eventId: input.eventId,
				eventTime: new Date(input.eventTime),
				lotId: input.lotId,
				status: input.status as SolderPasteStatus,
				expiresAt: parseDate(input.expiresAt),
				thawedAt: parseDate(input.thawedAt),
				stirredAt: parseDate(input.stirredAt),
				source: input.source as IntegrationSource,
				operatorId: input.operatorId ?? null,
				meta,
			},
		});

		// Log success to IntegrationMessage
		await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: toJsonValue({
					input,
					recordId: record.id,
				}),
			},
		});

		return record;
	});

	return {
		id: result.id,
		eventId: result.eventId,
		lotId: result.lotId,
		status: result.status,
		receivedAt: result.receivedAt.toISOString(),
		isDuplicate: false,
	};
};
