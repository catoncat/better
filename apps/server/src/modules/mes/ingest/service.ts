import {
	IngestEventType,
	Prisma,
	type PrismaClient,
	RunStatus,
	TrackResult,
	TrackSource,
	UnitStatus,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { checkAndTriggerOqc } from "../oqc/trigger-service";

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

type DataCollectionSpecRecord = Prisma.DataCollectionSpecGetPayload<Record<string, never>>;

type IngestExecutionWrite = {
	trackId: string;
	dataValueCount: number;
	unitStatus: UnitStatus;
};

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
		.filter((step): step is SnapshotStep => step !== null);
};

const toIngestMapping = (value: Prisma.JsonValue | null | undefined): IngestMapping | null => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as IngestMapping;
};

const resolveIngestMapping = (
	snapshot: Prisma.JsonValue | null | undefined,
	eventType: IngestEventType,
): IngestMapping | null => {
	const steps = getResolvedSnapshotSteps(snapshot).filter(
		(step) => step.stationType === eventType && step.ingestMapping,
	);
	const candidate = steps[0];
	if (!candidate) return null;
	const mapping = candidate.ingestMapping;
	if (!mapping) return null;
	if (mapping.eventType && mapping.eventType !== eventType) return null;
	return mapping;
};

type ResolvedSnapshotStep = {
	stepNo: number;
	operationId: string;
	stationType: string;
	stationGroupId: string | null;
	allowedStationIds: string[];
	requiresFAI: boolean;
	requiresAuthorization: boolean;
	dataSpecIds: string[];
	ingestMapping: IngestMapping;
};

const isValidStationForStep = (
	step: { stationGroupId: string | null; stationType: string; allowedStationIds?: string[] },
	station: { id: string; groupId: string | null; stationType: string },
) => {
	if (step.stationType !== station.stationType) {
		return false;
	}
	if (step.allowedStationIds && step.allowedStationIds.length > 0) {
		if (!step.allowedStationIds.includes(station.id)) return false;
	}
	if (step.stationGroupId && step.stationGroupId !== station.groupId) {
		return false;
	}
	return true;
};

const resolveIngestStep = (
	steps: ResolvedSnapshotStep[],
	input: { eventType: IngestEventType; stationCode?: string | null },
	station: { id: string; stationType: string; groupId: string | null } | null,
	unit: { currentStepNo: number } | null,
): ResolvedSnapshotStep | null => {
	const candidates = steps.filter((step) => step.stationType === input.eventType);
	if (candidates.length === 0) return null;

	const eligible = station
		? candidates.filter((step) => isValidStationForStep(step, station))
		: candidates;
	if (eligible.length === 0) return null;

	if (unit) {
		const current = eligible.find((step) => step.stepNo === unit.currentStepNo);
		if (current) return current;
		return null;
	}

	if (eligible.length === 1) return eligible[0] ?? null;
	return null;
};

const resolveStepDataSpecs = async (db: Prisma.TransactionClient, step: ResolvedSnapshotStep) => {
	if (!step.dataSpecIds || step.dataSpecIds.length === 0) return [];
	const specs = await db.dataCollectionSpec.findMany({
		where: { id: { in: step.dataSpecIds }, isActive: true },
	});
	if (specs.length !== step.dataSpecIds.length) {
		return null;
	}
	return specs;
};

const buildIngestDataItems = (
	normalized: NormalizedIngest,
	activeSpecs: DataCollectionSpecRecord[],
): Array<{
	specName: string;
	valueNumber?: number;
	valueText?: string;
	valueBoolean?: boolean;
	valueJson?: Prisma.InputJsonValue;
	judge?: string | null;
}> => {
	const map = normalized.dataSpecMap ?? {};
	const byName = new Map((normalized.measurements ?? []).map((m) => [m.name, m]));
	const items: Array<{
		specName: string;
		valueNumber?: number;
		valueText?: string;
		valueBoolean?: boolean;
		valueJson?: Prisma.InputJsonValue;
		judge?: string | null;
	}> = [];

	for (const spec of activeSpecs) {
		const measurementKey = Object.keys(map).find((k) => map[k] === spec.name) ?? spec.name;
		const measurement = byName.get(measurementKey);
		if (!measurement) continue;

		const value = measurement.value;
		const base = { specName: spec.name, judge: measurement.judge ?? null };
		if (spec.dataType === "NUMBER") {
			items.push({ ...base, valueNumber: typeof value === "number" ? value : Number(value) });
		} else if (spec.dataType === "TEXT") {
			items.push({ ...base, valueText: typeof value === "string" ? value : JSON.stringify(value) });
		} else if (spec.dataType === "BOOLEAN") {
			items.push({ ...base, valueBoolean: Boolean(value) });
		} else {
			items.push({ ...base, valueJson: value as Prisma.InputJsonValue });
		}
	}

	return items;
};

