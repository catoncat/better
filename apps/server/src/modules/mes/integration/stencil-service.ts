import type { IntegrationSource, Prisma, PrismaClient, StencilStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { stencilStatusReceiveSchema } from "./loading-schema";
import { parseDate, toJsonValue } from "./utils";

type ReceiveStencilStatusInput = Static<typeof stencilStatusReceiveSchema>;

export type ReceiveStencilStatusResult = {
	id: string;
	eventId: string;
	stencilId: string;
	status: string;
	receivedAt: string;
	isDuplicate: boolean;
};

/**
 * Receives stencil status from TPM system (or manual entry).
 * Uses eventId for idempotency - returns existing record if already received.
 * Logs to IntegrationMessage for audit trail.
 */
export const receiveStencilStatus = async (
	db: PrismaClient,
	input: ReceiveStencilStatusInput,
): Promise<ReceiveStencilStatusResult> => {
	const sourceSystem = "TPM";
	const entityType = "STENCIL_STATUS";
	const businessKey = `stencil:${input.stencilId}:${input.eventId}`;
	const dedupeKey = `stencil-status:${input.eventId}`;

	// Check for existing event (idempotency)
	const existing = await db.stencilStatusRecord.findUnique({
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
			stencilId: existing.stencilId,
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
		const record = await tx.stencilStatusRecord.create({
			data: {
				eventId: input.eventId,
				eventTime: new Date(input.eventTime),
				stencilId: input.stencilId,
				version: input.version ?? null,
				status: input.status as StencilStatus,
				tensionValue: input.tensionValue ?? null,
				lastCleanedAt: parseDate(input.lastCleanedAt),
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
		stencilId: result.stencilId,
		status: result.status,
		receivedAt: result.receivedAt.toISOString(),
		isDuplicate: false,
	};
};
