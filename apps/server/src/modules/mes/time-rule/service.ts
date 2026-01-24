import {
	Prisma,
	type PrismaClient,
	type TimeRuleDefinition,
	type TimeRuleInstance,
	TimeRuleInstanceStatus,
	type TimeRuleScope,
	type TimeRuleType,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

// ==========================================
// Types
// ==========================================

export type TimeRuleDefinitionDetail = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	ruleType: "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT";
	durationMinutes: number;
	warningMinutes: number | null;
	startEvent: string;
	endEvent: string;
	scope: "GLOBAL" | "LINE" | "ROUTING" | "PRODUCT";
	scopeValue: string | null;
	requiresWashStep: boolean;
	isWaivable: boolean;
	isActive: boolean;
	priority: number;
	createdAt: string;
	updatedAt: string;
};

export type TimeRuleInstanceDetail = {
	id: string;
	definitionId: string;
	definitionCode: string;
	definitionName: string;
	ruleType: TimeRuleType;
	runId: string | null;
	runNo: string | null;
	entityType: string;
	entityId: string;
	entityDisplay: string | null;
	startedAt: string;
	expiresAt: string;
	warningAt: string | null;
	status: TimeRuleInstanceStatus;
	completedAt: string | null;
	expiredAt: string | null;
	waivedAt: string | null;
	waivedBy: string | null;
	waiveReason: string | null;
	remainingMinutes: number | null;
	createdAt: string;
	updatedAt: string;
};

export type CreateInstanceInput = {
	definitionCode: string;
	runId?: string;
	entityType: string;
	entityId: string;
	entityDisplay?: string;
	startedAt?: Date;
};

export type WaiveInstanceInput = {
	instanceId: string;
	waivedBy: string;
	waiveReason: string;
};

// ==========================================
// Mappers
// ==========================================

const buildActiveKey = (definitionId: string, entityType: string, entityId: string) =>
	`${definitionId}:${entityType}:${entityId}`;

const mapDefinition = (def: TimeRuleDefinition): TimeRuleDefinitionDetail => ({
	id: def.id,
	code: def.code,
	name: def.name,
	description: def.description,
	ruleType: def.ruleType,
	durationMinutes: def.durationMinutes,
	warningMinutes: def.warningMinutes,
	startEvent: def.startEvent,
	endEvent: def.endEvent,
	scope: def.scope,
	scopeValue: def.scopeValue,
	requiresWashStep: def.requiresWashStep,
	isWaivable: def.isWaivable,
	isActive: def.isActive,
	priority: def.priority,
	createdAt: def.createdAt.toISOString(),
	updatedAt: def.updatedAt.toISOString(),
});

type InstanceWithRelations = TimeRuleInstance & {
	definition: TimeRuleDefinition;
	run: { runNo: string } | null;
};

const mapInstance = (inst: InstanceWithRelations): TimeRuleInstanceDetail => {
	const now = new Date();
	const expiresAt = new Date(inst.expiresAt);
	const remainingMs = expiresAt.getTime() - now.getTime();
	const remainingMinutes =
		inst.status === TimeRuleInstanceStatus.ACTIVE && remainingMs > 0
			? Math.ceil(remainingMs / 60000)
			: null;

	return {
		id: inst.id,
		definitionId: inst.definitionId,
		definitionCode: inst.definition.code,
		definitionName: inst.definition.name,
		ruleType: inst.definition.ruleType,
		runId: inst.runId,
		runNo: inst.run?.runNo ?? null,
		entityType: inst.entityType,
		entityId: inst.entityId,
		entityDisplay: inst.entityDisplay,
		startedAt: inst.startedAt.toISOString(),
		expiresAt: inst.expiresAt.toISOString(),
		warningAt: inst.warningAt?.toISOString() ?? null,
		status: inst.status,
		completedAt: inst.completedAt?.toISOString() ?? null,
		expiredAt: inst.expiredAt?.toISOString() ?? null,
		waivedAt: inst.waivedAt?.toISOString() ?? null,
		waivedBy: inst.waivedBy,
		waiveReason: inst.waiveReason,
		remainingMinutes,
		createdAt: inst.createdAt.toISOString(),
		updatedAt: inst.updatedAt.toISOString(),
	};
};