const validateRequiredData = (
	result: TrackResult,
	dataItems: Array<{ specName: string }>,
	activeSpecs: DataCollectionSpecRecord[],
) => {
	if (result !== TrackResult.PASS) return true;
	const requiredNames = activeSpecs.filter((spec) => spec.isRequired).map((spec) => spec.name);
	const present = new Set(dataItems.map((item) => item.specName));
	return requiredNames.every((name) => present.has(name));
};

const resolveNextStepNo = (steps: ResolvedSnapshotStep[], currentStepNo: number) => {
	const sorted = [...steps].sort((a, b) => a.stepNo - b.stepNo);
	const next = sorted.find((s) => s.stepNo > currentStepNo);
	return next?.stepNo ?? null;
};

const persistAutoTrackOut = async (
	tx: Prisma.TransactionClient,
	ctx: {
		stationId: string;
		stepNo: number;
		operationId: string;
		occurredAt: Date;
		result: TrackResult;
		source: TrackSource;
		unit: { id: string; currentStepNo: number };
		routeSteps: ResolvedSnapshotStep[];
		dataItems: Array<{
			specName: string;
			valueNumber?: number;
			valueText?: string;
			valueBoolean?: boolean;
			valueJson?: Prisma.InputJsonValue;
			judge?: string | null;
		}>;
		activeSpecs: DataCollectionSpecRecord[];
	},
): Promise<IngestExecutionWrite> => {
	const now = ctx.occurredAt;

	const track = await tx.track.create({
		data: {
			unitId: ctx.unit.id,
			stepNo: ctx.stepNo,
			stationId: ctx.stationId,
			source: ctx.source,
			inAt: now,
			outAt: now,
			result: ctx.result,
		},
	});

	let dataValueCount = 0;
	if (ctx.dataItems.length > 0) {
		const specsByName = new Map(ctx.activeSpecs.map((spec) => [spec.name, spec]));
		await tx.dataValue.createMany({
			data: ctx.dataItems.map((item) => {
				const spec = specsByName.get(item.specName);
				if (!spec) {
					throw new Error(`Data spec not found: ${item.specName}`);
				}
				dataValueCount += 1;

				return {
					specId: spec.id,
					trackId: track.id,
					collectedAt: now,
					valueNumber: spec.dataType === "NUMBER" ? (item.valueNumber ?? null) : null,
					valueText: spec.dataType === "TEXT" ? (item.valueText ?? null) : null,
					valueBoolean: spec.dataType === "BOOLEAN" ? (item.valueBoolean ?? null) : null,
					...(spec.dataType === "JSON"
						? { valueJson: item.valueJson ?? Prisma.JsonNull }
						: { valueJson: undefined }),
					judge: item.judge ?? null,
					source: ctx.source,
				};
			}),
		});
	}

	let nextUnitStatus: UnitStatus;
	if (ctx.result === TrackResult.PASS) {
		const nextStepNo = resolveNextStepNo(ctx.routeSteps, ctx.unit.currentStepNo);
		if (!nextStepNo) {
			nextUnitStatus = UnitStatus.DONE;
			await tx.unit.update({ where: { id: ctx.unit.id }, data: { status: UnitStatus.DONE } });
		} else {
			nextUnitStatus = UnitStatus.QUEUED;
			await tx.unit.update({
				where: { id: ctx.unit.id },
				data: { status: UnitStatus.QUEUED, currentStepNo: nextStepNo },
			});
		}
	} else {
		nextUnitStatus = UnitStatus.OUT_FAILED;
		await tx.unit.update({ where: { id: ctx.unit.id }, data: { status: UnitStatus.OUT_FAILED } });
	}

	return { trackId: track.id, dataValueCount, unitStatus: nextUnitStatus };
};

const getResolvedSnapshotSteps = (
	snapshot: Prisma.JsonValue | null | undefined,
): ResolvedSnapshotStep[] => {
	const rawSteps = parseSnapshotSteps(snapshot);
	return rawSteps
		.map((step) => {
			const stepNo = step.stepNo;
			const operationId = step.operationId;
			const stationType = step.stationType;
			const ingestMapping = toIngestMapping(step.ingestMapping ?? null);

			if (!stationType || !ingestMapping) {
				return null;
			}
			if (ingestMapping.eventType && ingestMapping.eventType !== stationType) {
				return null;
			}

			return {
				stepNo,
				operationId,
				stationType,
				stationGroupId: step.stationGroupId ?? null,
				allowedStationIds: step.allowedStationIds ?? [],
				requiresFAI: step.requiresFAI ?? false,
				requiresAuthorization: step.requiresAuthorization ?? false,
				dataSpecIds: step.dataSpecIds ?? [],
				ingestMapping,
			} satisfies ResolvedSnapshotStep;
		})
		.filter((step): step is ResolvedSnapshotStep => step !== null);
};

