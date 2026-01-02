import type { ServiceResult } from "../../../../types/service-result";
import type { KingdeeConfig } from "../kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../kingdee";
import { getMockErpWorkCenters } from "../mock-data";
import type { PullResult, SyncCursor } from "../sync-pipeline";
import { buildSinceFilter, getCell, toIso } from "../utils";
import { getErpMasterConfig } from "./config";
import type { ErpWorkCenter } from "./types";

// ==========================================
// Field Definitions
// ==========================================

const WORK_CENTER_FIELDS = [
	"FNumber",
	"FName",
	"FDeptID.FNumber",
	"FDeptID.FName",
	"FWorkCenterType",
	"FDescription",
	"FDocumentStatus",
	"FModifyDate",
];

const WORK_CENTER_INDEX = {
	code: 0,
	name: 1,
	departmentCode: 2,
	departmentName: 3,
	workCenterType: 4,
	description: 5,
	documentStatus: 6,
	updatedAt: 7,
} as const;

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

const normalizeWorkCenters = (rows: unknown[]): ErpWorkCenter[] => {
	const items: ErpWorkCenter[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const workCenterCode = getCell(row, WORK_CENTER_INDEX.code).trim();
		if (!workCenterCode) continue;

		const name = getCell(row, WORK_CENTER_INDEX.name).trim();
		const departmentCode = getCell(row, WORK_CENTER_INDEX.departmentCode).trim();
		const departmentName = getCell(row, WORK_CENTER_INDEX.departmentName).trim();
		const workCenterType = getCell(row, WORK_CENTER_INDEX.workCenterType).trim();
		const description = getCell(row, WORK_CENTER_INDEX.description).trim();
		const documentStatus = getCell(row, WORK_CENTER_INDEX.documentStatus).trim();
		const updatedAtRaw = getCell(row, WORK_CENTER_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			workCenterCode,
			name: name || workCenterCode,
			departmentCode,
			departmentName,
			workCenterType,
			description,
			documentStatus,
			updatedAt,
		});
	}

	return items;
};

// ==========================================
// Pull Function
// ==========================================

/**
 * Pull work centers from Kingdee.
 * B4 Fix: Accumulate data from ALL formIds instead of returning only the first non-empty result.
 */
export const pullWorkCenters = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpWorkCenter>>> => {
	const config = getErpMasterConfig();
	const since = cursor.since ?? null;

	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) {
		if (sessionResult.code === "KINGDEE_CONFIG_MISSING") {
			const mockData = await getMockErpWorkCenters();
			return {
				success: true,
				data: {
					items: mockData,
					cursor: { hasMore: false },
				},
			};
		}
		return sessionResult;
	}

	const filterString = buildSinceFilter("FModifyDate", since);

	// B4 Fix: Accumulate data from ALL formIds
	const allRows: unknown[] = [];
	for (const formId of config.formIds.workCenter) {
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			formId,
			WORK_CENTER_FIELDS.join(","),
			filterString,
		);
		if (!rowsResult.success) return rowsResult;
		allRows.push(...rowsResult.data); // B4 Fix: Accumulate instead of returning early
	}

	const items = normalizeWorkCenters(allRows);

	return {
		success: true,
		data: {
			items,
			cursor: { hasMore: false },
		},
	};
};