// ==========================================
// Definition CRUD
// ==========================================

export async function listDefinitions(
	db: PrismaClient,
	options?: {
		page?: number;
		pageSize?: number;
		code?: string;
		name?: string;
		ruleType?: TimeRuleType;
		isActive?: boolean;
		sortBy?: string;
		sortDir?: "asc" | "desc";
	},
): Promise<{ items: TimeRuleDefinitionDetail[]; total: number }> {
	const where: Prisma.TimeRuleDefinitionWhereInput = {};

	if (options?.code) {
		where.code = { contains: options.code };
	}
	if (options?.name) {
		where.name = { contains: options.name };
	}
	if (options?.ruleType) {
		where.ruleType = options.ruleType;
	}
	if (options?.isActive !== undefined) {
		where.isActive = options.isActive;
	}

	const skip = ((options?.page ?? 1) - 1) * (options?.pageSize ?? 30);
	const take = options?.pageSize ?? 30;

	const [items, total] = await Promise.all([
		db.timeRuleDefinition.findMany({
			where,
			skip,
			take,
			orderBy: options?.sortBy
				? { [options.sortBy]: options.sortDir ?? "asc" }
				: [{ priority: "desc" }, { code: "asc" }],
		}),
		db.timeRuleDefinition.count({ where }),
	]);

	return {
		items: items.map(mapDefinition),
		total,
	};
}

export async function getDefinitionById(
	db: PrismaClient,
	id: string,
): Promise<TimeRuleDefinitionDetail | null> {
	const definition = await db.timeRuleDefinition.findUnique({
		where: { id },
	});
	return definition ? mapDefinition(definition) : null;
}

export async function getDefinitionByCode(
	db: PrismaClient,
	code: string,
): Promise<TimeRuleDefinitionDetail | null> {
	const definition = await db.timeRuleDefinition.findUnique({
		where: { code },
	});
	return definition ? mapDefinition(definition) : null;
}

export type CreateDefinitionInput = {
	code: string;
	name: string;
	description?: string | null;
	ruleType: TimeRuleType;
	durationMinutes: number;
	warningMinutes?: number | null;
	startEvent: string;
	endEvent: string;
	scope?: TimeRuleScope;
	scopeValue?: string | null;
	requiresWashStep?: boolean;
	isWaivable?: boolean;
	isActive?: boolean;
	priority?: number;
};

export type UpdateDefinitionInput = Partial<Omit<CreateDefinitionInput, "code">>;

export async function createDefinition(
	db: PrismaClient,
	input: CreateDefinitionInput,
): Promise<ServiceResult<TimeRuleDefinitionDetail>> {
	const existing = await db.timeRuleDefinition.findUnique({
		where: { code: input.code },
	});
	if (existing) {
		return {
			success: false,
			code: "DEFINITION_EXISTS",
			message: `Time rule definition with code "${input.code}" already exists`,
			status: 409,
		};
	}

	const definition = await db.timeRuleDefinition.create({
		data: {
			code: input.code,
			name: input.name,
			description: input.description ?? null,
			ruleType: input.ruleType,
			durationMinutes: input.durationMinutes,
			warningMinutes: input.warningMinutes ?? null,
			startEvent: input.startEvent,
			endEvent: input.endEvent,
			scope: input.scope ?? "GLOBAL",
			scopeValue: input.scopeValue ?? null,
			requiresWashStep: input.requiresWashStep ?? false,
			isWaivable: input.isWaivable ?? true,
			isActive: input.isActive ?? true,
			priority: input.priority ?? 0,
		},
	});

	return { success: true, data: mapDefinition(definition) };
}