const hasStationConstraints = (step: {
	stationGroupId: string | null;
	allowedStationIds: string[];
}) => Boolean(step.stationGroupId) || step.allowedStationIds.length > 0;

const areSameStringSet = (left: string[], right: string[]) => {
	if (left.length !== right.length) return false;
	const counts = new Map<string, number>();
	for (const value of left) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	for (const value of right) {
		const next = (counts.get(value) ?? 0) - 1;
		if (next < 0) return false;
		if (next === 0) counts.delete(value);
		else counts.set(value, next);
	}
	return counts.size === 0;
};

const mergeMeta = (
	base: Prisma.InputJsonValue | null | undefined,
	patch: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue => {
	if (!base) return patch;
	if (!isRecord(base) || Array.isArray(base)) return patch;
	return { ...(base as Record<string, Prisma.InputJsonValue>), ...patch };
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
	event: unknown,
	mapping: IngestMeasurementMapping | undefined,
): NormalizedIngest["measurements"] => {
	if (!mapping) return undefined;
	const items = resolvePath(event, mapping.itemsPath);
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
	const event = { payload };

	const occurredAt = asString(resolvePath(event, mapping.occurredAtPath));
	const stationCode = asString(resolvePath(event, mapping.stationCodePath));
	const lineCode = asString(resolvePath(event, mapping.lineCodePath));
	const snValue = resolvePath(event, mapping.snPath);
	const sn = asString(snValue);
	const snListFromSnPath = Array.isArray(snValue) ? toStringArray(snValue) : [];
	const snList = mapping.snListPath
		? toStringArray(resolvePath(event, mapping.snListPath))
		: snListFromSnPath;
	const carrierCode = asString(resolvePath(event, mapping.carrierCodePath));
	const testResultId = asString(resolvePath(event, mapping.testResultIdPath));
	const resultValue = mapping.result ? resolvePath(event, mapping.result.path) : undefined;
	const result = normalizeResult(resultValue, mapping.result);
	const measurements = normalizeMeasurements(event, mapping.measurements);

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
			runNo: string;
			status: RunStatus;
			startedAt: Date | null;
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
				runNo: unit.run.runNo,
				status: unit.run.status,
				startedAt: unit.run.startedAt ?? null,
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
			runNo: string;
			status: RunStatus;
			startedAt: Date | null;
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
				runNo: run.runNo,
				status: run.status,
				startedAt: run.startedAt ?? null,
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
		if (!normalized.result) return false;
		return true;
	}

	if (!normalized.sn) return false;
	if (!normalized.stationCode) return false;
	if (!normalized.result) return false;

	if (eventType === IngestEventType.TEST && !normalized.testResultId) return false;
	return true;
};

class BatchIngestConflictError extends Error {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "BatchIngestConflictError";
		this.code = code;
	}
}

type BatchContext = {
	carrierNo: string;
	result: TrackResult;
	stepNo: number;
	nextStepNo: number | null;
	stationId: string | null;
	stationCode: string | null;
	units: Array<{ id: string; sn: string }>;
	carrierDataValues: Array<{
		specId: string;
		valueNumber: number | null;
		valueText: string | null;
		valueBoolean: boolean | null;
		valueJson?: Prisma.InputJsonValue;
		judge: string | null;
		meta: Prisma.InputJsonValue;
	}>;
	measurementSummary: {
		receivedCount: number;
		persistedCount: number;
		names: string[];
	};
};

