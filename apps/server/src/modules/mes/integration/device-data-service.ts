import { Prisma, TrackSource } from "@better-app/db";
import type { IntegrationSource, PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import type { deviceDataReceiveSchema } from "./device-data-schema";
import { parseDate, toJsonValue } from "./utils";

type ReceiveDeviceDataInput = Static<typeof deviceDataReceiveSchema>;
type DeviceDataItem = ReceiveDeviceDataInput["data"][number];
type DataCollectionSpecRecord = Prisma.DataCollectionSpecGetPayload<Record<string, never>>;

export type ReceiveDeviceDataResult = {
	id: string;
	eventId: string;
	trackId: string | null;
	carrierTrackId: string | null;
	dataValuesCreated: number;
	receivedAt: string;
	isDuplicate: boolean;
};

const SOURCE_SYSTEM = "DEVICE";
const ENTITY_TYPE = "DEVICE_DATA";

type SnapshotStep = {
	stepNo: number;
	operationId: string;
	dataSpecIds: string[];
};

const getSnapshotSteps = (snapshot: unknown): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];
	return record.steps
		.map((step) => {
			if (!step || typeof step !== "object") return null;
			const value = step as {
				stepNo?: unknown;
				operationId?: unknown;
				dataSpecIds?: unknown;
			};
			const stepNo = typeof value.stepNo === "number" ? value.stepNo : null;
			const operationId = typeof value.operationId === "string" ? value.operationId : null;
			const dataSpecIds = Array.isArray(value.dataSpecIds)
				? value.dataSpecIds.filter((id): id is string => typeof id === "string")
				: [];
			if (!stepNo || !operationId) return null;
			return { stepNo, operationId, dataSpecIds };
		})
		.filter((step): step is SnapshotStep => Boolean(step));
};

const resolveDataSpecs = async (
	db: PrismaClient,
	items: DeviceDataItem[],
	operationId: string | null,
	boundSpecIds: string[],
) => {
	const specIds = new Set<string>();
	const specNames = new Set<string>();

	for (const item of items) {
		if (item.specId) specIds.add(item.specId);
		else if (item.specName) specNames.add(item.specName);
		else throw new Error("specId or specName is required for each data item");
	}

	const specsById = new Map<string, DataCollectionSpecRecord>();
	const specsByName = new Map<string, DataCollectionSpecRecord>();

	if (specIds.size > 0) {
		const specs = await db.dataCollectionSpec.findMany({
			where: { id: { in: [...specIds] }, isActive: true },
		});
		for (const spec of specs) {
			specsById.set(spec.id, spec);
		}
		const missingIds = [...specIds].filter((id) => !specsById.has(id));
		if (missingIds.length > 0) {
			throw new Error(`Unknown data collection spec ids: ${missingIds.join(", ")}`);
		}
	}

	if (specNames.size > 0) {
		if (!operationId && boundSpecIds.length === 0) {
			throw new Error("operationId is required when specName is used without bound specs");
		}

		const where: Prisma.DataCollectionSpecWhereInput = {
			name: { in: [...specNames] },
			isActive: true,
		};

		if (boundSpecIds.length > 0) {
			where.id = { in: boundSpecIds };
		} else if (operationId) {
			where.operationId = operationId;
		}

		const specs = await db.dataCollectionSpec.findMany({ where });
		for (const spec of specs) {
			specsByName.set(spec.name, spec);
		}
		const missingNames = [...specNames].filter((name) => !specsByName.has(name));
		if (missingNames.length > 0) {
			throw new Error(`Unknown data collection spec names: ${missingNames.join(", ")}`);
		}
	}

	return { specsById, specsByName };
};

const validateDataValue = (spec: DataCollectionSpecRecord, item: DeviceDataItem) => {
	if (spec.dataType === "NUMBER" && item.valueNumber === undefined) {
		throw new Error(`Missing numeric value for ${spec.name}`);
	}
	if (spec.dataType === "TEXT" && item.valueText === undefined) {
		throw new Error(`Missing text value for ${spec.name}`);
	}
	if (spec.dataType === "BOOLEAN" && item.valueBoolean === undefined) {
		throw new Error(`Missing boolean value for ${spec.name}`);
	}
	if (spec.dataType === "JSON" && item.valueJson === undefined) {
		throw new Error(`Missing JSON value for ${spec.name}`);
	}
};