export async function updateDefinition(
	db: PrismaClient,
	id: string,
	input: UpdateDefinitionInput,
): Promise<ServiceResult<TimeRuleDefinitionDetail>> {
	const existing = await db.timeRuleDefinition.findUnique({
		where: { id },
	});
	if (!existing) {
		return {
			success: false,
			code: "DEFINITION_NOT_FOUND",
			message: `Time rule definition with id "${id}" not found`,
			status: 404,
		};
	}

	const definition = await db.timeRuleDefinition.update({
		where: { id },
		data: {
			name: input.name,
			description: input.description,
			ruleType: input.ruleType,
			durationMinutes: input.durationMinutes,
			warningMinutes: input.warningMinutes,
			startEvent: input.startEvent,
			endEvent: input.endEvent,
			scope: input.scope,
			scopeValue: input.scopeValue,
			requiresWashStep: input.requiresWashStep,
			isWaivable: input.isWaivable,
			isActive: input.isActive,
			priority: input.priority,
		},
	});

	return { success: true, data: mapDefinition(definition) };
}

export async function deleteDefinition(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<{ id: string }>> {
	const existing = await db.timeRuleDefinition.findUnique({
		where: { id },
	});
	if (!existing) {
		return {
			success: false,
			code: "DEFINITION_NOT_FOUND",
			message: "Time rule definition not found",
			status: 404,
		};
	}

	// Check for active instances
	const activeInstances = await db.timeRuleInstance.count({
		where: {
			definitionId: id,
			status: "ACTIVE",
		},
	});
	if (activeInstances > 0) {
		return {
			success: false,
			code: "HAS_ACTIVE_INSTANCES",
			message: "Cannot delete definition with active instances",
			status: 400,
		};
	}

	await db.timeRuleDefinition.delete({
		where: { id },
	});

	return { success: true, data: { id } };
}

// ==========================================
// Instance Operations
// ==========================================

export async function createInstance(
	db: PrismaClient,
	input: CreateInstanceInput,
): Promise<ServiceResult<TimeRuleInstanceDetail>> {
	const definition = await db.timeRuleDefinition.findUnique({
		where: { code: input.definitionCode },
	});
	if (!definition) {
		return {
			success: false,
			code: "DEFINITION_NOT_FOUND",
			message: `Time rule definition "${input.definitionCode}" not found`,
			status: 404,
		};
	}
	if (!definition.isActive) {
		return {
			success: false,
			code: "DEFINITION_INACTIVE",
			message: `Time rule definition "${input.definitionCode}" is not active`,
			status: 400,
		};
	}

	// Check for existing active instance for same entity
	const existingActive = await db.timeRuleInstance.findFirst({
		where: {
			definitionId: definition.id,
			entityType: input.entityType,
			entityId: input.entityId,
			status: TimeRuleInstanceStatus.ACTIVE,
		},
	});
	if (existingActive) {
		return {
			success: false,
			code: "INSTANCE_ALREADY_ACTIVE",
			message: `An active time rule instance already exists for this entity`,
			status: 409,
		};
	}

	const startedAt = input.startedAt ?? new Date();
	const expiresAt = new Date(startedAt.getTime() + definition.durationMinutes * 60000);
	const warningAt = definition.warningMinutes
		? new Date(expiresAt.getTime() - definition.warningMinutes * 60000)
		: null;
	const activeKey = buildActiveKey(definition.id, input.entityType, input.entityId);

	try {
		const instance = await db.timeRuleInstance.create({
			data: {
				definitionId: definition.id,
				runId: input.runId ?? null,
				entityType: input.entityType,
				entityId: input.entityId,
				entityDisplay: input.entityDisplay ?? null,
				activeKey,
				startedAt,
				expiresAt,
				warningAt,
				status: TimeRuleInstanceStatus.ACTIVE,
			},
			include: {
				definition: true,
				run: { select: { runNo: true } },
			},
		});
		return { success: true, data: mapInstance(instance) };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				success: false,
				code: "INSTANCE_ALREADY_ACTIVE",
				message: `An active time rule instance already exists for this entity`,
				status: 409,
			};
		}
		throw error;
	}
}

