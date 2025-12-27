import type { AuditEntityType, Prisma, PrismaClient } from "@better-app/db";
import { type AuditDiffOp, buildAuditDiff } from "../../utils/audit-diff";

export type AuditActor = {
	id?: string;
	name?: string | null;
	role?: string | null;
	type?: string | null;
};

export type AuditRequestMeta = {
	requestId?: string;
	ip?: string;
	userAgent?: string;
	traceId?: string;
};

export const buildAuditActor = (user?: {
	id?: string;
	name?: string | null;
	role?: string | null;
}) => {
	if (!user?.id) return { type: "SYSTEM" } satisfies AuditActor;
	return {
		id: user.id,
		name: user.name ?? null,
		role: user.role ?? null,
		type: "USER",
	} satisfies AuditActor;
};

export type RecordAuditEventInput = {
	entityType: AuditEntityType;
	entityId: string;
	entityDisplay?: string | null;
	action: string;
	actor?: AuditActor;
	status: "SUCCESS" | "FAIL";
	errorCode?: string | null;
	errorMessage?: string | null;
	before?: unknown;
	after?: unknown;
	payload?: unknown;
	stationId?: string | null;
	idempotencyKey?: string | null;
	request?: AuditRequestMeta;
};

const pickTraceId = (traceparent: string | null) => {
	if (!traceparent) return undefined;
	const parts = traceparent.split("-");
	return parts.length >= 2 ? parts[1] : undefined;
};

export const buildAuditRequestMeta = (request: Request): AuditRequestMeta => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;

	return {
		requestId:
			request.headers.get("x-request-id") || request.headers.get("x-requestid") || undefined,
		ip,
		userAgent: request.headers.get("user-agent") || undefined,
		traceId: pickTraceId(request.headers.get("traceparent")),
	};
};

export const recordAuditEvent = async (
	db: PrismaClient,
	input: RecordAuditEventInput,
): Promise<{ id: string; diff: AuditDiffOp[] }> => {
	const diff =
		input.before !== undefined || input.after !== undefined
			? buildAuditDiff(input.before, input.after)
			: [];
	const diffValue: Prisma.InputJsonValue | undefined =
		diff.length > 0 ? (diff as Prisma.InputJsonValue) : undefined;
	const actorType = input.actor?.type ?? (input.actor?.id ? "USER" : "SYSTEM");

	const event = await db.auditEvent.create({
		data: {
			entityType: input.entityType,
			entityId: input.entityId,
			entityDisplay: input.entityDisplay ?? null,
			action: input.action,
			actorId: input.actor?.id ?? null,
			actorName: input.actor?.name ?? null,
			actorRole: input.actor?.role ?? null,
			actorType,
			stationId: input.stationId ?? null,
			status: input.status,
			errorCode: input.errorCode ?? null,
			errorMessage: input.errorMessage ?? null,
			diff: diffValue,
			requestId: input.request?.requestId ?? null,
			ip: input.request?.ip ?? null,
			userAgent: input.request?.userAgent ?? null,
			traceId: input.request?.traceId ?? null,
			idempotencyKey: input.idempotencyKey ?? null,
			payload: input.payload ?? undefined,
		},
		select: { id: true },
	});

	return { id: event.id, diff };
};

const normalizeAuditDiff = (value: Prisma.JsonValue | null): AuditDiffOp[] | null => {
	if (!value) return null;
	if (!Array.isArray(value)) return null;
	return value as AuditDiffOp[];
};

export type AuditListQuery = {
	page?: number;
	pageSize?: number;
	actorId?: string;
	entityType?: AuditEntityType;
	entityId?: string;
	action?: string;
	status?: string;
	from?: string;
	to?: string;
};

export const listAuditEvents = async (
	db: PrismaClient,
	query: AuditListQuery,
	forcedActorId?: string,
) => {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);
	const where: Prisma.AuditEventWhereInput = {};

	if (forcedActorId) {
		where.actorId = forcedActorId;
	} else if (query.actorId) {
		where.actorId = query.actorId;
	}

	if (query.entityType) where.entityType = query.entityType;
	if (query.entityId) where.entityId = query.entityId;
	if (query.action) where.action = query.action;
	if (query.status) where.status = query.status;

	if (query.from || query.to) {
		const range: Prisma.DateTimeFilter = {};
		if (query.from) range.gte = new Date(query.from);
		if (query.to) range.lte = new Date(query.to);
		where.createdAt = range;
	}

	const [items, total] = await Promise.all([
		db.auditEvent.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.auditEvent.count({ where }),
	]);

	return {
		items: items.map((item) => ({
			...item,
			diff: normalizeAuditDiff(item.diff),
			createdAt: item.createdAt.toISOString(),
		})),
		total,
		page,
		pageSize,
	};
};

export const getAuditEvent = async (db: PrismaClient, id: string) => {
	const record = await db.auditEvent.findUnique({ where: { id } });
	if (!record) return null;
	return {
		...record,
		diff: normalizeAuditDiff(record.diff),
		createdAt: record.createdAt.toISOString(),
	};
};
