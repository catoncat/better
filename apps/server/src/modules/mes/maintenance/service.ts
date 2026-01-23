import {
	type MaintenanceEntityType,
	type MaintenanceRecord,
	MaintenanceStatus,
	type MaintenanceType,
	type Prisma,
	type PrismaClient,
} from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";

// ==========================================
// Types
// ==========================================

export type MaintenanceRecordSummary = {
	id: string;
	lineId: string | null;
	entityType: MaintenanceEntityType;
	entityId: string;
	entityDisplay: string | null;
	maintenanceType: MaintenanceType;
	status: MaintenanceStatus;
	description: string;
	reportedAt: string;
	reportedBy: string;
	completedAt: string | null;
	completedBy: string | null;
};

export type MaintenanceRecordDetail = MaintenanceRecordSummary & {
	resolution: string | null;
	partsReplaced: string | null;
	cost: number | null;
	startedAt: string | null;
	assignedTo: string | null;
	verifiedBy: string | null;
	verifiedAt: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ListMaintenanceQuery = {
	page?: number;
	pageSize?: number;
	lineId?: string;
	entityType?: MaintenanceEntityType;
	status?: MaintenanceStatus;
	from?: string;
	to?: string;
	sort?: string;
};

export type CreateMaintenanceInput = {
	lineId?: string;
	entityType: MaintenanceEntityType;
	entityId: string;
	entityDisplay?: string;
	maintenanceType: MaintenanceType;
	description: string;
	reportedAt?: string;
	assignedTo?: string;
	remark?: string;
};

export type UpdateMaintenanceInput = {
	status?: MaintenanceStatus;
	assignedTo?: string;
	resolution?: string;
	partsReplaced?: string;
	cost?: number;
	startedAt?: string;
	completedAt?: string;
	completedBy?: string;
	remark?: string;
};

export type CompleteMaintenanceInput = {
	resolution: string;
	partsReplaced?: string;
	cost?: number;
	remark?: string;
};

// ==========================================
// List
// ==========================================

export async function listMaintenanceRecords(
	db: PrismaClient,
	query: ListMaintenanceQuery,
): Promise<{ items: MaintenanceRecordSummary[]; total: number; page: number; pageSize: number }> {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 30;

	const where: Prisma.MaintenanceRecordWhereInput = {};

	if (query.lineId) where.lineId = query.lineId;
	if (query.entityType) where.entityType = query.entityType;
	if (query.status) where.status = query.status;
	if (query.from || query.to) {
		where.reportedAt = {};
		if (query.from) where.reportedAt.gte = new Date(query.from);
		if (query.to) where.reportedAt.lte = new Date(query.to);
	}

	const [records, total] = await Promise.all([
		db.maintenanceRecord.findMany({
			where,
			orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		db.maintenanceRecord.count({ where }),
	]);

	return {
		items: records.map(toSummary),
		total,
		page,
		pageSize,
	};
}

// ==========================================
// Get by ID
// ==========================================

export async function getMaintenanceRecord(
	db: PrismaClient,
	id: string,
): Promise<ServiceResult<MaintenanceRecordDetail>> {
	const record = await db.maintenanceRecord.findUnique({ where: { id } });
	if (!record) {
		return { success: false, code: "NOT_FOUND", message: "维修记录不存在" };
	}
	return { success: true, data: toDetail(record) };
}

// ==========================================
// Create
// ==========================================

export async function createMaintenanceRecord(
	db: PrismaClient,
	input: CreateMaintenanceInput,
	reportedBy: string,
): Promise<ServiceResult<MaintenanceRecordDetail>> {
	const record = await db.maintenanceRecord.create({
		data: {
			lineId: input.lineId,
			entityType: input.entityType,
			entityId: input.entityId,
			entityDisplay: input.entityDisplay,
			maintenanceType: input.maintenanceType,
			description: input.description,
			reportedAt: input.reportedAt ? new Date(input.reportedAt) : new Date(),
			reportedBy,
			assignedTo: input.assignedTo,
			remark: input.remark,
			status: MaintenanceStatus.PENDING,
		},
	});

	return { success: true, data: toDetail(record) };
}

// ==========================================
// Update
// ==========================================

export async function updateMaintenanceRecord(
	db: PrismaClient,
	id: string,
	input: UpdateMaintenanceInput,
): Promise<ServiceResult<MaintenanceRecordDetail>> {
	const existing = await db.maintenanceRecord.findUnique({ where: { id } });
	if (!existing) {
		return { success: false, code: "NOT_FOUND", message: "维修记录不存在" };
	}

	const record = await db.maintenanceRecord.update({
		where: { id },
		data: {
			status: input.status,
			assignedTo: input.assignedTo,
			resolution: input.resolution,
			partsReplaced: input.partsReplaced,
			cost: input.cost,
			startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
			completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
			completedBy: input.completedBy,
			remark: input.remark,
		},
	});

	return { success: true, data: toDetail(record) };
}

// ==========================================
// Complete
// ==========================================

export async function completeMaintenanceRecord(
	db: PrismaClient,
	id: string,
	input: CompleteMaintenanceInput,
	completedBy: string,
): Promise<ServiceResult<MaintenanceRecordDetail>> {
	const existing = await db.maintenanceRecord.findUnique({ where: { id } });
	if (!existing) {
		return { success: false, code: "NOT_FOUND", message: "维修记录不存在" };
	}

	if (existing.status === MaintenanceStatus.COMPLETED) {
		return { success: false, code: "ALREADY_COMPLETED", message: "维修记录已完成" };
	}

	const record = await db.maintenanceRecord.update({
		where: { id },
		data: {
			status: MaintenanceStatus.COMPLETED,
			resolution: input.resolution,
			partsReplaced: input.partsReplaced,
			cost: input.cost,
			completedAt: new Date(),
			completedBy,
			remark: input.remark ?? existing.remark,
		},
	});

	return { success: true, data: toDetail(record) };
}

// ==========================================
// Verify
// ==========================================

export async function verifyMaintenanceRecord(
	db: PrismaClient,
	id: string,
	verifiedBy: string,
	remark?: string,
): Promise<ServiceResult<MaintenanceRecordDetail>> {
	const existing = await db.maintenanceRecord.findUnique({ where: { id } });
	if (!existing) {
		return { success: false, code: "NOT_FOUND", message: "维修记录不存在" };
	}

	if (existing.status !== MaintenanceStatus.COMPLETED) {
		return { success: false, code: "NOT_COMPLETED", message: "维修记录尚未完成，无法验证" };
	}

	if (existing.verifiedBy) {
		return { success: false, code: "ALREADY_VERIFIED", message: "维修记录已验证" };
	}

	const record = await db.maintenanceRecord.update({
		where: { id },
		data: {
			verifiedBy,
			verifiedAt: new Date(),
			remark: remark ?? existing.remark,
		},
	});

	return { success: true, data: toDetail(record) };
}

// ==========================================
// Helpers
// ==========================================

function toSummary(record: MaintenanceRecord): MaintenanceRecordSummary {
	return {
		id: record.id,
		lineId: record.lineId,
		entityType: record.entityType,
		entityId: record.entityId,
		entityDisplay: record.entityDisplay,
		maintenanceType: record.maintenanceType,
		status: record.status,
		description: record.description,
		reportedAt: record.reportedAt.toISOString(),
		reportedBy: record.reportedBy,
		completedAt: record.completedAt?.toISOString() ?? null,
		completedBy: record.completedBy,
	};
}

function toDetail(record: MaintenanceRecord): MaintenanceRecordDetail {
	return {
		...toSummary(record),
		resolution: record.resolution,
		partsReplaced: record.partsReplaced,
		cost: record.cost,
		startedAt: record.startedAt?.toISOString() ?? null,
		assignedTo: record.assignedTo,
		verifiedBy: record.verifiedBy,
		verifiedAt: record.verifiedAt?.toISOString() ?? null,
		remark: record.remark,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}
