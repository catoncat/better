import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env.local") });

const runSync = async (prisma: typeof import("../src/plugins/prisma").prisma) => {
	const { syncErpRoutes } = await import("../src/modules/mes/integration/sync-service");
	const {
		syncErpBoms,
		syncErpMaterials,
		syncErpWorkCenters,
		syncErpWorkOrders,
	} = await import("../src/modules/mes/integration/erp-master-sync-service");

	const sinceOverride = process.env.MES_SYNC_SINCE_OVERRIDE?.trim() || undefined;
	const syncOptions = sinceOverride ? { since: sinceOverride } : {};

	const routeLimitEnv = process.env.MES_SYNC_ROUTE_LIMIT;
	const routeLimit =
		routeLimitEnv && Number.isFinite(Number(routeLimitEnv)) ? Number(routeLimitEnv) : undefined;
	const routeOptions = routeLimit ? { ...syncOptions, limit: routeLimit } : syncOptions;
	const runRouteSync = async () => await syncErpRoutes(prisma, routeOptions);

	const tasks = [
		{ key: "routes", name: "ERP routes", run: () => runRouteSync() },
		{ key: "work-orders", name: "ERP work orders", run: () => syncErpWorkOrders(prisma, syncOptions) },
		{ key: "materials", name: "ERP materials", run: () => syncErpMaterials(prisma, syncOptions) },
		{ key: "boms", name: "ERP BOMs", run: () => syncErpBoms(prisma, syncOptions) },
		{ key: "work-centers", name: "ERP work centers", run: () => syncErpWorkCenters(prisma, syncOptions) },
	];

	const taskFilter = process.env.MES_SYNC_TASKS?.split(",").map((value) => value.trim()).filter(Boolean);
	const filteredTasks =
		taskFilter && taskFilter.length > 0
			? tasks.filter((task) => taskFilter.includes(task.key))
			: tasks;

	for (const task of filteredTasks) {
		console.log(`\n[SYNC] ${task.name}`);
		const result = await task.run();
		if (!result.success) {
			console.error(`[SYNC] ${task.name} failed: ${result.code} ${result.message}`);
			continue;
		}
		console.log(
			`[SYNC] ${task.name} ok. items=${result.data.payload.items.length} nextSyncAt=${result.data.payload.cursor.nextSyncAt ?? "n/a"}`,
		);
	}
};

const summarizeData = async (prisma: typeof import("../src/plugins/prisma").prisma) => {
	const routingTotal = await prisma.routing.count({ where: { sourceSystem: "ERP" } });
	const routingNoSteps = await prisma.routing.count({
		where: { sourceSystem: "ERP", steps: { none: {} } },
	});
	const workOrderTotal = await prisma.workOrder.count();
	const workOrderMissingRouting = await prisma.workOrder.count({ where: { routingId: null } });
	const materialTotal = await prisma.material.count();
	const bomTotal = await prisma.bomItem.count();
	const workCenterTotal = await prisma.workCenter.count();

	const sampleMissingRouting = await prisma.workOrder.findMany({
		where: { routingId: null },
		orderBy: { createdAt: "desc" },
		take: 5,
		select: { woNo: true, productCode: true, meta: true },
	});

	const missingRoutingDetails = sampleMissingRouting.map((wo) => {
		const meta = wo.meta as Record<string, unknown> | null;
		const erpRouting =
			meta && typeof meta === "object" ? (meta.erpRouting as Record<string, unknown> | undefined) : undefined;
		return {
			woNo: wo.woNo,
			productCode: wo.productCode,
			mode: erpRouting?.mode ?? "unknown",
			routingCode: erpRouting?.routingCode ?? null,
			resolvedCode: erpRouting?.resolvedCode ?? null,
		};
	});

	console.log("\n[SUMMARY] ERP data snapshot");
	console.log(
		JSON.stringify(
			{
				routingTotal,
				routingNoSteps,
				workOrderTotal,
				workOrderMissingRouting,
				materialTotal,
				bomTotal,
				workCenterTotal,
				sampleMissingRouting: missingRoutingDetails,
			},
			null,
			2,
		),
	);
};

