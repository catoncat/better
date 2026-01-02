import type { ServiceResult } from "../../../../types/service-result";
import type { KingdeeConfig } from "../kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../kingdee";
import { getMockErpMaterials } from "../mock-data";
import type { PullResult, SyncCursor } from "../sync-pipeline";
import { buildSinceFilter, getCell, toBool, toIso } from "../utils";
import { getErpMasterConfig } from "./config";
import type { ErpMaterial } from "./types";

// ==========================================
// Field Definitions
// ==========================================

const MATERIAL_FIELDS = [
	"FNumber",
	"FName",
	"FCategoryID.FName",
	"FCategoryID.FNumber",
	"FBaseUnitId.FName",
	"FBaseUnitId.FNumber",
	"FSpecification",
	"FDescription",
	"FBarCode",
	"FDocumentStatus",
	"FForbidStatus",
	"FIsBatchManage",
	"FIsKFPeriod",
	"FIsProduce",
	"FIsPurchase",
	"FProduceUnitId.FName",
	"FProduceUnitId.FNumber",
	"FModifyDate",
];

const MATERIAL_INDEX = {
	code: 0,
	name: 1,
	category: 2,
	categoryCode: 3,
	unit: 4,
	unitCode: 5,
	specification: 6,
	description: 7,
	barcode: 8,
	documentStatus: 9,
	forbidStatus: 10,
	isBatchManage: 11,
	isKFPeriod: 12,
	isProduce: 13,
	isPurchase: 14,
	produceUnitName: 15,
	produceUnitCode: 16,
	updatedAt: 17,
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

const normalizeMaterials = (rows: unknown[]): ErpMaterial[] => {
	const items: ErpMaterial[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const materialCode = getCell(row, MATERIAL_INDEX.code).trim();
		if (!materialCode) continue;

		const name = getCell(row, MATERIAL_INDEX.name).trim();
		const category = getCell(row, MATERIAL_INDEX.category).trim();
		const categoryCode = getCell(row, MATERIAL_INDEX.categoryCode).trim();
		const unit = getCell(row, MATERIAL_INDEX.unit).trim();
		const unitCode = getCell(row, MATERIAL_INDEX.unitCode).trim();
		const specification = getCell(row, MATERIAL_INDEX.specification).trim();
		const description = getCell(row, MATERIAL_INDEX.description).trim();
		const barcode = getCell(row, MATERIAL_INDEX.barcode).trim();
		const documentStatus = getCell(row, MATERIAL_INDEX.documentStatus).trim();
		const forbidStatus = getCell(row, MATERIAL_INDEX.forbidStatus).trim();
		const isBatchManage = toBool(getCell(row, MATERIAL_INDEX.isBatchManage));
		const isKFPeriod = toBool(getCell(row, MATERIAL_INDEX.isKFPeriod));
		const isProduce = toBool(getCell(row, MATERIAL_INDEX.isProduce));
		const isPurchase = toBool(getCell(row, MATERIAL_INDEX.isPurchase));
		const produceUnitName = getCell(row, MATERIAL_INDEX.produceUnitName).trim();
		const produceUnitCode = getCell(row, MATERIAL_INDEX.produceUnitCode).trim();
		const updatedAtRaw = getCell(row, MATERIAL_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			materialCode,
			name: name || materialCode,
			category,
			categoryCode,
			unit,
			unitCode,
			model: "",
			specification,
			barcode,
			description,
			documentStatus,
			forbidStatus,
			isBatchManage,
			isKFPeriod,
			isProduce,
			isPurchase,
			produceUnitCode,
			produceUnitName,
			updatedAt,
		});
	}

	return items;
};

// ==========================================
// Pull Function
// ==========================================

export const pullMaterials = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpMaterial>>> => {
	const config = getErpMasterConfig();
	const since = cursor.since ?? null;

	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) {
		if (sessionResult.code === "KINGDEE_CONFIG_MISSING") {
			const mockData = await getMockErpMaterials();
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
	const rowsResult = await fetchKingdeeRows(
		sessionResult.data,
		config.formIds.material,
		MATERIAL_FIELDS.join(","),
		filterString,
	);
	if (!rowsResult.success) return rowsResult;

	const items = normalizeMaterials(rowsResult.data);

	return {
		success: true,
		data: {
			items,
			cursor: { hasMore: false },
		},
	};
};