export const createIngestEvent = async (
	db: PrismaClient,
	input: CreateIngestEventInput,
): Promise<ServiceResult<CreateIngestEventResult>> => {
	const existing = await db.ingestEvent.findUnique({
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
		runNo: string;
		status: RunStatus;
		startedAt: Date | null;
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
			runNo: run.runNo,
			status: run.status,
			startedAt: run.startedAt ?? null,
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

	let batchContext: BatchContext | null = null;
	if (input.eventType === IngestEventType.BATCH) {
		const policy = mapping.batchPolicy ?? "ALL_OR_NOTHING";
		if (policy !== "ALL_OR_NOTHING") {
			return {
				success: false,
				code: "BATCH_POLICY_NOT_SUPPORTED",
				message: "Only ALL_OR_NOTHING batchPolicy is supported",
				status: 400,
			};
		}

		if (!resolvedRun) {
			return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
		}
		if (!resolvedRun.routeVersionId) {
			return {
				success: false,
				code: "ROUTE_VERSION_NOT_READY",
				message: "Run has no executable route version",
				status: 400,
			};
		}

		if (
			resolvedRun.status !== RunStatus.AUTHORIZED &&
			resolvedRun.status !== RunStatus.IN_PROGRESS
		) {
			return {
				success: false,
				code: "RUN_NOT_AUTHORIZED",
				message: "Run is not authorized or in progress",
				status: 400,
			};
		}

		const normalizedResult = normalized.result;
		if (normalizedResult !== "PASS" && normalizedResult !== "FAIL") {
			return {
				success: false,
				code: "INGEST_PAYLOAD_INVALID",
				message: "Payload result must be PASS or FAIL for BATCH",
				status: 400,
			};
		}

		const snList = normalized.snList ?? [];
		const unitRows = await db.unit.findMany({
			where: { sn: { in: snList } },
			select: { id: true, sn: true, runId: true, status: true, currentStepNo: true },
		});

		const foundSns = unitRows.map((row) => row.sn);
		if (unitRows.length !== snList.length || !areSameStringSet(foundSns, snList)) {
			const found = new Set(foundSns);
			const missing = snList.filter((sn) => !found.has(sn));
			return {
				success: false,
				code: "UNIT_NOT_FOUND",
				message: `Unit not found: ${missing.join(", ")}`,
				status: 404,
			};
		}

		const mismatchedRun = unitRows.find((row) => row.runId !== resolvedRun.id);
		if (mismatchedRun) {
			return {
				success: false,
				code: "RUN_MISMATCH",
				message: "Units do not belong to the same run",
				status: 400,
			};
		}

		for (const unit of unitRows) {
			if (unit.status === UnitStatus.IN_STATION) {
				return {
					success: false,
					code: "UNIT_ALREADY_IN_STATION",
					message: "Unit is already in station",
					status: 400,
				};
			}
			if (unit.status === UnitStatus.DONE) {
				return {
					success: false,
					code: "UNIT_ALREADY_DONE",
					message: "Unit already completed",
					status: 400,
				};
			}
			if (unit.status === UnitStatus.OUT_FAILED) {
				return {
					success: false,
					code: "UNIT_OUT_FAILED",
					message: "Unit failed last track-out; disposition required before re-entry",
					status: 400,
				};
			}
			if (unit.status === UnitStatus.SCRAPPED) {
				return {
					success: false,
					code: "UNIT_SCRAPPED",
					message: "Unit already scrapped",
					status: 400,
				};
			}
			if (unit.status === UnitStatus.ON_HOLD) {
				return { success: false, code: "UNIT_ON_HOLD", message: "Unit is on hold", status: 400 };
			}
		}

		const currentStepNos = new Set(unitRows.map((row) => row.currentStepNo));
		if (currentStepNos.size !== 1) {
			return {
				success: false,
				code: "STEP_MISMATCH",
				message: "Units are not at the same routing step",
				status: 400,
			};
		}

		const stepNo = unitRows[0]?.currentStepNo;
		if (typeof stepNo !== "number") {
			return {
				success: false,
				code: "STEP_MISMATCH",
				message: "Current step not found",
				status: 400,
			};
		}

		const steps = [...getResolvedSnapshotSteps(resolvedRun.snapshot)].sort(
			(a, b) => a.stepNo - b.stepNo,
		);
		if (steps.length === 0) {
			return {
				success: false,
				code: "ROUTING_EMPTY",
				message: "Routing has no steps",
				status: 400,
			};
		}

		const currentStep = steps.find((step) => step.stepNo === stepNo);
		if (!currentStep) {
			return {
				success: false,
				code: "STEP_MISMATCH",
				message: "Current step not found in routing",
				status: 400,
			};
		}
		if (currentStep.stationType !== "BATCH") {
			return {
				success: false,
				code: "STEP_MISMATCH",
				message: "Current step is not a BATCH routing step",
				status: 400,
			};
		}

		let stationId: string | null = null;
		if (normalized.stationCode) {
			const station = await db.station.findUnique({
				where: { code: normalized.stationCode },
				select: { id: true, groupId: true, stationType: true },
			});
			if (!station) {
				return {
					success: false,
					code: "STATION_NOT_FOUND",
					message: "Station not found",
					status: 404,
				};
			}
			if (!isValidStationForStep(currentStep, station)) {
				return {
					success: false,
					code: "STATION_MISMATCH",
					message: "Station does not match routing step",
					status: 400,
				};
			}
			stationId = station.id;
		} else if (hasStationConstraints(currentStep)) {
			return {
				success: false,
				code: "INGEST_PAYLOAD_INVALID",
				message: "stationCode is required for constrained batch steps",
				status: 400,
			};
		}

		const result = normalizedResult === "FAIL" ? TrackResult.FAIL : TrackResult.PASS;
		const nextStepNo = resolveNextStepNo(steps, stepNo);

		const boundSpecIds = currentStep.dataSpecIds ?? [];
		const carrierDataValues: BatchContext["carrierDataValues"] = [];
		const measurementNames: string[] = [];
		const measurements = normalized.measurements ?? [];

		for (const item of measurements) {
			measurementNames.push(item.name);
		}

		if (boundSpecIds.length > 0) {
			const specs = await db.dataCollectionSpec.findMany({
				where: { id: { in: boundSpecIds } },
			});
			const fetchedIds = new Set(specs.map((spec) => spec.id));
			const missingIds = boundSpecIds.filter((id) => !fetchedIds.has(id));
			if (missingIds.length > 0) {
				return {
					success: false,
					code: "DATA_SPEC_NOT_FOUND",
					message: `One or more bound data specs are missing: ${missingIds.join(", ")}`,
					status: 400,
				};
			}

			const activeSpecs = specs.filter((spec) => spec.isActive);
			const requiredSpecs = activeSpecs.filter((spec) => spec.isRequired);
			const mismatchedRequiredTrigger = requiredSpecs.filter(
				(spec) => spec.triggerType !== "EACH_CARRIER",
			);
			if (mismatchedRequiredTrigger.length > 0) {
				return {
					success: false,
					code: "DATA_SPEC_TRIGGER_MISMATCH",
					message: `Required specs must be EACH_CARRIER for BATCH: ${mismatchedRequiredTrigger.map((s) => s.name).join(", ")}`,
					status: 400,
				};
			}

			const specsByName = new Map(activeSpecs.map((spec) => [spec.name, spec]));
			const dataSpecMap = normalized.dataSpecMap ?? {};
			const providedSpecNames = new Set<string>();

			for (const item of measurements) {
				const specName = dataSpecMap[item.name] ?? item.name;
				const spec = specsByName.get(specName);
				if (!spec) continue;
				if (spec.method !== "AUTO") {
					return {
						success: false,
						code: "DATA_SPEC_METHOD_MISMATCH",
						message: `Spec ${spec.name} does not allow AUTO ingestion`,
						status: 400,
					};
				}

				const value = item.value;
				let valueNumber: number | null = null;
				let valueText: string | null = null;
				let valueBoolean: boolean | null = null;
				let valueJson: Prisma.JsonValue | null = null;

				if (spec.dataType === "NUMBER") {
					if (typeof value === "number") {
						valueNumber = value;
					} else if (typeof value === "string") {
						const parsed = Number.parseFloat(value);
						if (!Number.isNaN(parsed)) {
							valueNumber = parsed;
						} else {
							return {
								success: false,
								code: "DATA_VALUE_INVALID",
								message: `Invalid numeric value for ${spec.name}`,
								status: 400,
							};
						}
					} else {
						return {
							success: false,
							code: "DATA_VALUE_INVALID",
							message: `Missing numeric value for ${spec.name}`,
							status: 400,
						};
					}
				} else if (spec.dataType === "TEXT") {
					const text = asString(value);
					if (!text) {
						return {
							success: false,
							code: "DATA_VALUE_INVALID",
							message: `Missing text value for ${spec.name}`,
							status: 400,
						};
					}
					valueText = text;
				} else if (spec.dataType === "BOOLEAN") {
					if (typeof value === "boolean") {
						valueBoolean = value;
					} else if (typeof value === "string") {
						const lower = value.toLowerCase();
						if (lower === "true") valueBoolean = true;
						else if (lower === "false") valueBoolean = false;
						else {
							return {
								success: false,
								code: "DATA_VALUE_INVALID",
								message: `Invalid boolean value for ${spec.name}`,
								status: 400,
							};
						}
					} else {
						return {
							success: false,
							code: "DATA_VALUE_INVALID",
							message: `Missing boolean value for ${spec.name}`,
							status: 400,
						};
					}
				} else if (spec.dataType === "JSON") {
					valueJson = value;
				} else {
					return {
						success: false,
						code: "DATA_VALUE_INVALID",
						message: `Unsupported data type for ${spec.name}`,
						status: 400,
					};
				}

				providedSpecNames.add(spec.name);
				carrierDataValues.push({
					specId: spec.id,
					valueNumber,
					valueText,
					valueBoolean,
					valueJson: valueJson as Prisma.InputJsonValue,
					judge: item.judge ?? null,
					meta: {
						specName: spec.name,
						measurementName: item.name,
						unit: item.unit ?? null,
					},
				});
			}

			if (result === TrackResult.PASS) {
				const missingRequired = requiredSpecs
					.map((spec) => spec.name)
					.filter((name) => !providedSpecNames.has(name));
				if (missingRequired.length > 0) {
					return {
						success: false,
						code: "REQUIRED_DATA_MISSING",
						message: `Missing required data specs: ${missingRequired.join(", ")}`,
						status: 400,
					};
				}
			}
		}

		batchContext = {
			carrierNo: normalized.carrierCode ?? "",
			result,
			stepNo,
			nextStepNo,
			stationId,
			stationCode: normalized.stationCode ?? null,
			units: unitRows.map((row) => ({ id: row.id, sn: row.sn })),
			carrierDataValues,
			measurementSummary: {
				receivedCount: measurements.length,
				persistedCount: carrierDataValues.length,
				names: [...new Set(measurementNames)].sort(),
			},
		};
	}

	let shouldTriggerOqc = false;

	let service: ServiceResult<CreateIngestEventResult>;
	try {
		service = await db.$transaction(async (tx) => {
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

			if (input.eventType === IngestEventType.BATCH) {
				if (!batchContext) {
					return {
						success: false,
						code: "INGEST_PAYLOAD_INVALID",
						message: "Batch context not resolved",
						status: 400,
					};
				}

				let created: { id: string };
				try {
					created = await tx.ingestEvent.create({
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

				if (resolvedRun && resolvedRun.status === RunStatus.AUTHORIZED) {
					await tx.run.updateMany({
						where: { id: resolvedRun.id, status: RunStatus.AUTHORIZED },
						data: {
							status: RunStatus.IN_PROGRESS,
							startedAt: resolvedRun.startedAt ?? occurredAt,
						},
					});
				}

				const carrier = await tx.carrier.upsert({
					where: { carrierNo: batchContext.carrierNo },
					create: {
						carrierNo: batchContext.carrierNo,
						type: "UNKNOWN",
						status: "ACTIVE",
						meta: { createdByIngest: created.id },
					},
					update: { status: "ACTIVE" },
					select: { id: true },
				});

				const carrierTrack = await tx.carrierTrack.create({
					data: {
						carrierId: carrier.id,
						stepNo: batchContext.stepNo,
						stationId: batchContext.stationId,
						source: TrackSource.BATCH,
						inAt: occurredAt,
						outAt: occurredAt,
						result: batchContext.result,
						meta: {
							ingestEventId: created.id,
							sourceSystem: input.sourceSystem,
							dedupeKey: input.dedupeKey,
						},
					},
					select: { id: true },
				});

				const openLoads = await tx.carrierLoad.findMany({
					where: { carrierId: carrier.id, unloadedAt: null },
					select: { id: true, unitId: true },
				});
				const desiredUnitIds = new Set(batchContext.units.map((unit) => unit.id));
				const openUnitIds = new Set(openLoads.map((load) => load.unitId));
				const toUnloadIds = openLoads
					.filter((load) => !desiredUnitIds.has(load.unitId))
					.map((load) => load.id);
				if (toUnloadIds.length > 0) {
					await tx.carrierLoad.updateMany({
						where: { id: { in: toUnloadIds } },
						data: { unloadedAt: occurredAt },
					});
				}

				for (const unit of batchContext.units) {
					if (openUnitIds.has(unit.id)) continue;
					try {
						await tx.carrierLoad.create({
							data: {
								carrierId: carrier.id,
								unitId: unit.id,
								loadedAt: occurredAt,
								meta: {
									ingestEventId: created.id,
									carrierTrackId: carrierTrack.id,
									sourceSystem: input.sourceSystem,
									dedupeKey: input.dedupeKey,
								},
							},
						});
					} catch (error) {
						if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
							continue;
						}
						throw error;
					}
				}

				const unitTrackIdsBySn: Record<string, string> = {};
				for (const unit of batchContext.units) {
					const track = await tx.track.create({
						data: {
							unitId: unit.id,
							stepNo: batchContext.stepNo,
							stationId: batchContext.stationId,
							source: TrackSource.BATCH,
							inAt: occurredAt,
							outAt: occurredAt,
							result: batchContext.result,
							meta: {
								ingestEventId: created.id,
								carrierId: carrier.id,
								carrierNo: batchContext.carrierNo,
								carrierTrackId: carrierTrack.id,
								sourceSystem: input.sourceSystem,
								dedupeKey: input.dedupeKey,
							},
						},
						select: { id: true },
					});
					unitTrackIdsBySn[unit.sn] = track.id;
				}

				if (batchContext.carrierDataValues.length > 0) {
					await tx.dataValue.createMany({
						data: batchContext.carrierDataValues.map((value) => ({
							specId: value.specId,
							carrierTrackId: carrierTrack.id,
							collectedAt: occurredAt,
							valueNumber: value.valueNumber,
							valueText: value.valueText,
							valueBoolean: value.valueBoolean,
							...(value.valueJson !== undefined ? { valueJson: value.valueJson } : {}),
							judge: value.judge,
							source: TrackSource.BATCH,
							meta: mergeMeta(value.meta, {
								ingestEventId: created.id,
								carrierNo: batchContext.carrierNo,
								carrierId: carrier.id,
								carrierTrackId: carrierTrack.id,
							}),
						})),
					});
				}

				const unitIds = batchContext.units.map((unit) => unit.id);
				if (batchContext.result === TrackResult.PASS) {
					if (batchContext.nextStepNo) {
						const updated = await tx.unit.updateMany({
							where: {
								id: { in: unitIds },
								status: UnitStatus.QUEUED,
								currentStepNo: batchContext.stepNo,
							},
							data: { status: UnitStatus.QUEUED, currentStepNo: batchContext.nextStepNo },
						});
						if (updated.count !== unitIds.length) {
							throw new BatchIngestConflictError(
								"INGEST_CONFLICT",
								"Units changed during batch ingestion; please retry",
							);
						}
					} else {
						const updated = await tx.unit.updateMany({
							where: {
								id: { in: unitIds },
								status: UnitStatus.QUEUED,
								currentStepNo: batchContext.stepNo,
							},
							data: { status: UnitStatus.DONE },
						});
						if (updated.count !== unitIds.length) {
							throw new BatchIngestConflictError(
								"INGEST_CONFLICT",
								"Units changed during batch ingestion; please retry",
							);
						}
					}
				} else {
					const updated = await tx.unit.updateMany({
						where: {
							id: { in: unitIds },
							status: UnitStatus.QUEUED,
							currentStepNo: batchContext.stepNo,
						},
						data: { status: UnitStatus.OUT_FAILED },
					});
					if (updated.count !== unitIds.length) {
						throw new BatchIngestConflictError(
							"INGEST_CONFLICT",
							"Units changed during batch ingestion; please retry",
						);
					}
				}

				await tx.ingestEvent.update({
					where: { id: created.id },
					data: {
						meta: mergeMeta(input.meta, {
							links: {
								carrierId: carrier.id,
								carrierTrackId: carrierTrack.id,
								unitTracks: unitTrackIdsBySn,
								carrierDataValueCount: batchContext.carrierDataValues.length,
							},
							batch: {
								carrierNo: batchContext.carrierNo,
								stepNo: batchContext.stepNo,
								nextStepNo: batchContext.nextStepNo,
								stationCode: batchContext.stationCode,
								result: batchContext.result,
								unitCount: batchContext.units.length,
							},
							measurementSummary: batchContext.measurementSummary,
						}),
					},
				});

				shouldTriggerOqc =
					batchContext.result === TrackResult.PASS && batchContext.nextStepNo === null;

				return {
					success: true,
					data: { eventId: created.id, duplicate: false, status: "RECEIVED" },
				};
			}

			if (!normalized.stationCode) {
				return {
					success: false,
					code: "INGEST_PAYLOAD_INVALID",
					message: "Payload missing required fields",
					status: 400,
				};
			}
			if (!normalized.sn) {
				return {
					success: false,
					code: "INGEST_PAYLOAD_INVALID",
					message: "Payload missing required fields",
					status: 400,
				};
			}

			const [station, unit, run, runRouteVersion] = await Promise.all([
				tx.station.findUnique({ where: { code: normalized.stationCode } }),
				tx.unit.findUnique({ where: { sn: normalized.sn } }),
				tx.run.findUnique({ where: { id: resolvedRun?.id ?? "" } }),
				tx.executableRouteVersion.findUnique({ where: { id: resolvedRun?.routeVersionId ?? "" } }),
			]);

			if (!station) {
				return {
					success: false,
					code: "STATION_NOT_FOUND",
					message: "Station not found",
					status: 404,
				};
			}
			if (!run) {
				return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
			}
			if (!runRouteVersion) {
				return {
					success: false,
					code: "ROUTE_VERSION_NOT_READY",
					message: "Run has no executable route version",
					status: 400,
				};
			}
			if (!unit) {
				return {
					success: false,
					code: "UNIT_NOT_FOUND",
					message: "Unit not found",
					status: 404,
				};
			}

			if (unit.runId && unit.runId !== run.id) {
				return {
					success: false,
					code: "UNIT_RUN_MISMATCH",
					message: "Unit does not belong to run",
					status: 400,
				};
			}

			if (unit.status === UnitStatus.DONE) {
				return {
					success: false,
					code: "UNIT_ALREADY_DONE",
					message: "Unit already completed",
					status: 400,
				};
			}
			if (unit.status === UnitStatus.OUT_FAILED) {
				return {
					success: false,
					code: "UNIT_OUT_FAILED",
					message: "Unit failed last track-out; disposition required before re-entry",
					status: 400,
				};
			}

			const steps = getResolvedSnapshotSteps(runRouteVersion.snapshotJson ?? null);
			if (steps.length === 0) {
				return {
					success: false,
					code: "ROUTING_EMPTY",
					message: "Routing has no steps",
					status: 400,
				};
			}

			const step = resolveIngestStep(
				steps,
				{ eventType: input.eventType, stationCode: normalized.stationCode },
				{ id: station.id, stationType: station.stationType, groupId: station.groupId ?? null },
				{ currentStepNo: unit.currentStepNo },
			);
			if (!step) {
				return {
					success: false,
					code: "STATION_MISMATCH",
					message: "Station does not match routing step",
					status: 400,
				};
			}

			const activeSpecs = await resolveStepDataSpecs(tx, step);
			if (activeSpecs === null) {
				return {
					success: false,
					code: "DATA_SPEC_NOT_FOUND",
					message: "One or more bound data specs are missing",
					status: 400,
				};
			}

			const dataItems = buildIngestDataItems(normalized, activeSpecs);
			const result = normalized.result === "FAIL" ? TrackResult.FAIL : TrackResult.PASS;
			const trackSource =
				input.eventType === IngestEventType.TEST ? TrackSource.TEST : TrackSource.AUTO;
			if (!validateRequiredData(result, dataItems, activeSpecs)) {
				return {
					success: false,
					code: "REQUIRED_DATA_MISSING",
					message: "Missing required data specs",
					status: 400,
				};
			}

			// All guards passed → now persist ingest event + execution results together.
			let created: { id: string };
			try {
				created = await tx.ingestEvent.create({
					data: {
						sourceSystem: input.sourceSystem,
						dedupeKey: input.dedupeKey,
						eventType: input.eventType,
						occurredAt,
						runId: resolvedRun?.id ?? null,
						runNo,
						unitId: unit.id,
						stationCode: normalized.stationCode ?? null,
						lineCode: normalized.lineCode ?? null,
						carrierCode: normalized.carrierCode ?? null,
						sn: normalized.sn ?? null,
						snList: normalized.snList ?? undefined,
						result: normalized.result ?? null,
						testResultId: normalized.testResultId ?? null,
						payload,
						normalized: buildNormalizedJson(normalized),
						meta: {
							...(isRecord(input.meta) ? (input.meta as Record<string, unknown>) : {}),
							trackSource,
						},
					},
					select: { id: true },
				});
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

			if (run.status === RunStatus.AUTHORIZED) {
				await tx.run.updateMany({
					where: { id: run.id, status: RunStatus.AUTHORIZED },
					data: { status: RunStatus.IN_PROGRESS, startedAt: run.startedAt ?? occurredAt },
				});
			}

			const write = await persistAutoTrackOut(tx, {
				stationId: station.id,
				stepNo: step.stepNo,
				operationId: step.operationId,
				occurredAt,
				result,
				source: trackSource,
				unit: { id: unit.id, currentStepNo: unit.currentStepNo },
				routeSteps: steps,
				dataItems,
				activeSpecs,
			});

			// If unit becomes DONE, try triggering OQC (best-effort).
			if (write.unitStatus === UnitStatus.DONE && run.runNo) {
				checkAndTriggerOqc(db, run.runNo).catch((err) => {
					console.error(`[Ingest] OQC trigger failed for run ${run.runNo}:`, err);
				});
			}

			return {
				success: true,
				data: { eventId: created.id, duplicate: false, status: "RECEIVED" },
			};
		});
	} catch (error) {
		if (error instanceof BatchIngestConflictError) {
			return { success: false, code: error.code, message: error.message, status: 400 };
		}
		throw error;
	}

	if (
		batchContext &&
		shouldTriggerOqc &&
		service.success &&
		!service.data.duplicate &&
		resolvedRun
	) {
		try {
			const result = await checkAndTriggerOqc(db, resolvedRun.runNo);
			if (!result.success) {
				console.error(`[Ingest] OQC trigger failed for run ${resolvedRun.runNo}:`, result);
			}
		} catch (error) {
			console.error(`[Ingest] OQC trigger error for run ${resolvedRun.runNo}:`, error);
		}
	}

	return service;
};
