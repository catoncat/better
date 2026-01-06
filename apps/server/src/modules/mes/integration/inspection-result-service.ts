import type {
	InspectionResultStatus,
	InspectionResultType,
	IntegrationSource,
	Prisma,
	PrismaClient,
} from "@better-app/db";
import type { Static } from "elysia";
import type { inspectionResultReceiveSchema } from "./inspection-result-schema";
import { toJsonValue } from "./utils";

type ReceiveInspectionResultInput = Static<typeof inspectionResultReceiveSchema>;

export type ReceiveInspectionResultResult = {
	id: string;
	eventId: string;
	runNo: string;
	unitSn: string;
	inspectionType: string;
	result: string;
	trackId: string | null;
	defectsCreated: number;
	receivedAt: string;
	isDuplicate: boolean;
};

const SOURCE_SYSTEM = "SCADA";
const ENTITY_TYPE = "INSPECTION_RESULT";

/**
 * Receives SPI/AOI inspection results from SCADA system (or manual entry).
 * Uses eventId for idempotency - returns existing record if already received.
 * Creates Defect records for FAIL results.
 * Logs to IntegrationMessage for audit trail.
 */
export const receiveInspectionResult = async (
	db: PrismaClient,
	input: ReceiveInspectionResultInput,
): Promise<ReceiveInspectionResultResult> => {
	const businessKey = `inspection:${input.runNo}:${input.unitSn}:${input.eventId}`;
	const dedupeKey = `inspection-result:${input.eventId}`;

	// 1. Idempotency check
	const existing = await db.inspectionResultRecord.findUnique({
		where: { eventId: input.eventId },
	});

	if (existing) {
		// Log duplicate attempt
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: SOURCE_SYSTEM,
				entityType: ENTITY_TYPE,
				businessKey,
				dedupeKey,
				status: "DUPLICATE",
				payload: toJsonValue({ input, existingId: existing.id }),
			},
		});

		return {
			id: existing.id,
			eventId: existing.eventId,
			runNo: existing.runNo,
			unitSn: existing.unitSn,
			inspectionType: existing.inspectionType,
			result: existing.result,
			trackId: existing.trackId,
			defectsCreated: Array.isArray(existing.defectIds) ? existing.defectIds.length : 0,
			receivedAt: existing.receivedAt.toISOString(),
			isDuplicate: true,
		};
	}

	// 2. Business validation
	if (input.source === "MANUAL" && !input.operatorId) {
		throw new Error("operatorId is required for MANUAL source");
	}

	if (input.result === "FAIL" && (!input.defects || input.defects.length === 0)) {
		throw new Error("defects array is required when result is FAIL");
	}

	// 3. Resolve Track (optional - auto-find if not provided)
	let resolvedTrackId: string | null = input.trackId ?? null;

	if (!resolvedTrackId) {
		// Try to find matching Track by runNo + stationCode + unitSn + stepNo
		const run = await db.run.findUnique({ where: { runNo: input.runNo } });
		if (!run) {
			throw new Error(`Run not found: ${input.runNo}`);
		}

		const station = await db.station.findUnique({ where: { code: input.stationCode } });
		if (!station) {
			throw new Error(`Station not found: ${input.stationCode}`);
		}

		const unit = await db.unit.findUnique({ where: { sn: input.unitSn } });
		if (!unit) {
			throw new Error(`Unit not found: ${input.unitSn}`);
		}

		// Find the most recent track for this unit at this station/step
		const track = await db.track.findFirst({
			where: {
				unitId: unit.id,
				stepNo: input.stepNo,
				stationId: station.id,
			},
			orderBy: { inAt: "desc" },
		});

		if (track) {
			resolvedTrackId = track.id;
		}
		// Note: trackId can remain null - inspection results can be received without a matching track
	} else {
		// Validate provided trackId exists
		const track = await db.track.findUnique({ where: { id: resolvedTrackId } });
		if (!track) {
			throw new Error(`Track not found: ${resolvedTrackId}`);
		}
	}

	// 4. Transaction: create record + defects (for FAIL)
	const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
		const defectIds: string[] = [];

		// Create Defects for FAIL result
		if (input.result === "FAIL" && input.defects && input.defects.length > 0) {
			const unit = await tx.unit.findUnique({ where: { sn: input.unitSn } });
			if (!unit) {
				throw new Error(`Unit not found: ${input.unitSn}`);
			}

			for (const defectItem of input.defects) {
				const defect = await tx.defect.create({
					data: {
						unitId: unit.id,
						trackId: resolvedTrackId,
						code: defectItem.code,
						location: defectItem.location ?? null,
						qty: defectItem.qty ?? 1,
						status: "RECORDED",
						meta: toJsonValue({
							source: input.source,
							inspectionType: input.inspectionType,
							eventId: input.eventId,
							description: defectItem.description,
							equipmentId: input.equipmentId,
						}),
					},
				});
				defectIds.push(defect.id);
			}
		}

		// Create InspectionResultRecord
		const record = await tx.inspectionResultRecord.create({
			data: {
				eventId: input.eventId,
				eventTime: new Date(input.eventTime),
				runNo: input.runNo,
				stationCode: input.stationCode,
				unitSn: input.unitSn,
				stepNo: input.stepNo,
				inspectionType: input.inspectionType as InspectionResultType,
				result: input.result as InspectionResultStatus,
				defects: input.defects ? toJsonValue(input.defects) : undefined,
				rawData: input.rawData ? toJsonValue(input.rawData) : undefined,
				source: input.source as IntegrationSource,
				equipmentId: input.equipmentId ?? null,
				operatorId: input.operatorId ?? null,
				trackId: resolvedTrackId,
				defectIds: defectIds.length > 0 ? toJsonValue(defectIds) : undefined,
				meta: input.meta ? toJsonValue(input.meta) : undefined,
			},
		});

		// Log success to IntegrationMessage
		await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: SOURCE_SYSTEM,
				entityType: ENTITY_TYPE,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: toJsonValue({
					input,
					recordId: record.id,
					trackId: resolvedTrackId,
					defectsCreated: defectIds.length,
				}),
			},
		});

		return { record, defectIds };
	});

	return {
		id: result.record.id,
		eventId: result.record.eventId,
		runNo: result.record.runNo,
		unitSn: result.record.unitSn,
		inspectionType: result.record.inspectionType,
		result: result.record.result,
		trackId: result.record.trackId,
		defectsCreated: result.defectIds.length,
		receivedAt: result.record.receivedAt.toISOString(),
		isDuplicate: false,
	};
};