export async function completeInstance(
	db: PrismaClient,
	instanceId: string,
): Promise<ServiceResult<TimeRuleInstanceDetail>> {
	const instance = await db.timeRuleInstance.findUnique({
		where: { id: instanceId },
		include: { definition: true, run: { select: { runNo: true } } },
	});
	if (!instance) {
		return {
			success: false,
			code: "INSTANCE_NOT_FOUND",
			message: "Time rule instance not found",
			status: 404,
		};
	}
	if (instance.status !== TimeRuleInstanceStatus.ACTIVE) {
		return {
			success: false,
			code: "INSTANCE_NOT_ACTIVE",
			message: `Instance is not active (current status: ${instance.status})`,
			status: 400,
		};
	}

	const updated = await db.timeRuleInstance.update({
		where: { id: instanceId },
		data: {
			status: TimeRuleInstanceStatus.COMPLETED,
			completedAt: new Date(),
			activeKey: null,
		},
		include: { definition: true, run: { select: { runNo: true } } },
	});

	return { success: true, data: mapInstance(updated) };
}

export async function completeInstanceByEntity(
	db: PrismaClient,
	definitionCode: string,
	entityType: string,
	entityId: string,
): Promise<ServiceResult<TimeRuleInstanceDetail | null>> {
	const instance = await db.timeRuleInstance.findFirst({
		where: {
			definition: { code: definitionCode },
			entityType,
			entityId,
			status: TimeRuleInstanceStatus.ACTIVE,
		},
		include: { definition: true, run: { select: { runNo: true } } },
	});

	if (!instance) {
		// No active instance - that's OK, return null
		return { success: true, data: null };
	}

	const updated = await db.timeRuleInstance.update({
		where: { id: instance.id },
		data: {
			status: TimeRuleInstanceStatus.COMPLETED,
			completedAt: new Date(),
			activeKey: null,
		},
		include: { definition: true, run: { select: { runNo: true } } },
	});

	return { success: true, data: mapInstance(updated) };
}

export async function waiveInstance(
	db: PrismaClient,
	input: WaiveInstanceInput,
): Promise<ServiceResult<TimeRuleInstanceDetail>> {
	const instance = await db.timeRuleInstance.findUnique({
		where: { id: input.instanceId },
		include: { definition: true, run: { select: { runNo: true } } },
	});
	if (!instance) {
		return {
			success: false,
			code: "INSTANCE_NOT_FOUND",
			message: "Time rule instance not found",
			status: 404,
		};
	}
	if (!instance.definition.isWaivable) {
		return {
			success: false,
			code: "INSTANCE_NOT_WAIVABLE",
			message: "This time rule instance cannot be waived",
			status: 400,
		};
	}
	if (
		instance.status !== TimeRuleInstanceStatus.ACTIVE &&
		instance.status !== TimeRuleInstanceStatus.EXPIRED
	) {
		return {
			success: false,
			code: "INSTANCE_INVALID_STATUS",
			message: `Cannot waive instance with status: ${instance.status}`,
			status: 400,
		};
	}

	const updated = await db.timeRuleInstance.update({
		where: { id: input.instanceId },
		data: {
			status: TimeRuleInstanceStatus.WAIVED,
			waivedAt: new Date(),
			waivedBy: input.waivedBy,
			waiveReason: input.waiveReason,
			activeKey: null,
		},
		include: { definition: true, run: { select: { runNo: true } } },
	});

	// If there's a linked ReadinessCheckItem, update it too
	if (updated.readinessItemId) {
		await db.readinessCheckItem.update({
			where: { id: updated.readinessItemId },
			data: {
				status: "WAIVED",
				waivedAt: new Date(),
				waivedBy: input.waivedBy,
				waiveReason: input.waiveReason,
			},
		});
	}

	return { success: true, data: mapInstance(updated) };
}

