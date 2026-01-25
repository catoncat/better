import {
	type MesEvent,
	MesEventStatus,
	type PrismaClient,
	type TimeRuleDefinition,
} from "@better-app/db";
import { completeInstanceByEntity, createInstance, routeHasWashStep } from "../time-rule/service";

const BASE_BACKOFF_MS = 30_000;
const DEFAULT_BATCH_SIZE = 50;

type RunContext = {
	id: string;
	line: { id: string; code: string } | null;
	workOrder: { productCode: string } | null;
	routeVersion: {
		id: string;
		routingId: string | null;
		routing: { id: string; code: string } | null;
	} | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null =>
	typeof value === "string" && value.trim().length > 0 ? value : null;

const matchesValue = (value: string | null | undefined, scopeValue: string) => {
	if (!value) return false;
	if (value === scopeValue) return true;
	return value.toUpperCase() === scopeValue.toUpperCase();
};

const getRunContext = async (db: PrismaClient, runId: string): Promise<RunContext | null> =>
	db.run.findUnique({
		where: { id: runId },
		select: {
			id: true,
			line: { select: { id: true, code: true } },
			workOrder: { select: { productCode: true } },
			routeVersion: {
				select: {
					id: true,
					routingId: true,
					routing: { select: { id: true, code: true } },
				},
			},
		},
	});

const matchesScope = async (
	definition: TimeRuleDefinition,
	runContext: RunContext | null,
	payload: Record<string, unknown> | null,
): Promise<boolean> => {
	if (definition.scope === "GLOBAL") return true;
	const scopeValue = definition.scopeValue?.trim();
	if (!scopeValue) return false;

	if (definition.scope === "LINE") {
		const lineId = asString(payload?.lineId) ?? runContext?.line?.id ?? null;
		const lineCode = asString(payload?.lineCode) ?? runContext?.line?.code ?? null;
		return matchesValue(lineId, scopeValue) || matchesValue(lineCode, scopeValue);
	}

	if (definition.scope === "ROUTING") {
		const routingId =
			asString(payload?.routingId) ??
			runContext?.routeVersion?.routing?.id ??
			runContext?.routeVersion?.routingId ??
			null;
		const routingCode =
			asString(payload?.routingCode) ?? runContext?.routeVersion?.routing?.code ?? null;
		return matchesValue(routingId, scopeValue) || matchesValue(routingCode, scopeValue);
	}

	if (definition.scope === "PRODUCT") {
		const productCode =
			asString(payload?.productCode) ?? runContext?.workOrder?.productCode ?? null;
		return matchesValue(productCode, scopeValue);
	}

	return false;
};

const shouldApplyRule = async (
	db: PrismaClient,
	definition: TimeRuleDefinition,
	event: MesEvent,
	payload: Record<string, unknown> | null,
	runContext: RunContext | null,
): Promise<boolean> => {
	if (!(await matchesScope(definition, runContext, payload))) return false;

	if (definition.ruleType === "WASH_TIME_LIMIT") {
		const operationCode = asString(payload?.operationCode)?.toUpperCase() ?? "";
		if (event.eventType === "TRACK_OUT") {
			const result = asString(payload?.result)?.toUpperCase() ?? "";
			if (result !== "PASS") return false;
			const isReflowOrAoi = operationCode.includes("REFLOW") || operationCode.includes("AOI");
			if (!isReflowOrAoi) return false;
			if (definition.requiresWashStep) {
				const routeVersionId =
					asString(payload?.routeVersionId) ?? runContext?.routeVersion?.id ?? null;
				if (!routeVersionId) return false;
				const hasWash = await routeHasWashStep(db, routeVersionId);
				if (!hasWash) return false;
			}
		}
		if (event.eventType === "TRACK_IN") {
			if (!operationCode.includes("WASH")) return false;
		}
	}

	if (definition.ruleType === "SOLDER_PASTE_EXPOSURE") {
		if (event.eventType === "SOLDER_PASTE_USAGE_CREATE") {
			const issuedAt = asString(payload?.issuedAt);
			if (!issuedAt && !event.occurredAt) return false;
		}
	}

	return true;
};

const resolveEntityDisplay = (
	definition: TimeRuleDefinition,
	event: MesEvent,
	payload: Record<string, unknown> | null,
) => {
	const unitSn = asString(payload?.unitSn);
	const lotId = asString(payload?.lotId);

	if (definition.ruleType === "WASH_TIME_LIMIT" && event.eventType === "TRACK_OUT") {
		return unitSn ? `单元 ${unitSn} - 回流焊后水洗` : (event.entityId ?? null);
	}

	if (unitSn) return `单元 ${unitSn}`;
	if (lotId) return `锡膏批次 ${lotId}`;
	return event.entityId ?? null;
};

const processStartEvents = async (
	db: PrismaClient,
	event: MesEvent,
	payload: Record<string, unknown> | null,
	runContext: RunContext | null,
) => {
	const definitions = await db.timeRuleDefinition.findMany({
		where: { isActive: true, startEvent: event.eventType },
		orderBy: { priority: "desc" },
	});

	for (const definition of definitions) {
		if (!event.entityType || !event.entityId) {
			throw new Error("Event missing entity data");
		}

		if (!(await shouldApplyRule(db, definition, event, payload, runContext))) continue;

		const result = await createInstance(db, {
			definitionCode: definition.code,
			runId: event.runId ?? undefined,
			entityType: event.entityType,
			entityId: event.entityId,
			entityDisplay: resolveEntityDisplay(definition, event, payload) ?? undefined,
			startedAt: event.occurredAt ?? new Date(),
		});

		if (!result.success && result.code !== "INSTANCE_ALREADY_ACTIVE") {
			throw new Error(result.message ?? "Failed to create time rule instance");
		}
	}
};

const processEndEvents = async (
	db: PrismaClient,
	event: MesEvent,
	payload: Record<string, unknown> | null,
	runContext: RunContext | null,
) => {
	const definitions = await db.timeRuleDefinition.findMany({
		where: { isActive: true, endEvent: event.eventType },
		orderBy: { priority: "desc" },
	});

	for (const definition of definitions) {
		if (!event.entityType || !event.entityId) {
			throw new Error("Event missing entity data");
		}

		if (!(await shouldApplyRule(db, definition, event, payload, runContext))) continue;

		const result = await completeInstanceByEntity(
			db,
			definition.code,
			event.entityType,
			event.entityId,
		);
		if (!result.success) {
			throw new Error(result.message ?? "Failed to complete time rule instance");
		}
	}
};

const computeNextAttempt = (attempts: number) => {
	const delayMs = BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1);
	return new Date(Date.now() + delayMs);
};

