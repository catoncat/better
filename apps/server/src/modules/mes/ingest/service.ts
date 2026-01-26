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

		// BATCH: 先保持原有策略（仅落库 + trace），执行写入留到下一步实现。
		if (input.eventType === IngestEventType.BATCH) {
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
		const created = await tx.ingestEvent.create({
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
};
