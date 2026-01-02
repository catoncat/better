import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { getTimezoneOffsetMinutes } from "../../../utils/datetime";
import type { KingdeeConfig } from "./kingdee";
import { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } from "./kingdee";
import {
	getMockErpMaterials,
	getMockErpWorkCenters,
	mockErpBoms,
	mockErpWorkOrders,
} from "./mock-data";

type SyncOptions = {
	since?: string;
};

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

type SyncResult<T> = {
	payload: IntegrationEnvelope<T>;
	messageId: string;
	businessKey: string;
	dedupeKey?: string | null;
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

type ErpWorkOrder = {
	woNo: string;
	productCode: string;
	productName: string;
	productSpec: string;
	plannedQty: number;
	planStartDate?: string;
	planFinishDate?: string;
	unitCode: string;
	unitName: string;
	workshopCode: string;
	workshopName: string;
	routingCode?: string;
	routingName: string;
	status: string;
	pickStatus: string; // FPickMtrlStatus
	priority: string;
	srcBillNo: string;
	rptFinishQty: number;
	scrapQty: number;
	dueDate?: string;
	updatedAt: string;
};

type ErpMaterial = {
	materialCode: string;
	name: string;
	category: string;
	categoryCode: string;
	unit: string;
	unitCode: string;
	model: string;
	specification: string;
	barcode: string;
	description: string;
	documentStatus: string;
	forbidStatus: string;
	isBatchManage: boolean;
	isKFPeriod: boolean;
	isProduce: boolean;
	isPurchase: boolean;
	produceUnitCode: string;
	produceUnitName: string;
	updatedAt: string;
};

type ErpBomItem = {
	bomCode: string;
	parentCode: string;
	parentName: string;
	parentSpec: string;
	childCode: string;
	childName: string;
	childSpec: string;
	qty: number;
	denominator: number;
	scrapRate: number;
	fixScrapQty: number;
	isKeyComponent: boolean;
	issueType: string;
	backflushType: string;
	unit: string;
	unitCode: string;
	documentStatus: string;
	forbidStatus: string;
	updatedAt: string;
};

type ErpWorkCenter = {
	workCenterCode: string;
	name: string;
	departmentCode: string;
	departmentName: string;
	workCenterType: string;
	description: string;
	documentStatus: string;
	updatedAt: string;
};

type ErpMasterConfig = {
	workOrderRoutingField?: string | null;
	formIds: {
		workOrder: string;
		material: string;
		bom: string;
		workCenter: string[];
		routing: string;
	};
};

const ERP_FORM_IDS = {
	workOrder: "PRD_MO",
	material: "BD_Material",
	bom: "ENG_BOM",
	workCenter: ["ENG_WorkCenter"],
	routing: "ENG_Route",
} as const;

const getErpMasterConfig = (): ErpMasterConfig => ({
	workOrderRoutingField: process.env.MES_ERP_KINGDEE_WORK_ORDER_ROUTING_FIELD?.trim() || null,
	formIds: {
		workOrder: ERP_FORM_IDS.workOrder,
		material: ERP_FORM_IDS.material,
		bom: ERP_FORM_IDS.bom,
		workCenter: [...ERP_FORM_IDS.workCenter],
		routing: ERP_FORM_IDS.routing,
	},
});

const safeJsonStringify = (value: unknown) =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

const hashPayload = (value: unknown) =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

const serializeError = (error: unknown) => {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	if (error && typeof error === "object") return error;
	return { message: String(error ?? "Unknown error") };
};

const getServiceErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean; message?: string };
		if (value.success === false && typeof value.message === "string") return value.message;
	}
	return fallback;
};

const toServiceError = (
	error: unknown,
	fallbackCode: string,
	fallbackMessage: string,
): ServiceResult<never> => {
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean };
		if (value.success === false) {
			return error as ServiceResult<never>;
		}
	}
	return { success: false, code: fallbackCode, message: fallbackMessage };
};

