import type { ServiceResult } from "../../../../types/service-result";
import type { KingdeeConfig } from "../kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "../kingdee";
import type { PullResult, SyncCursor } from "../sync-pipeline";
import { buildSinceFilter, getCell, toBool, toIso } from "../utils";
import { getErpMasterConfig } from "./config";
import type { ErpRoute, ErpRouteHeader, ErpRouteStep } from "./types";

// ==========================================
// Field Definitions
// ==========================================

const ENG_ROUTE_FIELDS = [
	// Header fields (FID / 单据头主键)
	"FID", // 0: 单据头主键
	"FNumber", // 1: 工艺路线编码
	"FName", // 2: 工艺路线名称
	"FMATERIALID.FNumber", // 3: 物料编码
	"FMATERIALID.FName", // 4: 物料名称
	"FUseOrgId.FNumber", // 5: 使用组织编码
	"FCreateOrgId.FNumber", // 6: 创建组织编码
	"FEFFECTDATE", // 7: 生效日期
	"FExpireDate", // 8: 失效日期
	"FRouteSrc", // 9: 数据来源
	"FBomId.FNumber", // 10: BOM版本编码
	"FModifyDate", // 11: 修改日期
	// Step fields (工序列表)
	"FOperNumber", // 12: 工序号
	"FProcessId.FNumber", // 13: 作业编码
	"FProcessId.FName", // 14: 作业名称
	"FWorkCenterId.FNumber", // 15: 工作中心编码
	"FWorkCenterId.FName", // 16: 工作中心名称
	"FDepartmentId.FNumber", // 17: 加工车间编码
	"FDepartmentId.FName", // 18: 加工车间名称
	"FOperDescription", // 19: 工序说明
	"FKeyOper", // 20: 关键工序
	"FIsFirstPieceInspect", // 21: 首检
	"FIsProcessRecordStation", // 22: 过程记录工位
	"FIsQualityInspectStation", // 23: 质量检测工位
];

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
// Parse Rows (B2 Fix: Group by headId)
// ==========================================

/**
 * Parse route rows with B2 fix.
 *
 * B2 Fix: Group rows by headId (FID) first, then process each group.
 * This eliminates dependency on row ordering and prevents steps from
 * being attached to the wrong header.
 */
