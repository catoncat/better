import type { Prisma } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";
import { parseDate, toJsonValue } from "../utils";
import type { ErpWorkOrder } from "./types";

// ==========================================
// Status Mapping
// ==========================================

const mapWorkOrderStatus = (erpStatus: string | undefined) => {
	if (!erpStatus) return WorkOrderStatus.RECEIVED;
	const normalized = erpStatus.trim();
	switch (normalized) {
		case "1": // 拟定
			return WorkOrderStatus.RECEIVED;
		case "2": // 下达
			return WorkOrderStatus.RELEASED;
		case "3": // 开工
			return WorkOrderStatus.IN_PROGRESS;
		case "4": // 完工
			return WorkOrderStatus.COMPLETED;
		case "5": // 结案
		case "6": // 完工结案
		case "7": // 作废
			return WorkOrderStatus.COMPLETED;
		default:
			return WorkOrderStatus.RECEIVED;
	}
};

// ==========================================
// Routing Resolution
// ==========================================

type RoutingResolution = {
	routing: { id: string; code: string; sourceSystem: string } | null;
	mode: "routing_code" | "product_code" | "ambiguous" | "not_found";
	sourceSystem?: "MES" | "ERP";
	candidateCodes?: string[];
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getRoutingOverrideId = (meta: unknown): string | null => {
	if (!isJsonObject(meta)) return null;
	const override = meta.routingOverride;
	if (!isJsonObject(override)) return null;
	const routingId = override.routingId;
	return typeof routingId === "string" ? routingId : null;
};

const resolveRoutingForWorkOrder = async (
	tx: Prisma.TransactionClient,
	item: ErpWorkOrder,
): Promise<RoutingResolution> => {
	if (item.routingCode) {
		const routing = await tx.routing.findUnique({
			where: { code: item.routingCode },
			select: { id: true, code: true, sourceSystem: true },
		});
		return {
			routing: routing || null,
			mode: routing ? "routing_code" : "not_found",
			sourceSystem: routing
				? routing.sourceSystem === "ERP"
					? "ERP"
					: "MES"
				: undefined,
		};
	}

	const now = new Date();

	const findCandidates = async (sourceSystem: "MES" | "ERP") =>
		tx.routing.findMany({
			where: {
				sourceSystem,
				productCode: item.productCode,
				isActive: true,
				AND: [
					{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
					{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
				],
			},
			orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
			select: { id: true, code: true, sourceSystem: true },
			take: 2,
		});

	const mesCandidates = await findCandidates("MES");
	if (mesCandidates.length === 1) {
		return { routing: mesCandidates[0] ?? null, mode: "product_code", sourceSystem: "MES" };
	}
	if (mesCandidates.length > 1) {
		return {
			routing: null,
			mode: "ambiguous",
			sourceSystem: "MES",
			candidateCodes: mesCandidates.map((candidate) => candidate.code),
		};
	}

	const erpCandidates = await findCandidates("ERP");
	if (erpCandidates.length === 1) {
		return { routing: erpCandidates[0] ?? null, mode: "product_code", sourceSystem: "ERP" };
	}
	if (erpCandidates.length > 1) {
		return {
			routing: null,
			mode: "ambiguous",
			sourceSystem: "ERP",
			candidateCodes: erpCandidates.map((candidate) => candidate.code),
		};
	}

	return { routing: null, mode: "not_found" };
};

// ==========================================
// Apply Function
// ==========================================

/**
 * Apply work orders to the database.
 * B5 Fix: Removed Math.round() to preserve decimal precision for plannedQty.
 */
export const applyWorkOrders = async (
	tx: Prisma.TransactionClient,
	items: ErpWorkOrder[],
	dedupeKey: string,
): Promise<void> => {
	for (const item of items) {
		// Store raw data for audit
		await tx.erpWorkOrderRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: item.woNo,
				payload: toJsonValue(item),
				dedupeKey,
			},
		});

		const routingResolution = await resolveRoutingForWorkOrder(tx, item);
		const routing = routingResolution.routing;
		const routingMeta = {
			mode: routingResolution.mode,
			routingCode: item.routingCode ?? null,
			resolvedCode: routing?.code ?? null,
			resolvedSourceSystem: routing?.sourceSystem ?? null,
			sourceSystem: routingResolution.sourceSystem ?? null,
			candidateCodes: routingResolution.candidateCodes ?? null,
		};
		// B5 Fix: Use item.plannedQty directly without Math.round()
		const mappedStatus = mapWorkOrderStatus(item.status);
		const existing = await tx.workOrder.findUnique({
			where: { woNo: item.woNo },
			select: { status: true, meta: true, routingId: true },
		});
		const baseMeta = isJsonObject(existing?.meta) ? existing?.meta : {};
		const erpMeta = toJsonValue({
			...baseMeta,
			erpStatus: item.status,
			erpPickStatus: item.pickStatus,
			erpRouting: routingMeta,
			erp: {
				workshopCode: item.workshopCode || null,
				workshopName: item.workshopName || null,
				routingName: item.routingName || null,
				productName: item.productName || null,
				productSpec: item.productSpec || null,
				unitCode: item.unitCode || null,
				unitName: item.unitName || null,
				planStartDate: item.planStartDate || null,
				planFinishDate: item.planFinishDate || null,
				priority: item.priority || null,
				srcBillNo: item.srcBillNo || null,
				rptFinishQty: item.rptFinishQty,
				scrapQty: item.scrapQty,
			},
		});
		const status =
			existing?.status === WorkOrderStatus.COMPLETED && mappedStatus !== WorkOrderStatus.COMPLETED
				? WorkOrderStatus.COMPLETED
				: mappedStatus;

		const overrideRoutingId = getRoutingOverrideId(existing?.meta);
		const resolvedRoutingId = overrideRoutingId ?? routing?.id ?? existing?.routingId ?? null;

		await tx.workOrder.upsert({
			where: { woNo: item.woNo },
			update: {
				productCode: item.productCode,
				plannedQty: item.plannedQty, // B5 Fix: Preserve decimal precision
				routingId: resolvedRoutingId,
				dueDate: parseDate(item.dueDate),
				status,
				erpStatus: item.status,
				erpPickStatus: item.pickStatus,
				meta: erpMeta,
			},
			create: {
				woNo: item.woNo,
				productCode: item.productCode,
				plannedQty: item.plannedQty, // B5 Fix: Preserve decimal precision
				routingId: resolvedRoutingId ?? routing?.id,
				dueDate: parseDate(item.dueDate),
				status,
				erpStatus: item.status,
				erpPickStatus: item.pickStatus,
				meta: erpMeta,
			},
		});
	}
};