const parseDate = (value?: string | null) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const getLatestTimestamp = (values: Array<string | null | undefined>) => {
	let latest: Date | null = null;
	for (const value of values) {
		const parsed = parseDate(value);
		if (!parsed) continue;
		if (!latest || parsed > latest) latest = parsed;
	}
	return latest;
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

const buildSinceFilter = (field: string, since?: string | null) => {
	if (!since) return "";
	return `${field} >= '${formatKingdeeDate(since)}'`;
};

const getCell = (row: unknown[], index: number) => {
	if (!Array.isArray(row)) return "";
	const val = row[index];
	if (val === null || val === undefined) return "";
	return String(val);
};

const toIso = (value: string) => {
	if (!value) return "";
	const normalized = value.replace(" ", "T");
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString();
};

const toNumber = (value: string) => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const toBool = (value: string) => {
	const normalized = value.trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
};

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

const buildEnvelope = <T>(
	entityType: string,
	items: T[],
	nextSyncAt: Date | null,
): IntegrationEnvelope<T> => ({
	sourceSystem: "ERP",
	entityType,
	cursor: { nextSyncAt: nextSyncAt?.toISOString(), hasMore: false },
	items,
});

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
			return WorkOrderStatus.CLOSED;
		case "7": // 作废
			return WorkOrderStatus.CANCELLED;
		default:
			return WorkOrderStatus.RECEIVED;
	}
};

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
		return { routing: routing ?? null, mode: routing ? "routing_code" : "not_found" };
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
		return { routing: candidates[0], mode: "product_code" };
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

const WORK_ORDER_FIELDS_BASE = [
	"FBillNo",
	"FMaterialId.FNumber",
	"FMaterialId.FName",
	"FMaterialId.FSpecification",
	"FQty",
	"FPlanStartDate",
	"FPlanFinishDate",
	"FStatus", // 业务状态
	"FPickMtrlStatus", // 领料状态
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

type ErpRouteParseState = {
	routeMap: Map<string, ErpRoute>;
	lastHeader: ErpRouteHeader | null;
	latestModifiedAt: string;
};

const createRouteParseState = (): ErpRouteParseState => ({
	routeMap: new Map(),
	lastHeader: null,
	latestModifiedAt: "",
});

const applyErpRouteRows = (rows: unknown[], state: ErpRouteParseState) => {
	for (const rawRow of rows) {
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
			state.lastHeader = header;
			const existingRoute = state.routeMap.get(routeNo);
			if (existingRoute) {
				existingRoute.header = header;
			} else {
				state.routeMap.set(routeNo, { header, steps: [] });
			}
			if (header.modifiedAt) {
				if (!state.latestModifiedAt || header.modifiedAt > state.latestModifiedAt) {
					state.latestModifiedAt = header.modifiedAt;
				}
			}
		}

		if (!state.lastHeader) continue;
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

		const route = state.routeMap.get(state.lastHeader.routeNo);
		if (route) route.steps.push(step);
	}
};

const WORK_ORDER_ROUTING_FIELD_DEFAULT = "FRoutingId.FNumber";

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

const syncEnvelope = async <T>(
	db: PrismaClient,
	sourceSystem: string,
	entityType: string,
        since: string | null,
        payloadBuilder: () => Promise<T[]>,
        applyItems: (tx: Prisma.TransactionClient, items: T[]) => Promise<void>,
): Promise<ServiceResult<SyncResult<T>>> => {
        const businessKey = `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`;
        const items = await payloadBuilder();
        const nextSyncAt = getLatestTimestamp(
                items.map((item) => (item as { updatedAt?: string }).updatedAt),
        );
        const payload = buildEnvelope(entityType, items, nextSyncAt ?? new Date());
	const dedupeKey = `${sourceSystem}:${entityType}:${hashPayload(payload)}`;

	const syncResult = await db.$transaction(async (tx: Prisma.TransactionClient) => {
		await tx.integrationSyncCursor.upsert({
			where: { sourceSystem_entityType: { sourceSystem, entityType } },
			create: { sourceSystem, entityType, lastSyncAt: nextSyncAt ?? new Date() },
			update: { lastSyncAt: nextSyncAt ?? new Date() },
		});

		const duplicate = await tx.integrationMessage.findFirst({
			where: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				dedupeKey,
				status: "SUCCESS",
			},
			orderBy: { createdAt: "desc" },
		});
                if (duplicate?.payload && typeof duplicate.payload === "object") {
                        if (items.length > 0) {
                                await applyItems(tx, items);
                        }

                        return {
                                payload: duplicate.payload as IntegrationEnvelope<T>,
                                messageId: duplicate.id,
                                dedupeKey: duplicate.dedupeKey,
                        };
                }

		if (items.length > 0) {
			await applyItems(tx, items);
		}

		const message = await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey,
				dedupeKey,
				status: "SUCCESS",
				payload: toJsonValue(payload),
			},
			select: { id: true, dedupeKey: true },
		});

		return {
			payload,
			messageId: message.id,
			dedupeKey: message.dedupeKey,
		};
	});

	return {
		success: true,
		data: {
			payload: syncResult.payload,
			messageId: syncResult.messageId,
			businessKey,
			dedupeKey: syncResult.dedupeKey,
		},
	};
};

