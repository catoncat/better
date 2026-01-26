import type { Prisma, PrismaClient } from "@better-app/db";
import { RunStatus, UnitStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { buildMesEventIdempotencyKey, createMesEvent, MES_EVENT_TYPES } from "../event/service";

export type OutboundTargetSystem = "ERP" | "TPM";
export type OutboundMessageType = "RUN_COMPLETION_V1";

type RunCompletionStats = {
	unitStats: Record<string, number>;
	goodQty: number;
	scrapQty: number;
};

export type OutboundRunCompletionMessageV1 = {
	schemaVersion: 1;
	idempotencyKey: string;
	targetSystem: OutboundTargetSystem;
	messageType: OutboundMessageType;
	occurredAt: string;
	businessKey: {
		runNo: string;
		woNo: string;
		productCode: string;
		lineCode: string | null;
	};
	data: {
		run: {
			runNo: string;
			status: RunStatus;
			planQty: number;
			startedAt: string | null;
			endedAt: string | null;
		};
		route: {
			code: string | null;
			sourceSystem: string | null;
			sourceKey: string | null;
			routeVersionId: string | null;
			routeVersionNo: number | null;
			routeVersionCompiledAt: string | null;
		};
		stats: RunCompletionStats;
	};
};

const TERMINAL_RUN_STATUSES: RunStatus[] = [
	RunStatus.COMPLETED,
	RunStatus.CLOSED_REWORK,
	RunStatus.SCRAPPED,
];

const clampText = (value: string, maxLen: number) =>
	value.length <= maxLen ? value : `${value.slice(0, maxLen)}…(truncated)`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const parseOutboundRunCompletionMessageV1 = (payload: unknown): OutboundRunCompletionMessageV1 => {
	if (!isRecord(payload)) throw new Error("Outbound payload must be an object");

	const schemaVersion = payload.schemaVersion;
	if (schemaVersion !== 1) throw new Error("Unsupported outbound schemaVersion");

	const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : null;
	const targetSystem = typeof payload.targetSystem === "string" ? payload.targetSystem : null;
	const messageType = typeof payload.messageType === "string" ? payload.messageType : null;
	const occurredAt = typeof payload.occurredAt === "string" ? payload.occurredAt : null;

	if (!idempotencyKey) throw new Error("Outbound payload missing idempotencyKey");
	if (targetSystem !== "ERP" && targetSystem !== "TPM")
		throw new Error("Outbound payload has invalid targetSystem");
	if (messageType !== "RUN_COMPLETION_V1")
		throw new Error("Outbound payload has unsupported messageType");
	if (!occurredAt) throw new Error("Outbound payload missing occurredAt");

	return payload as OutboundRunCompletionMessageV1;
};

const computeRunCompletionStats = (unitStats: Array<{ status: UnitStatus; _count: number }>) => {
	const stats: RunCompletionStats = {
		unitStats: {},
		goodQty: 0,
		scrapQty: 0,
	};

	for (const row of unitStats) {
		stats.unitStats[row.status] = row._count;
		if (row.status === UnitStatus.DONE) stats.goodQty += row._count;
		if (row.status === UnitStatus.SCRAPPED) stats.scrapQty += row._count;
	}

	return stats;
};

export const buildRunCompletionOutboundMessage = async (
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<OutboundRunCompletionMessageV1>> => {
	const run = await db.run.findUnique({
		where: { runNo },
		include: {
			workOrder: true,
			line: true,
			routeVersion: { include: { routing: true } },
		},
	});

	if (!run) {
		return { success: false, code: "RUN_NOT_FOUND", message: "Run not found", status: 404 };
	}

	if (!TERMINAL_RUN_STATUSES.includes(run.status)) {
		return {
			success: false,
			code: "RUN_NOT_TERMINAL",
			message: `Run status ${run.status} is not terminal`,
			status: 409,
		};
	}

	const unitStats = await db.unit.groupBy({
		by: ["status"],
		where: { runId: run.id },
		_count: true,
	});

	const stats = computeRunCompletionStats(
		unitStats.map((row) => ({ status: row.status, _count: row._count })),
	);

	const sourceSystem = "MES";
	const messageType: OutboundMessageType = "RUN_COMPLETION_V1";
	const targetSystem: OutboundTargetSystem = "ERP";
	const source = `${targetSystem}:${messageType}:${run.runNo}`;
	const idempotencyKey = buildMesEventIdempotencyKey(MES_EVENT_TYPES.OUTBOUND_FEEDBACK, source);

	const occurredAt = (run.endedAt ?? run.updatedAt).toISOString();

	return {
		success: true,
		data: {
			schemaVersion: 1,
			idempotencyKey,
			targetSystem,
			messageType,
			occurredAt,
			businessKey: {
				runNo: run.runNo,
				woNo: run.workOrder.woNo,
				productCode: run.workOrder.productCode,
				lineCode: run.line?.code ?? null,
			},
			data: {
				run: {
					runNo: run.runNo,
					status: run.status,
					planQty: run.planQty,
					startedAt: run.startedAt?.toISOString() ?? null,
					endedAt: run.endedAt?.toISOString() ?? null,
				},
				route: {
					code: run.routeVersion?.routing?.code ?? null,
					sourceSystem: run.routeVersion?.routing?.sourceSystem ?? sourceSystem,
					sourceKey: run.routeVersion?.routing?.sourceKey ?? null,
					routeVersionId: run.routeVersion?.id ?? null,
					routeVersionNo: run.routeVersion?.versionNo ?? null,
					routeVersionCompiledAt: run.routeVersion?.compiledAt?.toISOString() ?? null,
				},
				stats,
			},
		},
	};
};

export const enqueueRunCompletionOutboundFeedback = async (
	db: PrismaClient,
	runNo: string,
): Promise<ServiceResult<{ eventId: string; idempotencyKey: string }>> => {
	const messageResult = await buildRunCompletionOutboundMessage(db, runNo);
	if (!messageResult.success) return messageResult;

	const message = messageResult.data;
	const payload = message as unknown as Prisma.InputJsonValue;

	const created = await createMesEvent(db, {
		eventType: MES_EVENT_TYPES.OUTBOUND_FEEDBACK,
		idempotencyKey: message.idempotencyKey,
		occurredAt: new Date(message.occurredAt),
		entityType: "RUN",
		entityId: message.businessKey.runNo,
		payload,
		maxAttempts: 50,
		retentionDays: 180,
	});

	return { success: true, data: { eventId: created.id, idempotencyKey: message.idempotencyKey } };
};

const getErpOutboundUrl = () => {
	const baseUrl = process.env.MES_OUTBOUND_ERP_BASE_URL?.trim() ?? "";
	if (!baseUrl) throw new Error("MES_OUTBOUND_ERP_BASE_URL is not set");
	const path = process.env.MES_OUTBOUND_ERP_PATH?.trim() || "/api/mes/outbound/erp/feedback";
	return new URL(path, baseUrl).toString();
};

export const deliverOutboundFeedbackPayload = async (payload: unknown) => {
	const message = parseOutboundRunCompletionMessageV1(payload);

	if (message.targetSystem === "TPM") {
		throw new Error("TPM outbound feedback not implemented");
	}

	const url = getErpOutboundUrl();
	const apiKey = process.env.MES_OUTBOUND_ERP_API_KEY?.trim() || null;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(apiKey ? { Authorization: `Bearer ${apiKey}` } : null),
			"Idempotency-Key": message.idempotencyKey,
		},
		body: JSON.stringify(message),
	});

	if (!response.ok) {
		let body = "";
		try {
			body = clampText(await response.text(), 4_000);
		} catch {
			body = "";
		}
		throw new Error(
			`Outbound ERP request failed (${response.status}): ${body ? body : response.statusText}`,
		);
	}
};
