import type { Prisma, PrismaClient, ReflowProfileStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

// ==========================================
// ReflowProfile Service
// ==========================================

interface ListProfilesQuery {
	status?: ReflowProfileStatus;
	search?: string;
	page?: number;
	pageSize?: number;
}

interface ProfileItem {
	id: string;
	code: string;
	name: string;
	version: string;
	description: string | null;
	status: ReflowProfileStatus;
	zoneConfig: unknown;
	peakTempMin: number | null;
	peakTempMax: number | null;
	totalTimeMin: number | null;
	totalTimeMax: number | null;
	meta: unknown;
	createdAt: string;
	updatedAt: string;
}

function toProfileItem(profile: {
	id: string;
	code: string;
	name: string;
	version: string;
	description: string | null;
	status: ReflowProfileStatus;
	zoneConfig: unknown;
	peakTempMin: number | null;
	peakTempMax: number | null;
	totalTimeMin: number | null;
	totalTimeMax: number | null;
	meta: unknown;
	createdAt: Date;
	updatedAt: Date;
}): ProfileItem {
	return {
		...profile,
		createdAt: profile.createdAt.toISOString(),
		updatedAt: profile.updatedAt.toISOString(),
	};
}

export async function listReflowProfiles(
	db: PrismaClient,
	query: ListProfilesQuery,
): Promise<{
	items: ProfileItem[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 30;
	const skip = (page - 1) * pageSize;

	const where: Prisma.ReflowProfileWhereInput = {};

	if (query.status) {
		where.status = query.status;
	}

	if (query.search) {
		where.OR = [{ code: { contains: query.search } }, { name: { contains: query.search } }];
	}

	const [rawItems, total] = await Promise.all([
		db.reflowProfile.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: pageSize,
		}),
		db.reflowProfile.count({ where }),
	]);

	const items = rawItems.map(toProfileItem);

	return { items, total, page, pageSize };
}

interface CreateProfileInput {
	code: string;
	name: string;
	version?: string;
	description?: string;
	status?: ReflowProfileStatus;
	zoneConfig?: Prisma.InputJsonValue;
	peakTempMin?: number;
	peakTempMax?: number;
	totalTimeMin?: number;
	totalTimeMax?: number;
	meta?: Prisma.InputJsonValue;
}

export async function createReflowProfile(
	db: PrismaClient,
	input: CreateProfileInput,
): Promise<ServiceResult<ProfileItem>> {
	// Check for duplicate code
	const existing = await db.reflowProfile.findUnique({
		where: { code: input.code },
	});

	if (existing) {
		return {
			success: false,
			code: "DUPLICATE_CODE",
			message: `Profile with code '${input.code}' already exists`,
			status: 409,
		};
	}

	const profile = await db.reflowProfile.create({
		data: {
			code: input.code,
			name: input.name,
			version: input.version ?? "1.0",
			description: input.description,
			status: input.status ?? "ACTIVE",
			zoneConfig: input.zoneConfig,
			peakTempMin: input.peakTempMin,
			peakTempMax: input.peakTempMax,
			totalTimeMin: input.totalTimeMin,
			totalTimeMax: input.totalTimeMax,
			meta: input.meta,
		},
	});

	return { success: true, data: toProfileItem(profile) };
}

export async function getReflowProfile(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<ProfileItem>> {
	const profile = await db.reflowProfile.findUnique({
		where: { id },
	});

	if (!profile) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: `Profile with id '${id}' not found`,
			status: 404,
		};
	}

	return { success: true, data: toProfileItem(profile) };
}

interface UpdateProfileInput {
	name?: string;
	version?: string;
	description?: string;
	status?: ReflowProfileStatus;
	zoneConfig?: Prisma.InputJsonValue;
	peakTempMin?: number;
	peakTempMax?: number;
	totalTimeMin?: number;
	totalTimeMax?: number;
	meta?: Prisma.InputJsonValue;
}

export async function updateReflowProfile(
	db: PrismaClient,
	id: string,
	input: UpdateProfileInput,
): Promise<ServiceResult<ProfileItem>> {
	const existing = await db.reflowProfile.findUnique({
		where: { id },
	});

	if (!existing) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: `Profile with id '${id}' not found`,
			status: 404,
		};
	}

	const profile = await db.reflowProfile.update({
		where: { id },
		data: input,
	});

	return { success: true, data: toProfileItem(profile) };
}

