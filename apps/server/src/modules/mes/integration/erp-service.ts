import type { ServiceResult } from "../../../types/service-result";
import { getTimezoneOffsetMinutes } from "../../../utils/datetime";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "./kingdee";

type PullOptions = {
	since?: string;
	startRow?: number;
	limit?: number;
};

export type IntegrationCursor = {
	nextSyncAt?: string;
	hasMore: boolean;
};

export type IntegrationEnvelope<T> = {
	sourceSystem: string;
	entityType: string;
	cursor: IntegrationCursor;
	items: T[];
};

export type ErpRouteHeader = {
	headId: string;
	routeNo: string;
	routeName: string;
	productCode: string;
	productName: string;
	useOrgCode: string;
	createOrgCode: string;
	effectiveFrom: string;
	effectiveTo: string;
	routeSource: string;
	bomCode: string;
	modifiedAt: string;
};

export type ErpRouteStep = {
	stepNo: number;
	processCode: string;
	processName: string;
	workCenterCode: string;
	workCenterName: string;
	departmentCode: string;
	departmentName: string;
	description: string;
	keyOper: boolean;
	firstPieceInspect: boolean;
	processRecordStation: boolean;
	qualityInspectStation: boolean;
};

export type ErpRoute = {
	header: ErpRouteHeader;
	steps: ErpRouteStep[];
};

const ENG_ROUTE_FIELDS = [
	// Header fields (FBillHead / 单据头)
	"FBillHead", // 0: 单据头序号
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
	// Step fields (FSubEntity / 工序列表)
	"FSubEntity.FOperNumber", // 12: 工序号
	"FSubEntity.FProcessId.FNumber", // 13: 作业编码
	"FSubEntity.FProcessId.FName", // 14: 作业名称
	"FSubEntity.FWorkCenterId.FNumber", // 15: 工作中心编码
	"FSubEntity.FWorkCenterId.FName", // 16: 工作中心名称
	"FSubEntity.FDepartmentId.FNumber", // 17: 加工车间编码
	"FSubEntity.FDepartmentId.FName", // 18: 加工车间名称
	"FSubEntity.FOperDescription", // 19: 工序说明
	"FSubEntity.FKeyOper", // 20: 关键工序
	"FSubEntity.FIsFirstPieceInspect", // 21: 首检
	"FSubEntity.FIsProcessRecordStation", // 22: 过程记录工位
	"FSubEntity.FIsQualityInspectStation", // 23: 质量检测工位
];

const toBool = (value: string) => {
	const normalized = value.trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
};

const toIso = (value: string) => {
	if (!value) return "";
	const normalized = value.replace(" ", "T");
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString();
};

const formatKingdeeDate = (value: string) => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.valueOf())) return value;
	const offsetMinutes = getTimezoneOffsetMinutes();
	const local = new Date(parsed.getTime() + offsetMinutes * 60_000);
	const pad = (num: number) => String(num).padStart(2, "0");
	return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(
		local.getUTCHours(),
	)}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
};

const buildFilterString = (since?: string) => {
	if (!since) return "";
	return `FModifyDate >= '${formatKingdeeDate(since)}'`;
};

const getCell = (row: unknown[], index: number) => {
	if (!Array.isArray(row)) return "";
	const val = row[index];
	if (val === null || val === undefined) return "";
	return String(val);
};

export const pullErpRoutes = async (
	options: PullOptions,
): Promise<ServiceResult<IntegrationEnvelope<ErpRoute>>> => {
	const configResult = getKingdeeConfig();
	if (!configResult.success) return configResult;

	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) return loginResult;

	const startRow = options.startRow ?? 0;
	const limit = options.limit ?? 200;
	const since = options.since;

	const queryResult = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId: "ENG_Route",
		fieldKeys: ENG_ROUTE_FIELDS.join(","),
		filterString: buildFilterString(since),
		startRow,
		limit,
	});
	if (!queryResult.success) return queryResult;

	let lastHeader: ErpRouteHeader | null = null;
	const routeMap = new Map<string, ErpRoute>();
	let latestModifiedAt = "";

	for (const rawRow of queryResult.data) {
		if (!Array.isArray(rawRow)) continue;
		const routeNo = getCell(rawRow, 1).trim();
		if (routeNo) {
			const header: ErpRouteHeader = {
				headId: getCell(rawRow, 0).trim(),
				routeNo,
				routeName: getCell(rawRow, 2).trim(),
				productCode: getCell(rawRow, 3).trim(),
				productName: getCell(rawRow, 4).trim(),
				useOrgCode: getCell(rawRow, 5).trim(),
				createOrgCode: getCell(rawRow, 6).trim(),
				effectiveFrom: getCell(rawRow, 7).trim(),
				effectiveTo: getCell(rawRow, 8).trim(),
				routeSource: getCell(rawRow, 9).trim(),
				bomCode: getCell(rawRow, 10).trim(),
				modifiedAt: toIso(getCell(rawRow, 11).trim()),
			};
			lastHeader = header;
			const existingRoute = routeMap.get(routeNo);
			if (existingRoute) {
				existingRoute.header = header;
			} else {
				routeMap.set(routeNo, { header, steps: [] });
			}
			if (header.modifiedAt) {
				if (!latestModifiedAt || header.modifiedAt > latestModifiedAt) {
					latestModifiedAt = header.modifiedAt;
				}
			}
		}

		if (!lastHeader) continue;
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

		const route = routeMap.get(lastHeader.routeNo);
		if (route) route.steps.push(step);
	}

	const items = [...routeMap.values()];
	const hasMore = queryResult.data.length >= limit;
	const nextSyncAt = latestModifiedAt || since || new Date().toISOString();

	return {
		success: true,
		data: {
			sourceSystem: "ERP",
			entityType: "ROUTING",
			cursor: { nextSyncAt, hasMore },
			items,
		},
	};
};
