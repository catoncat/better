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
	routing: { id: string; code: string } | null;
	mode: "routing_code" | "product_code" | "ambiguous" | "not_found";
	candidateCodes?: string[];
};

const resolveRoutingForWorkOrder = async (
	tx: Prisma.TransactionClient,
	item: ErpWorkOrder,
): Promise<RoutingResolution> => {
	if (item.routingCode) {
		const routing = await tx.routing.findUnique({
			where: { code: item.routingCode },
			select: { id: true, code: true },
		});
		return { routing: routing || null, mode: routing ? "routing_code" : "not_found" };
	}

	const now = new Date();
	const candidates = await tx.routing.findMany({
		where: {
			productCode: item.productCode,
			isActive: true,
			AND: [
				{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
				{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
			],
		},
		orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
		select: { id: true, code: true },
		take: 2,
	});

	if (candidates.length === 1) {
		return { routing: candidates[0] ?? null, mode: "product_code" };
	}
	if (candidates.length > 1) {
		return {
			routing: null,
			mode: "ambiguous",
			candidateCodes: candidates.map((candidate: { code: string }) => candidate.code),
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
			candidateCodes: routingResolution.candidateCodes ?? null,
		};
		const erpMeta = toJsonValue({
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

		// B5 Fix: Use item.plannedQty directly without Math.round()
		await tx.workOrder.upsert({
			where: { woNo: item.woNo },
			update: {
				productCode: item.productCode,
				plannedQty: item.plannedQty, // B5 Fix: Preserve decimal precision
				routingId: routing?.id,
				dueDate: parseDate(item.dueDate),
				status: mapWorkOrderStatus(item.status),
				erpStatus: item.status,
				erpPickStatus: item.pickStatus,
				meta: erpMeta,
			},
			create: {
				woNo: item.woNo,
				productCode: item.productCode,
				plannedQty: item.plannedQty, // B5 Fix: Preserve decimal precision
				routingId: routing?.id,
				dueDate: parseDate(item.dueDate),
				status: mapWorkOrderStatus(item.status),
				erpStatus: item.status,
				erpPickStatus: item.pickStatus,
				meta: erpMeta,
			},
		});
	}
};
