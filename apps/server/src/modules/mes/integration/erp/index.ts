import type { PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../../../types/service-result";
import { createSyncPipeline, type SyncResult } from "../sync-pipeline";
import { applyBoms } from "./apply-boms";
import { applyMaterials } from "./apply-materials";
import { applyRoutes } from "./apply-routes";
import { applyWorkCenters } from "./apply-work-centers";
import { applyWorkOrders } from "./apply-work-orders";
import { pullBoms } from "./pull-boms";
import { pullMaterials } from "./pull-materials";
import { pullRoutes, pullRoutesPaginated } from "./pull-routes";
import { pullWorkCenters } from "./pull-work-centers";
import { pullWorkOrders } from "./pull-work-orders";
import type { ErpBomItem, ErpMaterial, ErpRoute, ErpWorkCenter, ErpWorkOrder } from "./types";

// ==========================================
// Work Orders Sync
// ==========================================

const workOrdersSyncPipeline = createSyncPipeline<unknown, ErpWorkOrder>({
	sourceSystem: "ERP",
	entityType: "WORK_ORDER",
	pull: pullWorkOrders,
	normalize: (raw) => raw as ErpWorkOrder[], // Already normalized in pull
	apply: applyWorkOrders,
	dedupeStrategy: "reapply", // Always apply to ensure status sync
});

export const syncErpWorkOrders = async (
	db: PrismaClient,
	options: { since?: string },
): Promise<ServiceResult<SyncResult<ErpWorkOrder>>> => {
	return workOrdersSyncPipeline(db, options);
};

// ==========================================
// Materials Sync
// ==========================================

const materialsSyncPipeline = createSyncPipeline<unknown, ErpMaterial>({
	sourceSystem: "ERP",
	entityType: "MATERIAL",
	pull: pullMaterials,
	normalize: (raw) => raw as ErpMaterial[],
	apply: applyMaterials,
	dedupeStrategy: "skip", // Master data changes less frequently
});

export const syncErpMaterials = async (
	db: PrismaClient,
	options: { since?: string },
): Promise<ServiceResult<SyncResult<ErpMaterial>>> => {
	return materialsSyncPipeline(db, options);
};

// ==========================================
// BOMs Sync
// ==========================================

const bomsSyncPipeline = createSyncPipeline<unknown, ErpBomItem>({
	sourceSystem: "ERP",
	entityType: "BOM",
	pull: pullBoms,
	normalize: (raw) => raw as ErpBomItem[],
	apply: applyBoms,
	dedupeStrategy: "skip", // Master data changes less frequently
});

export const syncErpBoms = async (
	db: PrismaClient,
	options: { since?: string },
): Promise<ServiceResult<SyncResult<ErpBomItem>>> => {
	return bomsSyncPipeline(db, options);
};

// ==========================================
// Work Centers Sync
// ==========================================

const workCentersSyncPipeline = createSyncPipeline<unknown, ErpWorkCenter>({
	sourceSystem: "ERP",
	entityType: "WORK_CENTER",
	pull: pullWorkCenters,
	normalize: (raw) => raw as ErpWorkCenter[],
	apply: applyWorkCenters,
	dedupeStrategy: "skip", // Master data changes less frequently
});

export const syncErpWorkCenters = async (
	db: PrismaClient,
	options: { since?: string },
): Promise<ServiceResult<SyncResult<ErpWorkCenter>>> => {
	return workCentersSyncPipeline(db, options);
};

// ==========================================
// Routes Sync
// ==========================================

const routesPageSyncPipeline = createSyncPipeline<unknown, ErpRoute>({
	sourceSystem: "ERP",
	entityType: "ROUTING",
	pull: pullRoutes,
	normalize: (raw) => raw as ErpRoute[],
	apply: applyRoutes,
	dedupeStrategy: "skip", // Complex data, skip duplicates
});

const routesFullSyncPipeline = createSyncPipeline<unknown, ErpRoute>({
	sourceSystem: "ERP",
	entityType: "ROUTING",
	pull: pullRoutesPaginated,
	normalize: (raw) => raw as ErpRoute[],
	apply: applyRoutes,
	dedupeStrategy: "skip", // Complex data, skip duplicates
});

export const syncErpRoutes = async (
	db: PrismaClient,
	options: { since?: string; startRow?: number; limit?: number },
): Promise<ServiceResult<SyncResult<ErpRoute>>> => {
	if (options.startRow !== undefined) {
		return routesPageSyncPipeline(db, options);
	}
	return routesFullSyncPipeline(db, options);
};

// Re-export pull functions for direct use if needed
export { pullRoutes, pullRoutesPaginated } from "./pull-routes";
// Re-export types
export type { ErpBomItem, ErpMaterial, ErpRoute, ErpWorkCenter, ErpWorkOrder } from "./types";