export const pullErpRoutes = async (
	options: PullOptions,
): Promise<ServiceResult<IntegrationEnvelope<ErpRoute>>> => {
	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) return sessionResult;

	const config = getErpMasterConfig();
	const startRow = options.startRow ?? 0;
	const limit = options.limit ?? 200;
	const since = options.since;

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

	const state = createRouteParseState();
	applyErpRouteRows(queryResult.data, state);

	const items = [...state.routeMap.values()];
	const hasMore = queryResult.data.length >= limit;
	const nextSyncAt = state.latestModifiedAt || since || new Date().toISOString();

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

export const pullErpRoutesPaginated = async (
	options: PullOptions,
): Promise<ServiceResult<IntegrationEnvelope<ErpRoute>>> => {
	const sessionResult = await getKingdeeSession();
	if (!sessionResult.success) return sessionResult;

	const config = getErpMasterConfig();
	let startRow = options.startRow ?? 0;
	const limit = options.limit ?? 200;
	const since = options.since;

	const state = createRouteParseState();
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

		applyErpRouteRows(queryResult.data, state);
		hasMore = queryResult.data.length >= limit;
		startRow += limit;
	}

	const nextSyncAt = state.latestModifiedAt || since || new Date().toISOString();

	return {
		success: true,
		data: {
			sourceSystem: "ERP",
			entityType: "ROUTING",
			cursor: { nextSyncAt, hasMore: false },
			items: [...state.routeMap.values()],
		},
	};
};