export async function deleteReflowProfile(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<{ id: string }>> {
	const existing = await db.reflowProfile.findUnique({
		where: { id },
		include: { usageRecords: { take: 1 } },
	});

	if (!existing) {
		return {
			success: false,
			code: "NOT_FOUND",
			message: `Profile with id '${id}' not found`,
			status: 404,
		};
	}

	if (existing.usageRecords.length > 0) {
		return {
			success: false,
			code: "HAS_USAGE_RECORDS",
			message: "Cannot delete profile with usage records. Archive it instead.",
			status: 400,
		};
	}

	await db.reflowProfile.delete({ where: { id } });

	return { success: true, data: { id } };
}

// ==========================================
// ReflowProfileUsage Service
// ==========================================

interface ListUsageQuery {
	profileId?: string;
	runId?: string;
	lineId?: string;
	isMatched?: boolean;
	usedFrom?: string;
	usedTo?: string;
	page?: number;
	pageSize?: number;
}

interface UsageItem {
	id: string;
	profileId: string;
	profileCode: string | null;
	profileName: string | null;
	runId: string | null;
	lineId: string | null;
	equipmentId: string | null;
	actualProgramName: string;
	actualPeakTemp: number | null;
	actualTotalTime: number | null;
	isMatched: boolean;
	mismatchReason: string | null;
	usedAt: string;
	usedBy: string | null;
	verifiedBy: string | null;
	verifiedAt: string | null;
	meta: unknown;
	createdAt: string;
	updatedAt: string;
}

export async function listReflowProfileUsages(
	db: PrismaClient,
	query: ListUsageQuery,
): Promise<{
	items: UsageItem[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 30;
	const skip = (page - 1) * pageSize;

	const where: Prisma.ReflowProfileUsageWhereInput = {};

	if (query.profileId) where.profileId = query.profileId;
	if (query.runId) where.runId = query.runId;
	if (query.lineId) where.lineId = query.lineId;
	if (query.isMatched !== undefined) where.isMatched = query.isMatched;

	if (query.usedFrom || query.usedTo) {
		where.usedAt = {};
		if (query.usedFrom) where.usedAt.gte = new Date(query.usedFrom);
		if (query.usedTo) where.usedAt.lte = new Date(query.usedTo);
	}

	const [rawItems, total] = await Promise.all([
		db.reflowProfileUsage.findMany({
			where,
			include: {
				profile: { select: { code: true, name: true } },
			},
			orderBy: { usedAt: "desc" },
			skip,
			take: pageSize,
		}),
		db.reflowProfileUsage.count({ where }),
	]);

	const items: UsageItem[] = rawItems.map((item) => ({
		id: item.id,
		profileId: item.profileId,
		profileCode: item.profile.code,
		profileName: item.profile.name,
		runId: item.runId,
		lineId: item.lineId,
		equipmentId: item.equipmentId,
		actualProgramName: item.actualProgramName,
		actualPeakTemp: item.actualPeakTemp,
		actualTotalTime: item.actualTotalTime,
		isMatched: item.isMatched,
		mismatchReason: item.mismatchReason,
		usedAt: item.usedAt.toISOString(),
		usedBy: item.usedBy,
		verifiedBy: item.verifiedBy,
		verifiedAt: item.verifiedAt?.toISOString() ?? null,
		meta: item.meta,
		createdAt: item.createdAt.toISOString(),
		updatedAt: item.updatedAt.toISOString(),
	}));

	return { items, total, page, pageSize };
}

interface CreateUsageInput {
	profileId: string;
	runId?: string;
	lineId?: string;
	equipmentId?: string;
	actualProgramName: string;
	actualPeakTemp?: number;
	actualTotalTime?: number;
	usedAt?: string;
	usedBy?: string;
	meta?: Prisma.InputJsonValue;
}

interface CreateUsageResult {
	id: string;
	profileId: string;
	isMatched: boolean;
	mismatchReason: string | null;
}

export async function createReflowProfileUsage(
	db: PrismaClient,
	input: CreateUsageInput,
): Promise<ServiceResult<CreateUsageResult>> {
	// Get the profile to verify
	const profile = await db.reflowProfile.findUnique({
		where: { id: input.profileId },
	});

	if (!profile) {
		return {
			success: false,
			code: "PROFILE_NOT_FOUND",
			message: `Profile with id '${input.profileId}' not found`,
			status: 404,
		};
	}

	// Check if actual program matches expected
	const isMatched = input.actualProgramName === profile.code;
	const mismatchReason = isMatched
		? null
		: `Expected '${profile.code}', got '${input.actualProgramName}'`;

	const usage = await db.reflowProfileUsage.create({
		data: {
			profileId: input.profileId,
			runId: input.runId,
			lineId: input.lineId,
			equipmentId: input.equipmentId,
			actualProgramName: input.actualProgramName,
			actualPeakTemp: input.actualPeakTemp,
			actualTotalTime: input.actualTotalTime,
			isMatched,
			mismatchReason,
			usedAt: input.usedAt ? new Date(input.usedAt) : new Date(),
			usedBy: input.usedBy,
			meta: input.meta,
		},
	});

	return {
		success: true,
		data: {
			id: usage.id,
			profileId: usage.profileId,
			isMatched: usage.isMatched,
			mismatchReason: usage.mismatchReason,
		},
	};
}

// ==========================================
// Profile Verification Service
// ==========================================

interface VerifyProfileInput {
	profileId: string;
	actualProgramName: string;
}

interface VerifyProfileResult {
	isMatched: boolean;
	expectedCode: string;
	actualProgramName: string;
	mismatchReason: string | null;
}

export async function verifyReflowProfile(
	db: PrismaClient,
	input: VerifyProfileInput,
): Promise<ServiceResult<VerifyProfileResult>> {
	const profile = await db.reflowProfile.findUnique({
		where: { id: input.profileId },
	});

	if (!profile) {
		return {
			success: false,
			code: "PROFILE_NOT_FOUND",
			message: `Profile with id '${input.profileId}' not found`,
			status: 404,
		};
	}

	const isMatched = input.actualProgramName === profile.code;
	const mismatchReason = isMatched
		? null
		: `Expected '${profile.code}', got '${input.actualProgramName}'`;

	return {
		success: true,
		data: {
			isMatched,
			expectedCode: profile.code,
			actualProgramName: input.actualProgramName,
			mismatchReason,
		},
	};
}