const parseRouteRows = (rows: unknown[]): { routes: ErpRoute[]; latestModifiedAt: string } => {
	// B2 Fix: First pass - group rows by headId
	const rowsByHeadId = new Map<string, unknown[]>();

	for (const rawRow of rows) {
		if (!Array.isArray(rawRow)) continue;
		const headId = getCell(rawRow, 0).trim(); // FID is always present
		if (!headId) continue;

		const existing = rowsByHeadId.get(headId) || [];
		existing.push(rawRow);
		rowsByHeadId.set(headId, existing);
	}

	// Second pass - process each group
	const routeMap = new Map<string, ErpRoute>();
	let latestModifiedAt = "";

	for (const [_headId, groupRows] of rowsByHeadId) {
		// Extract header from first row in group (header fields are repeated)
		const firstRow = groupRows[0];
		if (!Array.isArray(firstRow)) continue;

		const routeNo = getCell(firstRow, 1).trim();
		if (!routeNo) continue;

		const header: ErpRouteHeader = {
			headId: getCell(firstRow, 0).trim(),
			routeNo,
			routeName: getCell(firstRow, 2).trim(),
			productCode: getCell(firstRow, 3).trim(),
			productName: getCell(firstRow, 4).trim(),
			useOrgCode: getCell(firstRow, 5).trim(),
			createOrgCode: getCell(firstRow, 6).trim(),
			effectiveFrom: getCell(firstRow, 7).trim(),
			effectiveTo: getCell(firstRow, 8).trim(),
			routeSource: getCell(firstRow, 9).trim(),
			bomCode: getCell(firstRow, 10).trim(),
			modifiedAt: toIso(getCell(firstRow, 11).trim()),
		};

		// Track latest modified time
		if (header.modifiedAt && (!latestModifiedAt || header.modifiedAt > latestModifiedAt)) {
			latestModifiedAt = header.modifiedAt;
		}

		// Get or create route
		let route = routeMap.get(routeNo);
		if (!route) {
			route = { header, steps: [], updatedAt: header.modifiedAt };
			routeMap.set(routeNo, route);
		} else {
			// Update header if this one is newer
			if (header.modifiedAt > route.header.modifiedAt) {
				route.header = header;
				route.updatedAt = header.modifiedAt;
			}
		}

		// Extract steps from all rows in this group
		for (const rawRow of groupRows) {
			if (!Array.isArray(rawRow)) continue;

			const stepNoValue = getCell(rawRow, 12).trim();
			if (!stepNoValue) continue;

			const step: ErpRouteStep = {
				stepNo: Number(stepNoValue),
				processCode: getCell(rawRow, 13).trim(),
				processName: getCell(rawRow, 14).trim(),
				workCenterCode: getCell(rawRow, 15).trim(),
				workCenterName: getCell(rawRow, 16).trim(),
				departmentCode: getCell(rawRow, 17).trim(),
				departmentName: getCell(rawRow, 18).trim(),
				description: getCell(rawRow, 19).trim(),
				keyOper: toBool(getCell(rawRow, 20)),
				firstPieceInspect: toBool(getCell(rawRow, 21)),
				processRecordStation: toBool(getCell(rawRow, 22)),
				qualityInspectStation: toBool(getCell(rawRow, 23)),
			};

			// Avoid duplicate steps
			const existingStep = route.steps.find((s) => s.stepNo === step.stepNo);
			if (!existingStep) {
				route.steps.push(step);
			}
		}
	}

	return {
		routes: [...routeMap.values()],
		latestModifiedAt,
	};
};

// ==========================================
// Pull Function
// ==========================================

export const pullRoutes = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpRoute>>> => {
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
					items: [],
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
			formId: config.formIds.routing,
			fieldKeys: ENG_ROUTE_FIELDS.join(","),
			filterString: buildSinceFilter("FModifyDate", since),
			startRow,
			limit,
		},
	);
	if (!queryResult.success) return queryResult;

	const { routes, latestModifiedAt } = parseRouteRows(queryResult.data);
	const hasMore = queryResult.data.length >= limit;

	return {
		success: true,
		data: {
			items: routes,
			cursor: {
				hasMore,
				nextSyncAt: latestModifiedAt || since || undefined,
				nextStartRow: hasMore ? startRow + limit : undefined,
			},
		},
	};
};

/**
 * Pull all routes with automatic pagination.
 */
export const pullRoutesPaginated = async (
	cursor: SyncCursor,
): Promise<ServiceResult<PullResult<ErpRoute>>> => {
	const config = getErpMasterConfig();
	const since = cursor.since ?? null;
	const limit = cursor.limit ?? 200;

	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) {
		if (sessionResult.code === "KINGDEE_CONFIG_MISSING") {
			return {
				success: true,
				data: {
					items: [],
					cursor: { hasMore: false },
				},
			};
		}
		return sessionResult;
	}

	let startRow = 0;
	const allRows: unknown[] = [];
	let hasMore = true;

	while (hasMore) {
		const queryResult = await kingdeeExecuteBillQuery(
			sessionResult.data.config,
			sessionResult.data.cookie,
			{
				formId: config.formIds.routing,
				fieldKeys: ENG_ROUTE_FIELDS.join(","),
				filterString: buildSinceFilter("FModifyDate", since),
				startRow,
				limit,
			},
		);
		if (!queryResult.success) return queryResult;

		allRows.push(...queryResult.data);
		hasMore = queryResult.data.length >= limit;
		startRow += limit;
	}

	const { routes, latestModifiedAt } = parseRouteRows(allRows);

	return {
		success: true,
		data: {
			items: routes,
			cursor: {
				hasMore: false,
				nextSyncAt: latestModifiedAt || since || undefined,
			},
		},
	};
};
