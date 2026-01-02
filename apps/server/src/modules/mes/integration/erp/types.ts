// ==========================================
// Shared ERP Types
// ==========================================

export type ErpWorkOrder = {
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
	pickStatus: string;
	priority: string;
	srcBillNo: string;
	rptFinishQty: number;
	scrapQty: number;
	dueDate?: string;
	updatedAt: string;
};

export type ErpMaterial = {
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

export type ErpBomItem = {
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

export type ErpWorkCenter = {
	workCenterCode: string;
	name: string;
	departmentCode: string;
	departmentName: string;
	workCenterType: string;
	description: string;
	documentStatus: string;
	updatedAt: string;
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
	updatedAt?: string; // Derived from header.modifiedAt for sync pipeline compatibility
};

export type ErpMasterConfig = {
	workOrderRoutingField?: string | null;
	formIds: {
		workOrder: string;
		material: string;
		bom: string;
		workCenter: string[];
		routing: string;
	};
};