export const syncErpWorkOrders = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpWorkOrder>>> => {
	const sourceSystem = "ERP";
	const entityType = "WORK_ORDER";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return mockErpWorkOrders;
			throw sessionResult;
		}

		const routingField = config.workOrderRoutingField ?? WORK_ORDER_ROUTING_FIELD_DEFAULT;
		const fields = Array.from(new Set([...WORK_ORDER_FIELDS_BASE, routingField]));
		const routingFieldIndex = fields.indexOf(routingField);
		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			config.formIds.workOrder,
			fields.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeWorkOrders(rowsResult.data, routingFieldIndex);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpWorkOrder[]) => {
		for (const item of items) {
			const routingResolution = await resolveRoutingForWorkOrder(tx, item);
			const routing = routingResolution.routing;
			const routingMeta: Record<string, unknown> = {
				mode: routingResolution.mode,
				routingCode: item.routingCode ?? null,
				resolvedCode: routing?.code ?? null,
			};
			if (routingResolution.candidateCodes?.length) {
				routingMeta.candidateCodes = routingResolution.candidateCodes;
			}
			const erpMeta = {
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
			};
			await tx.workOrder.upsert({
				where: { woNo: item.woNo },
				update: {
					productCode: item.productCode,
					plannedQty: Math.round(item.plannedQty),
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
					plannedQty: Math.round(item.plannedQty),
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

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP work order fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpMaterials = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpMaterial>>> => {
	const sourceSystem = "ERP";
	const entityType = "MATERIAL";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return await getMockErpMaterials();
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			config.formIds.material,
			MATERIAL_FIELDS.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeMaterials(rowsResult.data);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpMaterial[]) => {
		for (const item of items) {
			const erpMeta = {
				specification: item.specification || null,
				barcode: item.barcode || null,
				description: item.description || null,
				documentStatus: item.documentStatus || null,
				forbidStatus: item.forbidStatus || null,
				isBatchManage: item.isBatchManage,
				isKFPeriod: item.isKFPeriod,
				isProduce: item.isProduce,
				isPurchase: item.isPurchase,
				categoryCode: item.categoryCode || null,
				unitCode: item.unitCode || null,
				produceUnitCode: item.produceUnitCode || null,
				produceUnitName: item.produceUnitName || null,
			};
			await tx.material.upsert({
				where: { code: item.materialCode },
				update: {
					name: item.name,
					category: item.category,
					unit: item.unit,
					model: item.model,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
				create: {
					code: item.materialCode,
					name: item.name,
					category: item.category,
					unit: item.unit,
					model: item.model,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP material fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpBoms = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpBomItem>>> => {
	const sourceSystem = "ERP";
	const entityType = "BOM";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return mockErpBoms;
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		const rowsResult = await fetchKingdeeRows(
			sessionResult.data,
			config.formIds.bom,
			BOM_FIELDS.join(","),
			filterString,
		);
		if (!rowsResult.success) throw rowsResult;
		return normalizeBoms(rowsResult.data);
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpBomItem[]) => {
		for (const item of items) {
			const erpMeta = {
				bomCode: item.bomCode || null,
				parentName: item.parentName || null,
				parentSpec: item.parentSpec || null,
				childName: item.childName || null,
				childSpec: item.childSpec || null,
				denominator: item.denominator,
				scrapRate: item.scrapRate,
				fixScrapQty: item.fixScrapQty,
				isKeyComponent: item.isKeyComponent,
				issueType: item.issueType || null,
				backflushType: item.backflushType || null,
				unitCode: item.unitCode || null,
				documentStatus: item.documentStatus || null,
				forbidStatus: item.forbidStatus || null,
			};
			await tx.bomItem.upsert({
				where: { parentCode_childCode: { parentCode: item.parentCode, childCode: item.childCode } },
				update: {
					qty: item.qty,
					unit: item.unit,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
				create: {
					parentCode: item.parentCode,
					childCode: item.childCode,
					qty: item.qty,
					unit: item.unit,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP BOM fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};

export const syncErpWorkCenters = async (
	db: PrismaClient,
	options: SyncOptions,
): Promise<ServiceResult<SyncResult<ErpWorkCenter>>> => {
	const sourceSystem = "ERP";
	const entityType = "WORK_CENTER";
	const cursor = await db.integrationSyncCursor.findUnique({
		where: { sourceSystem_entityType: { sourceSystem, entityType } },
	});
	const since = options.since ?? cursor?.lastSyncAt?.toISOString() ?? null;
	const config = getErpMasterConfig();

	const payloadBuilder = async () => {
		const sessionResult = await getKingdeeSession();
		if (!sessionResult.success) {
			if (sessionResult.code === "KINGDEE_CONFIG_MISSING") return await getMockErpWorkCenters();
			throw sessionResult;
		}

		const filterString = buildSinceFilter("FModifyDate", since);
		for (const formId of config.formIds.workCenter) {
			const rowsResult = await fetchKingdeeRows(
				sessionResult.data,
				formId,
				WORK_CENTER_FIELDS.join(","),
				filterString,
			);
			if (!rowsResult.success) throw rowsResult;
			if (rowsResult.data.length > 0) {
				return normalizeWorkCenters(rowsResult.data);
			}
		}

		return [];
	};

	const applyItems = async (tx: Prisma.TransactionClient, items: ErpWorkCenter[]) => {
		for (const item of items) {
			const erpMeta = {
				workCenterType: item.workCenterType || null,
				description: item.description || null,
				documentStatus: item.documentStatus || null,
			};
			await tx.workCenter.upsert({
				where: { code: item.workCenterCode },
				update: {
					name: item.name,
					departmentCode: item.departmentCode,
					departmentName: item.departmentName,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
				create: {
					code: item.workCenterCode,
					name: item.name,
					departmentCode: item.departmentCode,
					departmentName: item.departmentName,
					sourceUpdatedAt: parseDate(item.updatedAt),
					meta: { erp: erpMeta },
				},
			});
		}
	};

	try {
		return await syncEnvelope(db, sourceSystem, entityType, since, payloadBuilder, applyItems);
	} catch (error) {
		const errorMessage = getServiceErrorMessage(error, "ERP work center fetch failed");
		const result = toServiceError(error, "ERP_SYNC_FAILED", errorMessage);
		await db.integrationMessage.create({
			data: {
				direction: "IN",
				system: sourceSystem,
				entityType,
				businessKey: `${sourceSystem}:${entityType}:since:${since ?? "NONE"}`,
				status: "FAILED",
				payload: toJsonValue({ request: { since }, error: serializeError(error) }),
				error: errorMessage,
			},
		});
		return result;
	}
};
