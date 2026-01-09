import type { ServiceResult } from "../../../../types/service-result";
import type { KingdeeConfig } from "../kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../kingdee";
import { mockErpBoms } from "../mock-data";
import type { PullResult, SyncCursor } from "../sync-pipeline";
import { buildSinceFilter, getCell, toBool, toIso, toNumber } from "../utils";
import { getErpMasterConfig } from "./config";
import type { ErpBomItem } from "./types";

// ==========================================
// Field Definitions
// ==========================================

const BOM_FIELDS = [
	"FNumber",
	"FMATERIALID.FNumber",
	"FMATERIALID.FName",
	"FMATERIALID.FSpecification",
	"FMATERIALIDCHILD.FNumber",
	"FMATERIALIDCHILD.FName",
	"FMATERIALIDCHILD.FSpecification",
	"FNumerator",
	"FDENOMINATOR",
	"FSCRAPRATE",
	"FFIXSCRAPQTY",
	"FISKEYCOMPONENT",
	"FISSUETYPE",
	"FBACKFLUSHTYPE",
	"FCHILDUNITID.FNumber",
	"FCHILDUNITID.FName",
	"FDocumentStatus",
	"FForbidStatus",
	"FModifyDate",
];

const BOM_INDEX = {
	bomCode: 0,
	parentCode: 1,
	parentName: 2,
	parentSpec: 3,
	childCode: 4,
	childName: 5,
	childSpec: 6,
	qty: 7,
	denominator: 8,
	scrapRate: 9,
	fixScrapQty: 10,
	isKeyComponent: 11,
	issueType: 12,
	backflushType: 13,
	unitCode: 14,
	unitName: 15,
	documentStatus: 16,
	forbidStatus: 17,
	updatedAt: 18,
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

// ==========================================
// Normalize
// ==========================================

const normalizeBoms = (rows: unknown[]): ErpBomItem[] => {
	const items: ErpBomItem[] = [];

	for (const row of rows) {
		if (!Array.isArray(row)) continue;
		const bomCode = getCell(row, BOM_INDEX.bomCode).trim();
		const parentCode = getCell(row, BOM_INDEX.parentCode).trim();
		const childCode = getCell(row, BOM_INDEX.childCode).trim();
		if (!parentCode || !childCode) continue;

		const parentName = getCell(row, BOM_INDEX.parentName).trim();
		const parentSpec = getCell(row, BOM_INDEX.parentSpec).trim();
		const childName = getCell(row, BOM_INDEX.childName).trim();
		const childSpec = getCell(row, BOM_INDEX.childSpec).trim();
		const qty = toNumber(getCell(row, BOM_INDEX.qty));
		const denominator = toNumber(getCell(row, BOM_INDEX.denominator));
		const scrapRate = toNumber(getCell(row, BOM_INDEX.scrapRate));
		const fixScrapQty = toNumber(getCell(row, BOM_INDEX.fixScrapQty));
		const isKeyComponent = toBool(getCell(row, BOM_INDEX.isKeyComponent));
		const issueType = getCell(row, BOM_INDEX.issueType).trim();
		const backflushType = getCell(row, BOM_INDEX.backflushType).trim();
		const unitCode = getCell(row, BOM_INDEX.unitCode).trim();
		const unitName = getCell(row, BOM_INDEX.unitName).trim();
		const documentStatus = getCell(row, BOM_INDEX.documentStatus).trim();
		const forbidStatus = getCell(row, BOM_INDEX.forbidStatus).trim();
		const updatedAtRaw = getCell(row, BOM_INDEX.updatedAt).trim();
		const updatedAt = toIso(updatedAtRaw) || new Date().toISOString();

		items.push({
			bomCode,
			parentCode,
			parentName,
			parentSpec,
			childCode,
			childName,
			childSpec,
			qty,
			denominator,
			scrapRate,
			fixScrapQty,
			isKeyComponent,
			issueType,
			backflushType,
			unit: unitName,
			unitCode,
			documentStatus,
			forbidStatus,
			updatedAt,
		});
	}

	return items;
};

// ==========================================
// Pull Function
// ==========================================

export const pullBoms = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpBomItem>>> => {
	const config = getErpMasterConfig();
	const since = cursor.since ?? null;
	const startRow = cursor.startRow ?? 0;
	const limit = cursor.limit ?? 200;

	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) {
		if (sessionResult.code === "KINGDEE_CONFIG_MISSING") {
			return {
				success: true,
				data: {
					items: mockErpBoms,
					cursor: { hasMore: false },
				},
			};
		}
		return sessionResult;
	}

	const queryResult = await kingdeeExecuteBillQuery(
		sessionResult.data.config,
		sessionResult.data.cookie,
		{
			formId: config.formIds.bom,
			fieldKeys: BOM_FIELDS.join(","),
			filterString: buildSinceFilter("FModifyDate", since),
			startRow,
			limit,
		},
	);
	if (!queryResult.success) return queryResult;

	const items = normalizeBoms(queryResult.data);
	const hasMore = queryResult.data.length >= limit;

	return {
		success: true,
		data: {
			items,
			cursor: {
				hasMore,
				nextStartRow: hasMore ? startRow + limit : undefined,
			},
		},
	};
};
