import { OqcSamplingType, type Prisma, type PrismaClient } from "@better-app/db";
import type { Static } from "elysia";
import type { ServiceResult } from "../../../types/service-result";
import type { createSamplingRuleSchema, updateSamplingRuleSchema } from "./schema";

type CreateSamplingRuleInput = Static<typeof createSamplingRuleSchema>;
type UpdateSamplingRuleInput = Static<typeof updateSamplingRuleSchema>;

type SamplingRuleRecord = Prisma.OqcSamplingRuleGetPayload<{
	include: {
		line: { select: { code: true; name: true } };
		routing: { select: { code: true; name: true } };
	};
}>;

/**
 * List OQC sampling rules with pagination and filters.
 */
export async function listSamplingRules(
	db: PrismaClient,
	query: {
		productCode?: string;
		lineId?: string;
		routingId?: string;
		isActive?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<{
	items: SamplingRuleRecord[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = Math.min(query.pageSize ?? 20, 100);

	const where: Prisma.OqcSamplingRuleWhereInput = {};

	if (query.productCode) {
		where.productCode = { contains: query.productCode };
	}

	if (query.lineId) {
		where.lineId = query.lineId;
	}

	if (query.routingId) {
		where.routingId = query.routingId;
	}

	if (query.isActive !== undefined) {
		where.isActive = query.isActive === "true";
	}

	const include = {
		line: { select: { code: true, name: true } },
		routing: { select: { code: true, name: true } },
	};

	const [items, total] = await Promise.all([
		db.oqcSamplingRule.findMany({
			where,
			orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
			include,
		}),
		db.oqcSamplingRule.count({ where }),
	]);

	return { items, total, page, pageSize };
}

/**
 * Get a sampling rule by ID.
 */
export async function getSamplingRule(
	db: PrismaClient,
	ruleId: string,
): Promise<ServiceResult<SamplingRuleRecord>> {
	const rule = await db.oqcSamplingRule.findUnique({
		where: { id: ruleId },
		include: {
			line: { select: { code: true, name: true } },
			routing: { select: { code: true, name: true } },
		},
	});

	if (!rule) {
		return {
			success: false as const,
			code: "SAMPLING_RULE_NOT_FOUND",
			message: "OQC sampling rule not found",
			status: 404,
		};
	}

	return { success: true as const, data: rule };
}

/**
 * Create a new OQC sampling rule.
 */
export async function createSamplingRule(
	db: PrismaClient,
	data: CreateSamplingRuleInput,
): Promise<ServiceResult<SamplingRuleRecord>> {
	// Validate line exists if lineId provided
	if (data.lineId) {
		const line = await db.line.findUnique({ where: { id: data.lineId } });
		if (!line) {
			return {
				success: false as const,
				code: "LINE_NOT_FOUND",
				message: "Line not found",
				status: 404,
			};
		}
	}

	// Validate routing exists if routingId provided
	if (data.routingId) {
		const routing = await db.routing.findUnique({ where: { id: data.routingId } });
		if (!routing) {
			return {
				success: false as const,
				code: "ROUTING_NOT_FOUND",
				message: "Routing not found",
				status: 404,
			};
		}
	}

	// Validate sampleValue based on samplingType
	if (data.samplingType === "PERCENTAGE" && (data.sampleValue < 0 || data.sampleValue > 100)) {
		return {
			success: false as const,
			code: "INVALID_SAMPLE_VALUE",
			message: "Percentage must be between 0 and 100",
			status: 400,
		};
	}

	if (data.samplingType === "FIXED" && data.sampleValue < 1) {
		return {
			success: false as const,
			code: "INVALID_SAMPLE_VALUE",
			message: "Fixed sample count must be at least 1",
			status: 400,
		};
	}

	const rule = await db.oqcSamplingRule.create({
		data: {
			productCode: data.productCode ?? null,
			lineId: data.lineId ?? null,
			routingId: data.routingId ?? null,
			samplingType: data.samplingType as OqcSamplingType,
			sampleValue: data.sampleValue,
			priority: data.priority ?? 0,
			isActive: data.isActive ?? true,
			meta: data.meta ?? null,
		},
		include: {
			line: { select: { code: true, name: true } },
			routing: { select: { code: true, name: true } },
		},
	});

	return { success: true as const, data: rule };
}

/**
 * Update an existing OQC sampling rule.
 */
export async function updateSamplingRule(
	db: PrismaClient,
	ruleId: string,
	data: UpdateSamplingRuleInput,
): Promise<ServiceResult<SamplingRuleRecord>> {
	const existing = await db.oqcSamplingRule.findUnique({ where: { id: ruleId } });
	if (!existing) {
		return {
			success: false as const,
			code: "SAMPLING_RULE_NOT_FOUND",
			message: "OQC sampling rule not found",
			status: 404,
		};
	}

	// Validate line exists if lineId provided
	if (data.lineId !== undefined && data.lineId !== null) {
		const line = await db.line.findUnique({ where: { id: data.lineId } });
		if (!line) {
			return {
				success: false as const,
				code: "LINE_NOT_FOUND",
				message: "Line not found",
				status: 404,
			};
		}
	}

	// Validate routing exists if routingId provided
	if (data.routingId !== undefined && data.routingId !== null) {
		const routing = await db.routing.findUnique({ where: { id: data.routingId } });
		if (!routing) {
			return {
				success: false as const,
				code: "ROUTING_NOT_FOUND",
				message: "Routing not found",
				status: 404,
			};
		}
	}

	// Determine the final samplingType for validation
	const finalSamplingType = data.samplingType ?? existing.samplingType;
	const finalSampleValue = data.sampleValue ?? existing.sampleValue;

	// Validate sampleValue based on samplingType
	if (finalSamplingType === "PERCENTAGE" && (finalSampleValue < 0 || finalSampleValue > 100)) {
		return {
			success: false as const,
			code: "INVALID_SAMPLE_VALUE",
			message: "Percentage must be between 0 and 100",
			status: 400,
		};
	}

	if (finalSamplingType === "FIXED" && finalSampleValue < 1) {
		return {
			success: false as const,
			code: "INVALID_SAMPLE_VALUE",
			message: "Fixed sample count must be at least 1",
			status: 400,
		};
	}

	const updateData: Prisma.OqcSamplingRuleUpdateInput = {};

	if (data.productCode !== undefined) updateData.productCode = data.productCode;
	if (data.lineId !== undefined)
		updateData.line = data.lineId ? { connect: { id: data.lineId } } : { disconnect: true };
	if (data.routingId !== undefined)
		updateData.routing = data.routingId
			? { connect: { id: data.routingId } }
			: { disconnect: true };
	if (data.samplingType !== undefined)
		updateData.samplingType = data.samplingType as OqcSamplingType;
	if (data.sampleValue !== undefined) updateData.sampleValue = data.sampleValue;
	if (data.priority !== undefined) updateData.priority = data.priority;
	if (data.isActive !== undefined) updateData.isActive = data.isActive;
	if (data.meta !== undefined) updateData.meta = data.meta;

	const rule = await db.oqcSamplingRule.update({
		where: { id: ruleId },
		data: updateData,
		include: {
			line: { select: { code: true, name: true } },
			routing: { select: { code: true, name: true } },
		},
	});

	return { success: true as const, data: rule };
}

/**
 * Delete (deactivate) an OQC sampling rule.
 */
export async function deleteSamplingRule(
	db: PrismaClient,
	ruleId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
	const existing = await db.oqcSamplingRule.findUnique({ where: { id: ruleId } });
	if (!existing) {
		return {
			success: false as const,
			code: "SAMPLING_RULE_NOT_FOUND",
			message: "OQC sampling rule not found",
			status: 404,
		};
	}

	// Soft delete by setting isActive to false
	await db.oqcSamplingRule.update({
		where: { id: ruleId },
		data: { isActive: false },
	});

	return { success: true as const, data: { deleted: true } };
}

/**
 * Find the applicable sampling rule for a run based on product code, line, and routing.
 * Rules are matched in priority order (highest priority wins).
 * More specific rules (with more criteria) are preferred.
 */
export async function getApplicableRule(
	db: PrismaClient,
	params: {
		productCode?: string | null;
		lineId?: string | null;
		routingId?: string | null;
	},
): Promise<SamplingRuleRecord | null> {
	// Build conditions based on provided parameters
	// More specific matches are handled by priority in the rules themselves
	const baseCondition: Prisma.OqcSamplingRuleWhereInput = {
		isActive: true,
		AND: [
			// Product code: either matches or rule has no product code restriction
			{
				OR: [
					{ productCode: null },
					...(params.productCode ? [{ productCode: params.productCode }] : []),
				],
			},
			// Line: either matches or rule has no line restriction
			{
				OR: [{ lineId: null }, ...(params.lineId ? [{ lineId: params.lineId }] : [])],
			},
			// Routing: either matches or rule has no routing restriction
			{
				OR: [{ routingId: null }, ...(params.routingId ? [{ routingId: params.routingId }] : [])],
			},
		],
	};

	const rules = await db.oqcSamplingRule.findMany({
		where: baseCondition,
		orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
		include: {
			line: { select: { code: true, name: true } },
			routing: { select: { code: true, name: true } },
		},
	});

	if (rules.length === 0) {
		return null;
	}

	const sorted = rules
		.map((rule) => ({
			rule,
			specificity: (rule.productCode ? 1 : 0) + (rule.lineId ? 1 : 0) + (rule.routingId ? 1 : 0),
		}))
		.sort((a, b) => {
			if (a.specificity !== b.specificity) {
				return b.specificity - a.specificity;
			}
			if (a.rule.priority !== b.rule.priority) {
				return b.rule.priority - a.rule.priority;
			}
			return b.rule.createdAt.getTime() - a.rule.createdAt.getTime();
		});

	const selected = sorted[0]?.rule ?? null;
	return selected;
}

/**
 * Calculate sample size based on rule and unit count.
 */
export function calculateSampleSize(
	rule: { samplingType: OqcSamplingType | string; sampleValue: number },
	unitCount: number,
): number {
	if (unitCount <= 0) return 0;

	if (rule.samplingType === "PERCENTAGE" || rule.samplingType === OqcSamplingType.PERCENTAGE) {
		// Percentage-based: sample at least 1 unit, at most unitCount
		const calculated = Math.ceil((unitCount * rule.sampleValue) / 100);
		return Math.max(1, Math.min(calculated, unitCount));
	}

	// Fixed count: sample the specified number or unitCount, whichever is smaller
	return Math.min(Math.ceil(rule.sampleValue), unitCount);
}
