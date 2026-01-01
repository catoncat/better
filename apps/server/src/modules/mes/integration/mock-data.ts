type ErpRouteHeader = {
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

type ErpRouteStep = {
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

type ErpRoute = {
	header: ErpRouteHeader;
	steps: ErpRouteStep[];
};

type ParsedRouteData = {
	routes: ErpRoute[];
	materials: typeof fallbackErpMaterials;
	workCenters: typeof fallbackErpWorkCenters;
};

const fallbackErpRoutes: ErpRoute[] = [
	{
		header: {
			headId: "228055",
			routeNo: "100-241-184R",
			routeName: "100-241-184R(CABLE)",
			productCode: "100-241-184R",
			productName: "Cable Driver Board",
			useOrgCode: "100",
			createOrgCode: "100",
			effectiveFrom: "2025-03-27",
			effectiveTo: "9999-12-31",
			routeSource: "ERP",
			bomCode: "100-241-184R",
			modifiedAt: "2025-03-27T13:48:50Z",
		},
		steps: [
			{
				stepNo: 10,
				processCode: "Cable",
				processName: "Cable",
				workCenterCode: "WC000001",
				workCenterName: "Production",
				departmentCode: "BM000006",
				departmentName: "Production",
				description: "Cable",
				keyOper: true,
				firstPieceInspect: false,
				processRecordStation: false,
				qualityInspectStation: false,
			},
			{
				stepNo: 20,
				processCode: "WIP_QC",
				processName: "WIP QC",
				workCenterCode: "WC000001",
				workCenterName: "Production",
				departmentCode: "BM000006",
				departmentName: "Production",
				description: "QC Check",
				keyOper: false,
				firstPieceInspect: false,
				processRecordStation: false,
				qualityInspectStation: true,
			},
			{
				stepNo: 30,
				processCode: "FINAL_QA",
				processName: "Final QA",
				workCenterCode: "WC000001",
				workCenterName: "Production",
				departmentCode: "BM000006",
				departmentName: "Production",
				description: "Final QA",
				keyOper: false,
				firstPieceInspect: false,
				processRecordStation: false,
				qualityInspectStation: true,
			},
		],
	},
];

const fallbackErpMaterials = [
	{
		materialCode: "100-241-184R",
		name: "Cable Driver Board",
		category: "Assembly",
		categoryCode: "ASSY",
		unit: "EA",
		unitCode: "EA",
		model: "ASSY Cable Driver Board",
		specification: "ASSY Cable Driver Board",
		barcode: "MAT-100-241-184R",
		description: "Cable driver board",
		documentStatus: "C",
		forbidStatus: "A",
		isBatchManage: false,
		isKFPeriod: false,
		isProduce: true,
		isPurchase: false,
		produceUnitCode: "EA",
		produceUnitName: "EA",
		updatedAt: "2025-03-27T00:00:00Z",
	},
];

const fallbackErpWorkCenters = [
	{
		workCenterCode: "WC000001",
		name: "Production",
		departmentCode: "BM000006",
		departmentName: "Production",
		workCenterType: "1",
		description: "Main production center",
		documentStatus: "C",
		updatedAt: "2025-03-27T00:00:00Z",
	},
];

const csvUrl = new URL("../../../../../../others/erp_route.csv", import.meta.url);
let routeCache: ParsedRouteData | null = null;

const parseCsvLine = (line: string) => {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
				continue;
			}
			inQuotes = !inQuotes;
			continue;
		}
		if (char === "," && !inQuotes) {
			result.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	result.push(current);
	return result;
};

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

const loadErpRoutesFromCsv = async (): Promise<ParsedRouteData> => {
	if (routeCache) return routeCache;

	try {
		const text = await Bun.file(csvUrl).text();
		const lines = text.split(/\r?\n/);
		const headerIndex = lines.findIndex(
			(line) => line.includes("FBillHead(ENG_Route)") || line.includes("FID(ENG_Route)"),
		);
		if (headerIndex < 0) {
			routeCache = {
				routes: fallbackErpRoutes,
				materials: fallbackErpMaterials,
				workCenters: fallbackErpWorkCenters,
			};
			return routeCache;
		}

		const headerLine = lines[headerIndex];
		if (!headerLine) {
			routeCache = {
				routes: fallbackErpRoutes,
				materials: fallbackErpMaterials,
				workCenters: fallbackErpWorkCenters,
			};
			return routeCache;
		}
		const headerColumns = parseCsvLine(headerLine).map((value) => value.trim());
		const indexOf = (name: string) => headerColumns.indexOf(name);
		const headerRowIndex = headerIndex + 1;
		let dataStart = headerRowIndex;
		if (lines[dataStart]?.startsWith("*")) dataStart += 1;

		const idxHeadId =
			indexOf("FBillHead(ENG_Route)") >= 0
				? indexOf("FBillHead(ENG_Route)")
				: indexOf("FID(ENG_Route)");
		const idxRouteNo = indexOf("FNumber");
		const idxRouteName = indexOf("FName");
		const idxProductCode = indexOf("FMATERIALID");
		const idxProductName = indexOf("FMATERIALID#Name");
		const idxUseOrg = indexOf("FUseOrgId");
		const idxCreateOrg = indexOf("FCreateOrgId");
		const idxEffectiveFrom = indexOf("FEFFECTDATE");
		const idxEffectiveTo = indexOf("FExpireDate");
		const idxRouteSrc = indexOf("FRouteSrc");
		const idxBomId = indexOf("FBomId");
		const idxModifyDate = indexOf("FModifyDate");
		const idxOperNumber = indexOf("FOperNumber");
		const idxProcessId = indexOf("FProcessId");
		const idxProcessName = indexOf("FProcessId#Name");
		const idxWorkCenterId = indexOf("FWorkCenterId");
		const idxWorkCenterName = indexOf("FWorkCenterId#Name");
		const idxDepartmentId = indexOf("FDepartmentId");
		const idxDepartmentName = indexOf("FDepartmentId#Name");
		const idxOperDescription = indexOf("FOperDescription");
		const idxKeyOper = indexOf("FKeyOper");
		const idxFirstPiece = indexOf("FIsFirstPieceInspect");
		const idxProcessRecordStation = indexOf("FIsProcessRecordStation");
		const idxQualityInspectStation = indexOf("FIsQualityInspectStation");

		let lastHeader: ErpRouteHeader | null = null;
		const routeMap = new Map<string, ErpRoute>();
		const materialMap = new Map<string, (typeof fallbackErpMaterials)[number]>();
		const workCenterMap = new Map<string, (typeof fallbackErpWorkCenters)[number]>();

		for (let i = dataStart; i < lines.length; i += 1) {
			const line = lines[i];
			if (!line || line.startsWith("Table 1")) continue;
			const cells = parseCsvLine(line);
			while (cells.length < headerColumns.length) cells.push("");

			const routeNo = cells[idxRouteNo]?.trim();
			if (routeNo) {
				const header: ErpRouteHeader = {
					headId: cells[idxHeadId]?.trim() ?? "",
					routeNo,
					routeName: cells[idxRouteName]?.trim() ?? "",
					productCode: cells[idxProductCode]?.trim() ?? "",
					productName: cells[idxProductName]?.trim() ?? "",
					useOrgCode: cells[idxUseOrg]?.trim() ?? "",
					createOrgCode: cells[idxCreateOrg]?.trim() ?? "",
					effectiveFrom: cells[idxEffectiveFrom]?.trim() ?? "",
					effectiveTo: cells[idxEffectiveTo]?.trim() ?? "",
					routeSource: cells[idxRouteSrc]?.trim() ?? "",
					bomCode: cells[idxBomId]?.trim() ?? "",
					modifiedAt: toIso(cells[idxModifyDate]?.trim() ?? ""),
				};
				lastHeader = header;
				const existingRoute = routeMap.get(routeNo);
				if (existingRoute) {
					existingRoute.header = header;
				} else {
					routeMap.set(routeNo, { header, steps: [] });
				}
				if (header.productCode) {
					materialMap.set(header.productCode, {
						materialCode: header.productCode,
						name: header.productName || header.productCode,
						category: "Assembly",
						model: header.routeName || header.productName || header.productCode,
						categoryCode: "ASSY",
						unit: "EA",
						unitCode: "EA",
						specification: header.productName || header.productCode,
						barcode: `MAT-${header.productCode}`,
						description: header.productName || header.productCode,
						documentStatus: "C",
						forbidStatus: "A",
						isBatchManage: false,
						isKFPeriod: false,
						isProduce: true,
						isPurchase: false,
						produceUnitCode: "EA",
						produceUnitName: "EA",
						updatedAt: header.modifiedAt || "",
					});
				}
			}

			if (!lastHeader) continue;
			const currentRoute = routeMap.get(lastHeader.routeNo);
			if (!currentRoute) continue;

			const stepNoValue = cells[idxOperNumber]?.trim();
			if (!stepNoValue) continue;

			const step: ErpRouteStep = {
				stepNo: Number(stepNoValue),
				processCode: cells[idxProcessId]?.trim() ?? "",
				processName: cells[idxProcessName]?.trim() ?? "",
				workCenterCode: cells[idxWorkCenterId]?.trim() ?? "",
				workCenterName: cells[idxWorkCenterName]?.trim() ?? "",
				departmentCode: cells[idxDepartmentId]?.trim() ?? "",
				departmentName: cells[idxDepartmentName]?.trim() ?? "",
				description: cells[idxOperDescription]?.trim() ?? "",
				keyOper: toBool(cells[idxKeyOper] ?? ""),
				firstPieceInspect: toBool(cells[idxFirstPiece] ?? ""),
				processRecordStation: toBool(cells[idxProcessRecordStation] ?? ""),
				qualityInspectStation: toBool(cells[idxQualityInspectStation] ?? ""),
			};

			if (step.workCenterCode) {
				workCenterMap.set(step.workCenterCode, {
					workCenterCode: step.workCenterCode,
					name: step.workCenterName || step.workCenterCode,
					departmentCode: step.departmentCode || "",
					departmentName: step.departmentName || "",
					workCenterType: "1",
					description: step.workCenterName || step.workCenterCode,
					documentStatus: "C",
					updatedAt: lastHeader.modifiedAt || "",
				});
			}

			currentRoute.steps.push(step);
		}

		routeCache = {
			routes: routeMap.size ? [...routeMap.values()] : fallbackErpRoutes,
			materials: materialMap.size ? [...materialMap.values()] : fallbackErpMaterials,
			workCenters: workCenterMap.size ? [...workCenterMap.values()] : fallbackErpWorkCenters,
		};
		return routeCache;
	} catch {
		routeCache = {
			routes: fallbackErpRoutes,
			materials: fallbackErpMaterials,
			workCenters: fallbackErpWorkCenters,
		};
		return routeCache;
	}
};

export const getMockErpRoutes = async () => (await loadErpRoutesFromCsv()).routes;
export const getMockErpMaterials = async () => (await loadErpRoutesFromCsv()).materials;
export const getMockErpWorkCenters = async () => (await loadErpRoutesFromCsv()).workCenters;

export const mockErpWorkOrders = [
	{
		woNo: "WO20250327-001",
		productCode: "100-241-184R",
		productName: "Cable Driver Board",
		productSpec: "ASSY Cable Driver Board",
		plannedQty: 100,
		planStartDate: "2025-04-01T00:00:00Z",
		planFinishDate: "2025-04-10T00:00:00Z",
		unitCode: "EA",
		unitName: "EA",
		workshopCode: "WS-01",
		workshopName: "Assembly",
		routingCode: "100-241-184R",
		routingName: "100-241-184R",
		status: "2", // 下达
		pickStatus: "3", // 全部领料
		priority: "2",
		srcBillNo: "SO-20250327-01",
		rptFinishQty: 0,
		scrapQty: 0,
		dueDate: "2025-04-10T00:00:00Z",
		updatedAt: "2025-03-27T08:00:00Z",
	},
];

export const mockErpBoms = [
	{
		bomCode: "100-241-184R",
		parentCode: "100-241-184R",
		parentName: "Cable Driver Board",
		parentSpec: "ASSY Cable Driver Board",
		childCode: "COMP-001",
		childName: "Connector",
		childSpec: "CONN-001",
		qty: 2,
		denominator: 1,
		scrapRate: 0.02,
		fixScrapQty: 0,
		isKeyComponent: true,
		issueType: "1",
		backflushType: "1",
		unit: "EA",
		unitCode: "EA",
		documentStatus: "C",
		forbidStatus: "A",
		updatedAt: "2025-03-27T00:00:00Z",
	},
];

export const mockTpmEquipments = [
	{
		equipmentCode: "ST-001",
		name: "Manual Station 1",
		status: "normal",
		workshopCode: "WS-01",
		location: "Line A",
		updatedAt: "2025-03-27T06:30:00Z",
	},
];

export const mockTpmStatusLogs = [
	{
		equipmentCode: "ST-001",
		status: "normal",
		reason: "Ready",
		startedAt: "2025-03-27T06:00:00Z",
		endedAt: null,
	},
];

export const mockTpmMaintenanceTasks = [
	{
		taskNo: "MT-20250327-001",
		equipmentCode: "ST-001",
		type: "routine",
		status: "completed",
		scheduledDate: "2025-03-27",
		startTime: "2025-03-27T05:00:00Z",
		completedAt: "2025-03-27T05:30:00Z",
	},
];