export async function findActiveInstance(
	db: PrismaClient,
	definitionCode: string,
	entityType: string,
	entityId: string,
): Promise<TimeRuleInstanceDetail | null> {
	const instance = await db.timeRuleInstance.findFirst({
		where: {
			definition: { code: definitionCode },
			entityType,
			entityId,
			status: TimeRuleInstanceStatus.ACTIVE,
		},
		include: { definition: true, run: { select: { runNo: true } } },
	});
	return instance ? mapInstance(instance) : null;
}

export async function listInstancesByRun(
	db: PrismaClient,
	runId: string,
): Promise<TimeRuleInstanceDetail[]> {
	const instances = await db.timeRuleInstance.findMany({
		where: { runId },
		include: { definition: true, run: { select: { runNo: true } } },
		orderBy: { createdAt: "desc" },
	});
	return instances.map(mapInstance);
}

export async function listActiveInstances(
	db: PrismaClient,
	options?: { runId?: string; ruleType?: TimeRuleType },
): Promise<TimeRuleInstanceDetail[]> {
	const where: Prisma.TimeRuleInstanceWhereInput = {
		status: TimeRuleInstanceStatus.ACTIVE,
	};
	if (options?.runId) {
		where.runId = options.runId;
	}
	if (options?.ruleType) {
		where.definition = { ruleType: options.ruleType };
	}

	const instances = await db.timeRuleInstance.findMany({
		where,
		include: { definition: true, run: { select: { runNo: true } } },
		orderBy: { expiresAt: "asc" },
	});
	return instances.map(mapInstance);
}

// ==========================================
// Route Utilities
// ==========================================

/**
 * Check if a route version has a WASH step (operation code containing "WASH")
 */
export async function routeHasWashStep(db: PrismaClient, routeVersionId: string): Promise<boolean> {
	const version = await db.executableRouteVersion.findUnique({
		where: { id: routeVersionId },
		select: { routingId: true },
	});
	if (!version) return false;

	// Check if routing has any step with operation code containing "WASH"
	const washStep = await db.routingStep.findFirst({
		where: {
			routingId: version.routingId,
			operation: {
				code: { contains: "WASH", mode: "insensitive" },
			},
		},
	});

	return washStep !== null;
}

/**
 * Check if a run's route has a WASH step
 */
export async function runHasWashStep(db: PrismaClient, runId: string): Promise<boolean> {
	const run = await db.run.findUnique({
		where: { id: runId },
		select: { routeVersionId: true },
	});
	if (!run?.routeVersionId) return false;
	return routeHasWashStep(db, run.routeVersionId);
}

// ==========================================
// Cron Job Support
// ==========================================

/**
 * Find instances that have expired but not yet marked as EXPIRED
 */
export async function findExpiredInstances(db: PrismaClient): Promise<TimeRuleInstance[]> {
	const now = new Date();
	return db.timeRuleInstance.findMany({
		where: {
			status: TimeRuleInstanceStatus.ACTIVE,
			expiresAt: { lte: now },
		},
	});
}

/**
 * Find instances approaching warning threshold
 */
export async function findWarningInstances(db: PrismaClient): Promise<TimeRuleInstance[]> {
	const now = new Date();
	return db.timeRuleInstance.findMany({
		where: {
			status: TimeRuleInstanceStatus.ACTIVE,
			warningNotified: false,
			warningAt: { lte: now },
			expiresAt: { gt: now },
		},
	});
}

/**
 * Mark instance as expired
 */
export async function markInstanceExpired(
	db: PrismaClient,
	instanceId: string,
): Promise<TimeRuleInstance> {
	return db.timeRuleInstance.update({
		where: { id: instanceId },
		data: {
			status: TimeRuleInstanceStatus.EXPIRED,
			expiredAt: new Date(),
			expiryNotified: true,
			activeKey: null,
		},
	});
}

/**
 * Mark instance warning as notified
 */
export async function markWarningNotified(
	db: PrismaClient,
	instanceId: string,
): Promise<TimeRuleInstance> {
	return db.timeRuleInstance.update({
		where: { id: instanceId },
		data: { warningNotified: true },
	});
}