const debugKingdeeRoutes = async () => {
	const { getKingdeeConfig, kingdeeExecuteBillQuery, kingdeeLogin } = await import(
		"../src/modules/mes/integration/kingdee"
	);

	const configResult = getKingdeeConfig();
	if (!configResult.success) {
		console.error(`[DEBUG] Kingdee config missing: ${configResult.code}`);
		return;
	}

	const loginResult = await kingdeeLogin(configResult.data);
	if (!loginResult.success) {
		console.error(`[DEBUG] Kingdee login failed: ${loginResult.code} ${loginResult.message}`);
		return;
	}

	const minimalFields = ["FNumber", "FName"];
	const fullFields = [
		"FID",
		"FNumber",
		"FName",
		"FMATERIALID.FNumber",
		"FMATERIALID.FName",
		"FUseOrgId.FNumber",
		"FCreateOrgId.FNumber",
		"FEFFECTDATE",
		"FExpireDate",
		"FRouteSrc",
		"FBomId.FNumber",
		"FModifyDate",
		"FOperNumber",
		"FProcessId.FNumber",
		"FProcessId.FName",
		"FWorkCenterId.FNumber",
		"FWorkCenterId.FName",
		"FDepartmentId.FNumber",
		"FDepartmentId.FName",
		"FOperDescription",
		"FKeyOper",
		"FIsFirstPieceInspect",
		"FIsProcessRecordStation",
		"FIsQualityInspectStation",
	];

	const minimalResult = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId: "ENG_Route",
		fieldKeys: minimalFields.join(","),
		startRow: 0,
		limit: 5,
	});

	if (!minimalResult.success) {
		console.error(`[DEBUG] ENG_Route minimal query failed: ${minimalResult.code} ${minimalResult.message}`);
	} else {
		console.log(
			`[DEBUG] ENG_Route minimal rows=${minimalResult.data.length} sample=${JSON.stringify(
				minimalResult.data[0] ?? null,
			)}`,
		);
	}

	const fullResult = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId: "ENG_Route",
		fieldKeys: fullFields.join(","),
		startRow: 0,
		limit: 5,
	});

	if (!fullResult.success) {
		console.error(`[DEBUG] ENG_Route full query failed: ${fullResult.code} ${fullResult.message}`);
	} else {
		console.log(
			`[DEBUG] ENG_Route full rows=${fullResult.data.length} sample=${JSON.stringify(
				fullResult.data[0] ?? null,
			)}`,
		);
	}

	const headCandidates = ["FID", "FId", "FHeadId", "FBillHead"];
	for (const candidate of headCandidates) {
		const result = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
			formId: "ENG_Route",
			fieldKeys: [candidate, "FNumber"].join(","),
			startRow: 0,
			limit: 5,
		});
		if (!result.success) {
			console.error(`[DEBUG] ENG_Route head field ${candidate} failed: ${result.code} ${result.message}`);
			continue;
		}
		console.log(
			`[DEBUG] ENG_Route head field ${candidate} rows=${result.data.length} sample=${JSON.stringify(
				result.data[0] ?? null,
			)}`,
		);
	}

	const stepPrefixes = ["FEntity", "FSubEntity"];
	for (const prefix of stepPrefixes) {
		const result = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
			formId: "ENG_Route",
			fieldKeys: [
				"FID",
				"FNumber",
				`${prefix}.FOperNumber`,
				`${prefix}.FProcessId.FNumber`,
				`${prefix}.FWorkCenterId.FNumber`,
			].join(","),
			startRow: 0,
			limit: 5,
		});
		if (!result.success) {
			console.error(`[DEBUG] ENG_Route step prefix ${prefix} failed: ${result.code} ${result.message}`);
			continue;
		}
		console.log(
			`[DEBUG] ENG_Route step prefix ${prefix} rows=${result.data.length} sample=${JSON.stringify(
				result.data[0] ?? null,
			)}`,
		);
	}

	const noPrefixResult = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId: "ENG_Route",
		fieldKeys: [
			"FID",
			"FNumber",
			"FOperNumber",
			"FProcessId.FNumber",
			"FWorkCenterId.FNumber",
		].join(","),
		startRow: 0,
		limit: 5,
	});
	if (!noPrefixResult.success) {
		console.error(
			`[DEBUG] ENG_Route step fields no prefix failed: ${noPrefixResult.code} ${noPrefixResult.message}`,
		);
	} else {
		console.log(
			`[DEBUG] ENG_Route step fields no prefix rows=${noPrefixResult.data.length} sample=${JSON.stringify(
				noPrefixResult.data[0] ?? null,
			)}`,
		);
	}

	const workCenterForms = ["BD_WorkCenter", "PRD_WorkCenter"];
	for (const formId of workCenterForms) {
		const result = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
			formId,
			fieldKeys: ["FNumber", "FName"].join(","),
			startRow: 0,
			limit: 5,
		});
		if (!result.success) {
			console.error(`[DEBUG] ${formId} query failed: ${result.code} ${result.message}`);
			continue;
		}
		console.log(
			`[DEBUG] ${formId} rows=${result.data.length} sample=${JSON.stringify(
				result.data[0] ?? null,
			)}`,
		);
	}

	const routingFieldCandidates = [
		"FRouteId.FNumber",
		"FRouteId",
		"FRouteNo",
		"FRoutingId.FNumber",
		"FRoutingId",
		"FRouteNumber",
	];
	for (const candidate of routingFieldCandidates) {
		const result = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
			formId: "PRD_MO",
			fieldKeys: ["FBillNo", "FMaterialId.FNumber", candidate].join(","),
			startRow: 0,
			limit: 5,
		});
		if (!result.success) {
			console.error(`[DEBUG] PRD_MO routing field ${candidate} failed: ${result.code} ${result.message}`);
			continue;
		}
		console.log(
			`[DEBUG] PRD_MO routing field ${candidate} rows=${result.data.length} sample=${JSON.stringify(
				result.data[0] ?? null,
			)}`,
		);
	}

	const routingSample = await kingdeeExecuteBillQuery(configResult.data, loginResult.data.cookie, {
		formId: "PRD_MO",
		fieldKeys: ["FBillNo", "FMaterialId.FNumber", "FRoutingId.FNumber"].join(","),
		startRow: 0,
		limit: 200,
	});
	if (routingSample.success) {
		const rows = routingSample.data;
		const nonEmpty = rows.filter((row) => Array.isArray(row) && row[2]).length;
		console.log(
			`[DEBUG] PRD_MO FRoutingId.FNumber non-empty=${nonEmpty}/${rows.length}`,
		);
	} else {
		console.error(
			`[DEBUG] PRD_MO FRoutingId.FNumber sample failed: ${routingSample.code} ${routingSample.message}`,
		);
	}

	const metadataUrl = `${configResult.data.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.GetFormMetadata.common.kdsvc`;
	const metadataResponse = await fetch(metadataUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: loginResult.data.cookie,
		},
		body: JSON.stringify({ data: { FormId: "ENG_Route" } }),
	});

	if (!metadataResponse.ok) {
		console.error(`[DEBUG] ENG_Route metadata failed: ${metadataResponse.status}`);
		return;
	}

	const metadataText = await metadataResponse.text();
	let metadataRaw: unknown;
	try {
		metadataRaw = JSON.parse(metadataText) as unknown;
	} catch {
		console.error(
			`[DEBUG] ENG_Route metadata is not JSON. Preview=${metadataText.slice(0, 200)}`,
		);
		return;
	}

	const metadataResult =
		metadataRaw && typeof metadataRaw === "object" && "Result" in metadataRaw
			? (metadataRaw as { Result?: unknown }).Result
			: metadataRaw;
	const metadata =
		typeof metadataResult === "string" ? (JSON.parse(metadataResult) as Record<string, unknown>) : metadataResult;

	const entryEntities =
		metadata &&
		typeof metadata === "object" &&
		"BusinessInfo" in metadata &&
		(metadata as { BusinessInfo?: { EntryEntity?: Array<Record<string, unknown>> } }).BusinessInfo
			?.EntryEntity;

	if (Array.isArray(entryEntities)) {
		const entryKeys = entryEntities
			.map((entity) => (typeof entity === "object" && entity ? (entity.Key as string | undefined) : undefined))
			.filter(Boolean);
		console.log(`[DEBUG] ENG_Route entry entities: ${entryKeys.join(", ")}`);
	} else {
		console.log("[DEBUG] ENG_Route entry entities not found in metadata.");
	}
};

const main = async () => {
	const { prisma } = await import("../src/plugins/prisma");

	try {
		await runSync(prisma);
		await summarizeData(prisma);
		await debugKingdeeRoutes();
	} finally {
		await prisma.$disconnect();
	}
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
