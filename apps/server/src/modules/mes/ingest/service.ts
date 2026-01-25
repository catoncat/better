import { IngestEventType, Prisma, type PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

type IngestResultMapping = {
	path: string;
	passValues?: string[];
	failValues?: string[];
};

type IngestMeasurementMapping = {
	itemsPath: string;
	namePath: string;
	valuePath: string;
	unitPath?: string;
	judgePath?: string;
};

type IngestBatchPolicy = "ALL_OR_NOTHING" | "PARTIAL";

type IngestMapping = {
	eventType?: string;
	occurredAtPath?: string;
	stationCodePath?: string;
	lineCodePath?: string;
	snPath?: string;
	snListPath?: string;
	carrierCodePath?: string;
	batchPolicy?: IngestBatchPolicy;
	testResultIdPath?: string;
	result?: IngestResultMapping;
	measurements?: IngestMeasurementMapping;
	dataSpecMap?: Record<string, string>;
};

type NormalizedIngest = {
	occurredAt?: string | null;
	stationCode?: string | null;
	lineCode?: string | null;
	sn?: string | null;
	snList?: string[] | null;
	carrierCode?: string | null;
	result?: string | null;
	testResultId?: string | null;
	measurements?: Array<{
		name: string;
		value: Prisma.JsonValue;
		unit?: string | null;
		judge?: string | null;
	}> | null;
	dataSpecMap?: Record<string, string> | null;
};

export type CreateIngestEventInput = {
	dedupeKey: string;
	sourceSystem: string;
	eventType: IngestEventType;
	occurredAt: string;
	runNo?: string | null;
	payload: Prisma.InputJsonValue;
	meta?: Prisma.InputJsonValue | null;
};

type CreateIngestEventResult = {
	eventId: string;
	duplicate: boolean;
	status: "RECEIVED";
};

type SnapshotStep = {
	stepNo: number;
	operationId: string;
	stationType?: string;
	stationGroupId?: string | null;
	allowedStationIds?: string[];
	requiresFAI?: boolean;
	requiresAuthorization?: boolean;
	dataSpecIds?: string[];
	ingestMapping?: Prisma.JsonValue | null;
};

type RunWithRouteVersion = Prisma.RunGetPayload<{
	include: { routeVersion: true };
}>;

type UnitWithRunRouteVersion = Prisma.UnitGetPayload<{
	include: { run: { include: { routeVersion: true } } };
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const parseDate = (value: string) => {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const asString = (value: unknown) => {
	if (value === null || value === undefined) return null;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return null;
};

const toOptionalString = (value: string | null | undefined) =>
	value === null || value === undefined ? undefined : value;

const toStringArray = (value: unknown) => {
	if (Array.isArray(value)) {
		return value.map(asString).filter((item): item is string => !!item);
	}
	const single = asString(value);
	return single ? [single] : [];
};

const resolveSegments = (value: unknown, segments: string[]): unknown => {
	if (segments.length === 0) return value;
	if (value === null || value === undefined) return undefined;

	const head = segments[0];
	if (!head) return undefined;
	const tail = segments.slice(1);
	const arrayMatch = head.match(/^(.*)\[\*\]$/);
	if (arrayMatch) {
		const key = arrayMatch[1];
		const target = key ? (isRecord(value) ? value[key] : undefined) : value;
		if (!Array.isArray(target)) return [];
		const results = target.map((item) => resolveSegments(item, tail));
		return results
			.flatMap((item) => (Array.isArray(item) ? item : [item]))
			.filter((item) => item !== undefined);
	}

	if (!isRecord(value)) return undefined;
	return resolveSegments(value[head], tail);
};

const resolvePath = (value: unknown, path?: string | null) => {
	if (!path) return undefined;
	const segments = path.split(".").filter(Boolean);
	if (segments.length === 0) return undefined;
	return resolveSegments(value, segments);
};

const parseSnapshotSteps = (snapshot: Prisma.JsonValue | null | undefined): SnapshotStep[] => {
	if (!snapshot || typeof snapshot !== "object") return [];
	const record = snapshot as { steps?: unknown };
	if (!Array.isArray(record.steps)) return [];

	return record.steps
		.map((step) => {
			if (!step || typeof step !== "object") return null;
			const value = step as {
				stepNo?: unknown;
				operationId?: unknown;
				stationType?: unknown;
				stationGroupId?: unknown;
				allowedStationIds?: unknown;
				requiresFAI?: unknown;
				requiresAuthorization?: unknown;
				dataSpecIds?: unknown;
				ingestMapping?: unknown;
			};

			if (typeof value.stepNo !== "number") return null;
			if (typeof value.operationId !== "string") return null;

			return {
				stepNo: value.stepNo,
				operationId: value.operationId,
				stationType: typeof value.stationType === "string" ? value.stationType : undefined,
				stationGroupId:
					value.stationGroupId === null || typeof value.stationGroupId === "string"
						? value.stationGroupId
						: undefined,
				allowedStationIds: Array.isArray(value.allowedStationIds)
					? value.allowedStationIds.filter((id): id is string => typeof id === "string")
					: undefined,
				requiresFAI: typeof value.requiresFAI === "boolean" ? value.requiresFAI : undefined,
				requiresAuthorization:
					typeof value.requiresAuthorization === "boolean"
						? value.requiresAuthorization
						: undefined,
				dataSpecIds: Array.isArray(value.dataSpecIds)
					? value.dataSpecIds.filter((id): id is string => typeof id === "string")
					: undefined,
				ingestMapping:
					value.ingestMapping && typeof value.ingestMapping === "object"
						? (value.ingestMapping as Prisma.JsonValue)
						: null,
			};
		})
		.filter((step): step is SnapshotStep => Boolean(step));
};

const toIngestMapping = (value: Prisma.JsonValue | null | undefined): IngestMapping | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as IngestMapping;
};

const resolveIngestMapping = (
	snapshot: Prisma.JsonValue | null | undefined,
	eventType: IngestEventType,
): IngestMapping | null => {
	const steps = parseSnapshotSteps(snapshot);
	const candidates = steps.filter((step) => step.stationType === eventType && step.ingestMapping);
	const candidate = candidates[0];
	if (!candidate) return null;
	const mapping = toIngestMapping(candidate.ingestMapping ?? null);
	if (!mapping) return null;
	if (mapping.eventType && mapping.eventType !== eventType) return null;
	return mapping;
};

const normalizeResult = (value: unknown, mapping: IngestResultMapping | undefined) => {
	const raw = asString(value);
	if (!raw) return null;
	if (!mapping) return raw;
	const upper = raw.toUpperCase();
	if (mapping.passValues?.some((item) => item.toUpperCase() === upper)) return "PASS";
	if (mapping.failValues?.some((item) => item.toUpperCase() === upper)) return "FAIL";
	return raw;
};

const normalizeMeasurements = (
	payload: Prisma.InputJsonValue,
	mapping: IngestMeasurementMapping | undefined,
): NormalizedIngest["measurements"] => {
	if (!mapping) return undefined;
	const items = resolvePath(payload, mapping.itemsPath);
	if (!Array.isArray(items)) return [];

	return items
		.map((item) => {
			if (!isRecord(item)) return null;
			const name = asString(resolvePath(item, mapping.namePath));
			if (!name) return null;
			const value = resolvePath(item, mapping.valuePath) as Prisma.JsonValue;
			const unit = mapping.unitPath ? asString(resolvePath(item, mapping.unitPath)) : null;
			const judge = mapping.judgePath ? asString(resolvePath(item, mapping.judgePath)) : null;
			return { name, value, unit, judge };
		})
		.filter((item): item is NonNullable<typeof item> => !!item);
};

const normalizePayload = (
	payload: Prisma.InputJsonValue,
	mapping: IngestMapping,
): NormalizedIngest => {
	const occurredAt = asString(resolvePath(payload, mapping.occurredAtPath));
	const stationCode = asString(resolvePath(payload, mapping.stationCodePath));
	const lineCode = asString(resolvePath(payload, mapping.lineCodePath));
	const snValue = resolvePath(payload, mapping.snPath);
	const sn = asString(snValue);
	const snListFromSnPath = Array.isArray(snValue) ? toStringArray(snValue) : [];
	const snList = mapping.snListPath
		? toStringArray(resolvePath(payload, mapping.snListPath))
		: snListFromSnPath;
	const carrierCode = asString(resolvePath(payload, mapping.carrierCodePath));
	const testResultId = asString(resolvePath(payload, mapping.testResultIdPath));
	const resultValue = mapping.result ? resolvePath(payload, mapping.result.path) : undefined;
	const result = normalizeResult(resultValue, mapping.result);
	const measurements = normalizeMeasurements(payload, mapping.measurements);

	return {
		occurredAt,
		stationCode,
		lineCode,
		sn,
		snList: snList.length > 0 ? snList : null,
		carrierCode,
		result,
		testResultId,
		measurements: measurements && measurements.length > 0 ? measurements : null,
		dataSpecMap: mapping.dataSpecMap ?? null,
	};
};

const buildNormalizedJson = (normalized: NormalizedIngest): Prisma.InputJsonValue => {
	const record: Record<string, Prisma.InputJsonValue> = {};
	if (normalized.occurredAt) record.occurredAt = normalized.occurredAt;
	if (normalized.stationCode) record.stationCode = normalized.stationCode;
	if (normalized.lineCode) record.lineCode = normalized.lineCode;
	if (normalized.sn) record.sn = normalized.sn;
	if (normalized.snList) record.snList = normalized.snList;
	if (normalized.carrierCode) record.carrierCode = normalized.carrierCode;
	if (normalized.result) record.result = normalized.result;
	if (normalized.testResultId) record.testResultId = normalized.testResultId;
	if (normalized.measurements) record.measurements = normalized.measurements;
	if (normalized.dataSpecMap) record.dataSpecMap = normalized.dataSpecMap;
	return record;
};

const extractFallbackSn = (payload: Prisma.InputJsonValue) => {
	if (!isRecord(payload)) return { sn: null, snList: [] as string[] };
	const record = payload as Record<string, unknown>;
	const sn = asString(record.sn);
	const snList = toStringArray(record.snList);
	return { sn, snList };
};

const resolveRunFromSn = async (
	db: PrismaClient,
	sn: string,
): Promise<
	ServiceResult<{
		run: {
			id: string;
			runNo: string | null;
			routeVersionId: string | null;
			snapshot: Prisma.JsonValue | null;
		};
		unitId: string;
	}>
> => {
	const unit = (await db.unit.findUnique({
		where: { sn },
		include: { run: { include: { routeVersion: true } } },
	})) as UnitWithRunRouteVersion | null;

	if (!unit || !unit.run) {
		return {
			success: false,
			code: "UNIT_RUN_NOT_FOUND",
			message: "Unit run not found",
			status: 404,
		};
	}

	return {
		success: true,
		data: {
			unitId: unit.id,
			run: {
				id: unit.run.id,
				runNo: unit.run.runNo ?? null,
				routeVersionId: unit.run.routeVersionId ?? null,
				snapshot: unit.run.routeVersion?.snapshotJson ?? null,
			},
		},
	};
};

const resolveRunFromSnList = async (
	db: PrismaClient,
	snList: string[],
): Promise<
	ServiceResult<{
		run: {
			id: string;
			runNo: string | null;
			routeVersionId: string | null;
			snapshot: Prisma.JsonValue | null;
		};
	}>
> => {
	const units = await db.unit.findMany({
		where: { sn: { in: snList } },
		select: { id: true, runId: true },
	});

	if (units.length !== snList.length || units.some((unit) => !unit.runId)) {
		return {
			success: false,
			code: "UNIT_RUN_NOT_FOUND",
			message: "Unit run not found",
			status: 404,
		};
	}

	const runIds = new Set(
		units.map((unit) => unit.runId).filter((runId): runId is string => !!runId),
	);
	if (runIds.size !== 1) {
		return {
			success: false,
			code: "RUN_MISMATCH",
			message: "Units do not belong to the same run",
			status: 400,
		};
	}

	const runId = Array.from(runIds)[0];
	if (!runId) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}
	const run = (await db.run.findUnique({
		where: { id: runId },
		include: { routeVersion: true },
	})) as RunWithRouteVersion | null;

	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	return {
		success: true,
		data: {
			run: {
				id: run.id,
				runNo: run.runNo ?? null,
				routeVersionId: run.routeVersionId ?? null,
				snapshot: run.routeVersion?.snapshotJson ?? null,
			},
		},
	};
};

const validateNormalized = (eventType: IngestEventType, normalized: NormalizedIngest) => {
	if (eventType === IngestEventType.BATCH) {
		if (!normalized.carrierCode) return false;
		if (!normalized.snList || normalized.snList.length === 0) return false;
		return true;
	}

	if (!normalized.sn) return false;
	if (!normalized.stationCode) return false;
	if (!normalized.result) return false;

	if (eventType === IngestEventType.TEST && !normalized.testResultId) return false;
	return true;
};

export const createIngestEvent = async (
	db: PrismaClient,
	input: CreateIngestEventInput,
): Promise<ServiceResult<CreateIngestEventResult>> => {
	const occurredAt = parseDate(input.occurredAt);
	if (!occurredAt) {
		return {
			success: false,
			code: "INGEST_PAYLOAD_INVALID",
			message: "occurredAt is invalid",
			status: 400,
		};
	}

	if (input.payload === null) {
		return {
			success: false,
			code: "INGEST_PAYLOAD_INVALID",
			message: "payload is required",
			status: 400,
		};
	}

	const payload = input.payload;

	let resolvedRun: {
		id: string;
		runNo: string | null;
		routeVersionId: string | null;
		snapshot: Prisma.JsonValue | null;
	} | null = null;
	let unitId: string | null = null;

	if (input.runNo) {
		const run = (await db.run.findUnique({
			where: { runNo: input.runNo },
			include: { routeVersion: true },
		})) as RunWithRouteVersion | null;
		if (!run) {
			return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
		}
		resolvedRun = {
			id: run.id,
			runNo: run.runNo ?? null,
			routeVersionId: run.routeVersionId ?? null,
			snapshot: run.routeVersion?.snapshotJson ?? null,
		};
	} else {
		const fallback = extractFallbackSn(payload);
		if (fallback.sn) {
			const resolved = await resolveRunFromSn(db, fallback.sn);
			if (!resolved.success) return resolved;
			resolvedRun = resolved.data.run;
			unitId = resolved.data.unitId;
		} else if (fallback.snList.length > 0) {
			const resolved = await resolveRunFromSnList(db, fallback.snList);
			if (!resolved.success) return resolved;
			resolvedRun = resolved.data.run;
		} else {
			return {
				success: false,
				code: "UNIT_RUN_NOT_FOUND",
				message: "Unit run not found",
				status: 404,
			};
		}
	}

	const mapping = resolveIngestMapping(resolvedRun?.snapshot ?? null, input.eventType);
	if (!mapping) {
		return {
			success: false,
			code: "INGEST_MAPPING_MISSING",
			message: "Ingest mapping not found",
			status: 400,
		};
	}

	const normalized = normalizePayload(payload, mapping);
	if (!validateNormalized(input.eventType, normalized)) {
		return {
			success: false,
			code: "INGEST_PAYLOAD_INVALID",
			message: "Payload missing required fields",
			status: 400,
		};
	}

	const runNo = toOptionalString(resolvedRun?.runNo ?? input.runNo);

	if (!unitId && normalized.sn) {
		const unit = await db.unit.findUnique({ where: { sn: normalized.sn } });
		if (unit?.runId === resolvedRun?.id) {
			unitId = unit.id;
		}
	}

	return await db.$transaction(async (tx) => {
		const existing = await tx.ingestEvent.findUnique({
			where: {
				sourceSystem_dedupeKey: { sourceSystem: input.sourceSystem, dedupeKey: input.dedupeKey },
			},
			select: { id: true },
		});

		if (existing) {
			return {
				success: true,
				data: { eventId: existing.id, duplicate: true, status: "RECEIVED" },
			};
		}

		try {
			const created = await tx.ingestEvent.create({
				data: {
					sourceSystem: input.sourceSystem,
					dedupeKey: input.dedupeKey,
					eventType: input.eventType,
					occurredAt,
					runId: resolvedRun?.id ?? null,
					runNo,
					unitId,
					stationCode: normalized.stationCode ?? null,
					lineCode: normalized.lineCode ?? null,
					carrierCode: normalized.carrierCode ?? null,
					sn: normalized.sn ?? null,
					snList: normalized.snList ?? undefined,
					result: normalized.result ?? null,
					testResultId: normalized.testResultId ?? null,
					payload,
					normalized: buildNormalizedJson(normalized),
					meta: input.meta ?? undefined,
				},
				select: { id: true },
			});

			return {
				success: true,
				data: { eventId: created.id, duplicate: false, status: "RECEIVED" },
			};
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				const duplicate = await tx.ingestEvent.findUnique({
					where: {
						sourceSystem_dedupeKey: {
							sourceSystem: input.sourceSystem,
							dedupeKey: input.dedupeKey,
						},
					},
					select: { id: true },
				});
				if (duplicate) {
					return {
						success: true,
						data: { eventId: duplicate.id, duplicate: true, status: "RECEIVED" },
					};
				}
			}
			throw error;
		}
	});
};
