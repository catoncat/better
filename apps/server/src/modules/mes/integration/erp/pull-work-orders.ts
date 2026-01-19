import type { ServiceResult } from "../../../../types/service-result";
import type { KingdeeConfig } from "../kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../kingdee";
import { mockErpWorkOrders } from "../mock-data";
import type { PullResult, SyncCursor } from "../sync-pipeline";
import { buildDateRangeFilter, getCell, toIso, toNumber } from "../utils";
import { getErpMasterConfig } from "./config";
import type { ErpWorkOrder } from "./types";

// ==========================================
// Field Definitions
// ==========================================

const WORK_ORDER_FIELDS_BASE = [
	"FBillNo",
	"FMaterialId.FNumber",
	"FMaterialId.FName",
	"FMaterialId.FSpecification",
	"FQty",
	"FPlanStartDate",
	"FPlanFinishDate",
	"FStatus",
	"FPickMtrlStatus",
	"FModifyDate",
	"FWorkShopID.FNumber",
	"FWorkShopID.FName",
	"FRoutingId.FName",
	"FUnitId.FNumber",
	"FUnitId.FName",
	"FPriority",
	"FSrcBillNo",
	"FRptFinishQty",
	"FScrapQty",
];

const WORK_ORDER_INDEX = {
	woNo: 0,
	productCode: 1,
	productName: 2,
	productSpec: 3,
	plannedQty: 4,
	planStartDate: 5,
	planFinishDate: 6,
	erpStatus: 7,
	erpPickStatus: 8,
	updatedAt: 9,
	workshopCode: 10,
	workshopName: 11,
	routingName: 12,
	unitCode: 13,
	unitName: 14,
	priority: 15,
	srcBillNo: 16,
	rptFinishQty: 17,
	scrapQty: 18,
} as const;

const WORK_ORDER_ROUTING_FIELD_DEFAULT = "FRoutingId.FNumber";

// ==========================================
// Kingdee Session
// ==========================================

const getKingdeeSession = async (): Promise<
	ServiceResult<{ config: KingdeeConfig; cookie: string }>
> => {
	const configResult = getKingdeeConfig();
	if (!configResult.success) return configResult;
	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) return loginResult;
	return { success: true, data: { config: configResult.data, cookie: loginResult.data.cookie } };
};

const fetchKingdeeRows = async (
	session: { config: KingdeeConfig; cookie: string },
	formId: string,
	fieldKeys: string,
	filterString: string,
): Promise<ServiceResult<unknown[]>> => {
	const pageSize = 200;
	let startRow = 0;
	const rows: unknown[] = [];

	for (;;) {
		const result = await kingdeeExecuteBillQuery(session.config, session.cookie, {
			formId,
			fieldKeys,
			filterString,
			startRow,
			limit: pageSize,
		});
		if (!result.success) return result;
		rows.push(...result.data);
		if (result.data.length < pageSize) break;
		startRow += pageSize;
	}

	return { success: true, data: rows };
};

// ==========================================
// Normalize
// ==========================================

const normalizeWorkOrders = (rows: unknown[], routingFieldIndex: number | null): ErpWorkOrder[] => {
	const items: ErpWorkOrder[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const woNo = getCell(row, WORK_ORDER_INDEX.woNo).trim();
		const productCode = getCell(row, WORK_ORDER_INDEX.productCode).trim();
		if (!woNo || !productCode) continue;

		const productName = getCell(row, WORK_ORDER_INDEX.productName).trim();
		const productSpec = getCell(row, WORK_ORDER_INDEX.productSpec).trim();
		const plannedQty = toNumber(getCell(row, WORK_ORDER_INDEX.plannedQty));
		const planStartRaw = getCell(row, WORK_ORDER_INDEX.planStartDate).trim();
		const planFinishRaw = getCell(row, WORK_ORDER_INDEX.planFinishDate).trim();
		const erpStatus = getCell(row, WORK_ORDER_INDEX.erpStatus).trim();
		const erpPickStatus = getCell(row, WORK_ORDER_INDEX.erpPickStatus).trim();
		const updatedAtRaw = getCell(row, WORK_ORDER_INDEX.updatedAt).trim();
		const workshopCode = getCell(row, WORK_ORDER_INDEX.workshopCode).trim();
		const workshopName = getCell(row, WORK_ORDER_INDEX.workshopName).trim();
		const routingName = getCell(row, WORK_ORDER_INDEX.routingName).trim();
		const unitCode = getCell(row, WORK_ORDER_INDEX.unitCode).trim();
		const unitName = getCell(row, WORK_ORDER_INDEX.unitName).trim();
		const priority = getCell(row, WORK_ORDER_INDEX.priority).trim();
		const srcBillNo = getCell(row, WORK_ORDER_INDEX.srcBillNo).trim();
		const rptFinishQty = toNumber(getCell(row, WORK_ORDER_INDEX.rptFinishQty));
		const scrapQty = toNumber(getCell(row, WORK_ORDER_INDEX.scrapQty));
		const routingRaw = routingFieldIndex !== null ? getCell(row, routingFieldIndex).trim() : "";

		const planStartDate = planStartRaw ? toIso(planStartRaw) : "";
		const planFinishDate = planFinishRaw ? toIso(planFinishRaw) : "";
		const dueDate = planFinishDate || "";
		const updatedAt = toIso(updatedAtRaw) || dueDate || new Date().toISOString();

		items.push({
			woNo,
			productCode,
			productName,
			productSpec,
			plannedQty,
			planStartDate: planStartDate || undefined,
			planFinishDate: planFinishDate || undefined,
			unitCode,
			unitName,
			workshopCode,
			workshopName,
			routingCode: routingRaw || undefined,
			routingName,
			status: erpStatus,
			pickStatus: erpPickStatus,
			priority,
			srcBillNo,
			rptFinishQty,
			scrapQty,
			dueDate: dueDate || undefined,
			updatedAt,
		});
	}

	return items;
};

// ==========================================
// Pull Function
// ==========================================

export const pullWorkOrders = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpWorkOrder>>> => {
	const config = getErpMasterConfig();
	const since = cursor.since ?? null;

	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) {
		if (sessionResult.code === "KINGDEE_CONFIG_MISSING") {
			return {
				success: true,
				data: {
					items: mockErpWorkOrders,
					cursor: { hasMore: false },
				},
			};
		}
		return sessionResult;
	}

	const routingField = config.workOrderRoutingField ?? WORK_ORDER_ROUTING_FIELD_DEFAULT;
	const fields = Array.from(new Set([...WORK_ORDER_FIELDS_BASE, routingField]));
	const routingFieldIndex = fields.indexOf(routingField);
	// Only sync work orders from the last 3 months to reduce memory usage
	const filterString = buildDateRangeFilter("FModifyDate", since, 3);

	const rowsResult = await fetchKingdeeRows(
		sessionResult.data,
		config.formIds.workOrder,
		fields.join(","),
		filterString,
	);
	if (!rowsResult.success) return rowsResult;

	const items = normalizeWorkOrders(rowsResult.data, routingFieldIndex);

	return {
		success: true,
		data: {
			items,
			cursor: { hasMore: false },
		},
	};
};