/**
 * Receives device data values (auto/manual) and persists DataValue records.
 * Uses IntegrationMessage dedupeKey for idempotency.
 */
export const receiveDeviceData = async (
	db: PrismaClient,
	input: ReceiveDeviceDataInput,
): Promise<ReceiveDeviceDataResult> => {
	const businessKey = `device-data:${input.eventId}`;
	const dedupeKey = `device-data:${input.eventId}`;

	const existing = await db.deviceDataRecord.findUnique({
		where: { eventId: input.eventId },
	});

	if (existing) {
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
			eventId: input.eventId,
			trackId: existing.trackId,
			carrierTrackId: existing.carrierTrackId,
			dataValuesCreated: existing.dataValuesCreated,
			receivedAt: existing.receivedAt.toISOString(),
			isDuplicate: true,
		};
	}

	if (input.source === "MANUAL" && !input.operatorId) {
		throw new Error("operatorId is required for MANUAL source");
	}

	if (!input.data || input.data.length === 0) {
		throw new Error("data array is required");
	}

	if (input.trackId && input.carrierTrackId) {
		throw new Error("Provide either trackId or carrierTrackId, not both");
	}

	let resolvedTrackId = input.trackId ?? null;
	let resolvedCarrierTrackId = input.carrierTrackId ?? null;
	let resolvedRunNo = input.runNo ?? null;
	let resolvedUnitSn = input.unitSn ?? null;
	let resolvedStationCode = input.stationCode ?? null;
	let resolvedOperationId = input.operationId ?? null;
	let boundSpecIds: string[] = [];
	let stepNo = input.stepNo ?? null;

	let runSnapshot: unknown = null;

	if (resolvedTrackId) {
		const track = await db.track.findUnique({
			where: { id: resolvedTrackId },
			include: {
				station: { select: { code: true } },
				unit: { include: { run: { include: { routeVersion: true } } } },
			},
		});
		if (!track) {
			throw new Error(`Track not found: ${resolvedTrackId}`);
		}
		stepNo = stepNo ?? track.stepNo;
		runSnapshot = track.unit.run?.routeVersion?.snapshotJson ?? null;
		resolvedRunNo = resolvedRunNo ?? track.unit.run?.runNo ?? null;
		resolvedUnitSn = resolvedUnitSn ?? track.unit.sn;
		resolvedStationCode = resolvedStationCode ?? track.station?.code ?? null;
	} else if (resolvedCarrierTrackId) {
		const carrierTrack = await db.carrierTrack.findUnique({
			where: { id: resolvedCarrierTrackId },
			include: { station: { select: { code: true } } },
		});
		if (!carrierTrack) {
			throw new Error(`Carrier track not found: ${resolvedCarrierTrackId}`);
		}
		stepNo = stepNo ?? carrierTrack.stepNo;
		resolvedStationCode = resolvedStationCode ?? carrierTrack.station?.code ?? null;
	} else {
		if (!input.runNo || !input.unitSn || !input.stationCode || !input.stepNo) {
			throw new Error(
				"trackId or carrierTrackId is required, or provide runNo/unitSn/stationCode/stepNo to resolve",
			);
		}
		const [run, station, unit] = await Promise.all([
			db.run.findUnique({
				where: { runNo: input.runNo },
				include: { routeVersion: true },
			}),
			db.station.findUnique({ where: { code: input.stationCode } }),
			db.unit.findUnique({ where: { sn: input.unitSn } }),
		]);
		if (!run) throw new Error(`Run not found: ${input.runNo}`);
		if (!station) throw new Error(`Station not found: ${input.stationCode}`);
		if (!unit) throw new Error(`Unit not found: ${input.unitSn}`);

		const track = await db.track.findFirst({
			where: {
				unitId: unit.id,
				stepNo: input.stepNo,
				stationId: station.id,
			},
			orderBy: { inAt: "desc" },
		});
		if (!track) {
			throw new Error(
				`Track not found for unit ${input.unitSn} at station ${input.stationCode} step ${input.stepNo}`,
			);
		}
		resolvedTrackId = track.id;
		resolvedRunNo = input.runNo;
		resolvedUnitSn = input.unitSn;
		resolvedStationCode = input.stationCode;
		stepNo = track.stepNo;
		runSnapshot = run.routeVersion?.snapshotJson ?? null;
	}

	if (!resolvedOperationId && runSnapshot && stepNo) {
		const steps = getSnapshotSteps(runSnapshot);
		const step = steps.find((item) => item.stepNo === stepNo);
		if (step) {
			resolvedOperationId = step.operationId;
			boundSpecIds = step.dataSpecIds ?? [];
		}
	}

	const { specsById, specsByName } = await resolveDataSpecs(
		db,
		input.data,
		resolvedOperationId,
		boundSpecIds,
	);

	const trackSource = input.source === "AUTO" ? TrackSource.AUTO : TrackSource.MANUAL;
	const eventTime = parseDate(input.eventTime) ?? new Date();
	const dataValues = input.data.map((item) => {
		const spec = item.specId ? specsById.get(item.specId) : specsByName.get(item.specName ?? "");
		if (!spec) {
			throw new Error("Data spec not found for item");
		}
		if (boundSpecIds.length > 0 && !boundSpecIds.includes(spec.id)) {
			throw new Error(`Spec ${spec.name} is not bound to step ${stepNo ?? ""}`);
		}
		if (input.source === "AUTO" && spec.method !== "AUTO") {
			throw new Error(`Spec ${spec.name} does not allow AUTO ingestion`);
		}
		validateDataValue(spec, item);
		const collectedAt = parseDate(item.collectedAt) ?? eventTime;

		return {
			specId: spec.id,
			trackId: resolvedTrackId,
			carrierTrackId: resolvedCarrierTrackId,
			collectedAt,
			valueNumber: spec.dataType === "NUMBER" ? item.valueNumber : null,
			valueText: spec.dataType === "TEXT" ? item.valueText : null,
			valueBoolean: spec.dataType === "BOOLEAN" ? item.valueBoolean : null,
			valueJson: spec.dataType === "JSON" ? (item.valueJson ?? null) : null,
			source: trackSource,
			meta: toJsonValue({
				eventId: input.eventId,
				equipmentId: input.equipmentId ?? null,
				operatorId: input.operatorId ?? null,
				source: input.source as IntegrationSource,
			}),
		};
	});

	let record;
	try {
		record = await db.$transaction(async (tx: Prisma.TransactionClient) => {
			const created = await tx.deviceDataRecord.create({
				data: {
					eventId: input.eventId,
					eventTime,
					source: input.source as IntegrationSource,
					runNo: resolvedRunNo,
					unitSn: resolvedUnitSn,
					stationCode: resolvedStationCode,
					stepNo,
					trackId: resolvedTrackId,
					carrierTrackId: resolvedCarrierTrackId,
					operationId: resolvedOperationId,
					equipmentId: input.equipmentId ?? null,
					operatorId: input.operatorId ?? null,
					data: toJsonValue(input.data),
					meta: input.meta === undefined ? undefined : toJsonValue(input.meta),
					dataValuesCreated: dataValues.length,
				},
			});

			if (dataValues.length > 0) {
				await tx.dataValue.createMany({ data: dataValues });
			}

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
						recordId: created.id,
						trackId: resolvedTrackId,
						carrierTrackId: resolvedCarrierTrackId,
						dataValuesCreated: dataValues.length,
					}),
				},
			});

			return created;
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			const existingRecord = await db.deviceDataRecord.findUnique({
				where: { eventId: input.eventId },
			});
			if (existingRecord) {
				await db.integrationMessage.create({
					data: {
						direction: "IN",
						system: SOURCE_SYSTEM,
						entityType: ENTITY_TYPE,
						businessKey,
						dedupeKey,
						status: "DUPLICATE",
						payload: toJsonValue({ input, existingId: existingRecord.id }),
					},
				});

				return {
					id: existingRecord.id,
					eventId: input.eventId,
					trackId: existingRecord.trackId,
					carrierTrackId: existingRecord.carrierTrackId,
					dataValuesCreated: existingRecord.dataValuesCreated,
					receivedAt: existingRecord.receivedAt.toISOString(),
					isDuplicate: true,
				};
			}
		}
		throw error;
	}

	return {
		id: record.id,
		eventId: input.eventId,
		trackId: record.trackId,
		carrierTrackId: record.carrierTrackId,
		dataValuesCreated: dataValues.length,
		receivedAt: record.receivedAt.toISOString(),
		isDuplicate: false,
	};
};