export type MesEventProcessSummary = {
	processed: number;
	completed: number;
	failed: number;
	skipped: number;
};

export const processMesEvents = async (
	db: PrismaClient,
	options?: { limit?: number },
): Promise<MesEventProcessSummary> => {
	const now = new Date();
	const activeDefinitions = await db.timeRuleDefinition.findMany({
		where: { isActive: true },
		select: { startEvent: true, endEvent: true },
	});
	const eventTypes = Array.from(
		new Set(
			activeDefinitions
				.flatMap((def) => [def.startEvent, def.endEvent])
				.filter((value): value is string => Boolean(value?.trim())),
		),
	);
	if (eventTypes.length === 0) {
		return { processed: 0, completed: 0, failed: 0, skipped: 0 };
	}

	const events = await db.mesEvent.findMany({
		where: {
			eventType: { in: eventTypes },
			status: { in: [MesEventStatus.PENDING, MesEventStatus.FAILED] },
			OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
		},
		orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
		take: options?.limit ?? DEFAULT_BATCH_SIZE,
	});

	const summary: MesEventProcessSummary = {
		processed: 0,
		completed: 0,
		failed: 0,
		skipped: 0,
	};

	for (const event of events) {
		if (event.attempts >= event.maxAttempts) {
			await db.mesEvent.update({
				where: { id: event.id },
				data: {
					status: MesEventStatus.FAILED,
					errorMessage: event.errorMessage ?? "Max attempts reached",
					nextAttemptAt: null,
				},
			});
			summary.skipped++;
			continue;
		}

		const claimed = await db.mesEvent.updateMany({
			where: { id: event.id, status: event.status },
			data: { status: MesEventStatus.PROCESSING, updatedAt: now },
		});
		if (claimed.count === 0) {
			summary.skipped++;
			continue;
		}

		summary.processed++;
		const payload = asRecord(event.payload);
		const runContext = event.runId ? await getRunContext(db, event.runId) : null;
		const nextAttempts = event.attempts + 1;

		try {
			await processStartEvents(db, event, payload, runContext);
			await processEndEvents(db, event, payload, runContext);

			await db.mesEvent.update({
				where: { id: event.id },
				data: {
					status: MesEventStatus.COMPLETED,
					attempts: nextAttempts,
					processedAt: new Date(),
					errorCode: null,
					errorMessage: null,
					nextAttemptAt: null,
				},
			});
			summary.completed++;
		} catch (error) {
			const shouldRetry = nextAttempts < event.maxAttempts;
			await db.mesEvent.update({
				where: { id: event.id },
				data: {
					status: MesEventStatus.FAILED,
					attempts: nextAttempts,
					errorMessage: error instanceof Error ? error.message : String(error),
					nextAttemptAt: shouldRetry ? computeNextAttempt(nextAttempts) : null,
				},
			});
			summary.failed++;
		}
	}

	return summary;
};
