import type { Prisma, PrismaClient } from "@better-app/db";
import {
	IntegrationSource,
	ProcessType,
	SolderPasteStatus,
	StationType,
	StencilStatus,
	TimeRuleScope,
	TimeRuleType,
} from "@better-app/db";
import { compileRouteExecution } from "../routing/service";

type SeedMesMasterDataOptions = {
	prisma: PrismaClient;
	compileRoutes?: boolean;
};

const ROUTING_CODES = ["PCBA-STD-V1", "PCBA-DIP-V1"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ensureLineReadinessEnabled = async (
	prisma: PrismaClient,
	lineId: string,
	enabledReadiness: string[],
) => {
	const existingMeta = await prisma.line.findUnique({
		where: { id: lineId },
		select: { meta: true },
	});

	const baseMeta = isRecord(existingMeta?.meta) ? existingMeta?.meta : {};
	const readinessChecks = isRecord(baseMeta.readinessChecks) ? baseMeta.readinessChecks : {};
	const existingEnabled =
		Array.isArray(readinessChecks.enabled) &&
		readinessChecks.enabled.every((v) => typeof v === "string")
			? (readinessChecks.enabled as string[])
			: null;

	const nextMeta = {
		...baseMeta,
		readinessChecks: {
			...readinessChecks,
			enabled: existingEnabled && existingEnabled.length > 0 ? existingEnabled : enabledReadiness,
		},
	};

	if (JSON.stringify(baseMeta) !== JSON.stringify(nextMeta)) {
		await prisma.line.update({
			where: { id: lineId },
			data: { meta: nextMeta as Prisma.InputJsonValue },
		});
	}
};

const ensureDefaultRouteVersions = async (prisma: PrismaClient) => {
	for (const routingCode of ROUTING_CODES) {
		const result = await compileRouteExecution(prisma, routingCode);
		if (!result.success) {
			throw new Error(`Failed to compile route ${routingCode}: ${result.code} ${result.message}`);
		}

		if (result.data.status !== "READY") {
			const errors = Array.isArray(result.data.errorsJson)
				? JSON.stringify(result.data.errorsJson)
				: null;
			throw new Error(`Route ${routingCode} is not READY${errors ? `: ${errors}` : ""}`);
		}
	}
};

export const seedMesMasterData = async ({
	prisma,
	compileRoutes = true,
}: SeedMesMasterDataOptions) => {
	console.log("Seeding MES master data (SMT + DIP)...");

	// Lines
	const lineA = await prisma.line.upsert({
		where: { code: "LINE-A" },
		update: { name: "SMT Production Line A", processType: ProcessType.SMT },
		create: { code: "LINE-A", name: "SMT Production Line A", processType: ProcessType.SMT },
	});

	const dipLineA = await prisma.line.upsert({
		where: { code: "LINE-DIP-A" },
		update: { name: "DIP Production Line A", processType: ProcessType.DIP },
		create: { code: "LINE-DIP-A", name: "DIP Production Line A", processType: ProcessType.DIP },
	});

	// Readiness defaults (go-live baseline for demo line)
	await ensureLineReadinessEnabled(prisma, lineA.id, [
		"ROUTE",
		"LOADING",
		"EQUIPMENT",
		"MATERIAL",
		"STENCIL",
		"SOLDER_PASTE",
		"PREP_BAKE",
		"PREP_PASTE",
		"PREP_STENCIL_USAGE",
		"PREP_STENCIL_CLEAN",
		"PREP_SCRAPER",
		"PREP_FIXTURE",
		"PREP_PROGRAM",
		"TIME_RULE",
	]);
	await ensureLineReadinessEnabled(prisma, dipLineA.id, ["ROUTE"]);

	// Time rules
	const timeRules = [
		{
			code: "SOLDER_PASTE_24H",
			name: "Solder Paste Exposure Time (24h)",
			description: "Solder paste exposure time should not exceed 24 hours",
			ruleType: TimeRuleType.SOLDER_PASTE_EXPOSURE,
			durationMinutes: 24 * 60,
			warningMinutes: 2 * 60,
			startEvent: "SOLDER_PASTE_USAGE_CREATE",
			endEvent: "TRACK_OUT",
			scope: TimeRuleScope.GLOBAL,
			isWaivable: true,
			isActive: true,
			priority: 10,
		},
		{
			code: "WASH_4H",
			name: "Wash Time Window (4h)",
			description: "Time from Reflow/AOI to Wash should not exceed 4 hours",
			ruleType: TimeRuleType.WASH_TIME_LIMIT,
			durationMinutes: 4 * 60,
			warningMinutes: 30,
			startEvent: "TRACK_OUT",
			endEvent: "TRACK_IN",
			scope: TimeRuleScope.GLOBAL,
			requiresWashStep: true,
			isWaivable: true,
			isActive: true,
			priority: 10,
		},
	];

	for (const rule of timeRules) {
		await prisma.timeRuleDefinition.upsert({
			where: { code: rule.code },
			update: rule,
			create: rule,
		});
	}
	console.log("  -> Default time rules ensured");

	// Station groups
	const smtGroupA = await prisma.stationGroup.upsert({
		where: { code: "SMT-LINE-A" },
		update: { name: "SMT Line A Group" },
		create: { code: "SMT-LINE-A", name: "SMT Line A Group" },
	});

	const dipGroupA = await prisma.stationGroup.upsert({
		where: { code: "DIP-LINE-A" },
		update: { name: "DIP Line A Group" },
		create: { code: "DIP-LINE-A", name: "DIP Line A Group" },
	});

	const smtGroupSpi = await prisma.stationGroup.upsert({
		where: { code: "SMT-SPI-A" },
		update: { name: "SMT SPI Group" },
		create: { code: "SMT-SPI-A", name: "SMT SPI Group" },
	});

	const smtGroupMount = await prisma.stationGroup.upsert({
		where: { code: "SMT-MOUNT-A" },
		update: { name: "SMT Mounting Group" },
		create: { code: "SMT-MOUNT-A", name: "SMT Mounting Group" },
	});

	const smtGroupReflow = await prisma.stationGroup.upsert({
		where: { code: "SMT-REFLOW-A" },
		update: { name: "SMT Reflow Group" },
		create: { code: "SMT-REFLOW-A", name: "SMT Reflow Group" },
	});

	const smtGroupAoi = await prisma.stationGroup.upsert({
		where: { code: "SMT-AOI-A" },
		update: { name: "SMT AOI Group" },
		create: { code: "SMT-AOI-A", name: "SMT AOI Group" },
	});

	const dipGroupWave = await prisma.stationGroup.upsert({
		where: { code: "DIP-WAVE-A" },
		update: { name: "DIP Wave Solder Group" },
		create: { code: "DIP-WAVE-A", name: "DIP Wave Solder Group" },
	});

	const dipGroupPost = await prisma.stationGroup.upsert({
		where: { code: "DIP-POST-A" },
		update: { name: "DIP Post Solder Group" },
		create: { code: "DIP-POST-A", name: "DIP Post Solder Group" },
	});

	const dipGroupTest = await prisma.stationGroup.upsert({
		where: { code: "DIP-TEST-A" },
		update: { name: "DIP Functional Test Group" },
		create: { code: "DIP-TEST-A", name: "DIP Functional Test Group" },
	});

	// Stations
	const stations = [
		{
			code: "ST-PRINT-01",
			name: "Stencil Printer 01",
			type: StationType.MANUAL,
			lineId: lineA.id,
			groupId: smtGroupA.id,
		},
		{
			code: "ST-SPI-01",
			name: "SPI 01",
			type: StationType.MANUAL,
			lineId: lineA.id,
			groupId: smtGroupSpi.id,
		},
		{
			code: "ST-MOUNT-01",
			name: "Pick & Place 01",
			type: StationType.MANUAL,
			lineId: lineA.id,
			groupId: smtGroupMount.id,
		},
		{
			code: "ST-REFLOW-01",
			name: "Reflow Oven 01",
			type: StationType.MANUAL,
			lineId: lineA.id,
			groupId: smtGroupReflow.id,
		},
		{
			code: "ST-AOI-01",
			name: "AOI 01",
			type: StationType.MANUAL,
			lineId: lineA.id,
			groupId: smtGroupAoi.id,
		},
		{
			code: "ST-DIP-INS-01",
			name: "DIP Insertion 01",
			type: StationType.MANUAL,
			lineId: dipLineA.id,
			groupId: dipGroupA.id,
		},
		{
			code: "ST-DIP-WAVE-01",
			name: "Wave Solder 01",
			type: StationType.MANUAL,
			lineId: dipLineA.id,
			groupId: dipGroupWave.id,
		},
		{
			code: "ST-DIP-POST-01",
			name: "Post Solder 01",
			type: StationType.MANUAL,
			lineId: dipLineA.id,
			groupId: dipGroupPost.id,
		},
		{
			code: "ST-DIP-TEST-01",
			name: "Functional Test 01",
			type: StationType.MANUAL,
			lineId: dipLineA.id,
			groupId: dipGroupTest.id,
		},
	] as const;

	for (const station of stations) {
		await prisma.station.upsert({
			where: { code: station.code },
			update: {
				name: station.name,
				stationType: station.type,
				lineId: station.lineId,
				groupId: station.groupId,
			},
			create: {
				code: station.code,
				name: station.name,
				stationType: station.type,
				lineId: station.lineId,
				groupId: station.groupId,
			},
		});
	}

	// Operations
	type OperationSeed = {
		code: string;
		name: string;
		type: StationType;
		isKeyQuality?: boolean;
	};

	const operations: OperationSeed[] = [
		{ code: "PRINTING", name: "Solder Paste Printing", type: StationType.MANUAL },
		{ code: "SPI", name: "Solder Paste Inspection", type: StationType.MANUAL, isKeyQuality: true },
		{ code: "MOUNTING", name: "Component Mounting", type: StationType.MANUAL },
		{ code: "REFLOW", name: "Reflow Soldering", type: StationType.MANUAL },
		{
			code: "AOI",
			name: "Automated Optical Inspection",
			type: StationType.MANUAL,
			isKeyQuality: true,
		},
		{ code: "DIP_INSERT", name: "DIP Insertion", type: StationType.MANUAL },
		{ code: "WAVE_SOLDER", name: "Wave Solder", type: StationType.MANUAL },
		{ code: "POST_SOLDER", name: "Post Solder", type: StationType.MANUAL },
		{ code: "FUNC_TEST", name: "Functional Test", type: StationType.MANUAL, isKeyQuality: true },
	];

	const operationByCode = new Map<string, { id: string; defaultType: StationType }>();
	for (const operation of operations) {
		const record = await prisma.operation.upsert({
			where: { code: operation.code },
			update: {
				name: operation.name,
				defaultType: operation.type,
				isKeyQuality: operation.isKeyQuality ?? false,
			},
			create: {
				code: operation.code,
				name: operation.name,
				defaultType: operation.type,
				isKeyQuality: operation.isKeyQuality ?? false,
			},
		});
		operationByCode.set(operation.code, { id: record.id, defaultType: record.defaultType });
	}

	// Routings
	const smtRouting = await prisma.routing.upsert({
		where: { code: "PCBA-STD-V1" },
		update: {
			name: "Standard PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
			processType: ProcessType.SMT,
		},
		create: {
			code: "PCBA-STD-V1",
			name: "Standard PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
			processType: ProcessType.SMT,
		},
	});

	const dipRouting = await prisma.routing.upsert({
		where: { code: "PCBA-DIP-V1" },
		update: {
			name: "DIP PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
			processType: ProcessType.DIP,
		},
		create: {
			code: "PCBA-DIP-V1",
			name: "DIP PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
			processType: ProcessType.DIP,
		},
	});

	type RoutingStepSeed = {
		stepNo: number;
		opCode: string;
		stationGroupId: string;
		requiresFAI?: boolean;
		isLast?: boolean;
	};

	const smtSteps: RoutingStepSeed[] = [
		{ stepNo: 1, opCode: "PRINTING", requiresFAI: true, stationGroupId: smtGroupA.id },
		{ stepNo: 2, opCode: "SPI", stationGroupId: smtGroupSpi.id },
		{ stepNo: 3, opCode: "MOUNTING", stationGroupId: smtGroupMount.id },
		{ stepNo: 4, opCode: "REFLOW", stationGroupId: smtGroupReflow.id },
		{ stepNo: 5, opCode: "AOI", stationGroupId: smtGroupAoi.id, isLast: true },
	];

	for (const step of smtSteps) {
		const operation = operationByCode.get(step.opCode);
		if (!operation) throw new Error(`Missing operation seed: ${step.opCode}`);

		await prisma.routingStep.upsert({
			where: { routingId_stepNo: { routingId: smtRouting.id, stepNo: step.stepNo } },
			update: {
				operationId: operation.id,
				stationGroupId: step.stationGroupId,
				stationType: operation.defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
			create: {
				routingId: smtRouting.id,
				stepNo: step.stepNo,
				operationId: operation.id,
				stationGroupId: step.stationGroupId,
				stationType: operation.defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
		});
	}

	const dipSteps: RoutingStepSeed[] = [
		{ stepNo: 1, opCode: "DIP_INSERT", requiresFAI: true, stationGroupId: dipGroupA.id },
		{ stepNo: 2, opCode: "WAVE_SOLDER", stationGroupId: dipGroupWave.id },
		{ stepNo: 3, opCode: "POST_SOLDER", stationGroupId: dipGroupPost.id },
		{ stepNo: 4, opCode: "FUNC_TEST", stationGroupId: dipGroupTest.id, isLast: true },
	];

	for (const step of dipSteps) {
		const operation = operationByCode.get(step.opCode);
		if (!operation) throw new Error(`Missing operation seed: ${step.opCode}`);

		await prisma.routingStep.upsert({
			where: { routingId_stepNo: { routingId: dipRouting.id, stepNo: step.stepNo } },
			update: {
				operationId: operation.id,
				stationGroupId: step.stationGroupId,
				stationType: operation.defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
			create: {
				routingId: dipRouting.id,
				stepNo: step.stepNo,
				operationId: operation.id,
				stationGroupId: step.stationGroupId,
				stationType: operation.defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
		});
	}

	// Loading verification config
	const slot01 = await prisma.feederSlot.upsert({
		where: { lineId_slotCode: { lineId: lineA.id, slotCode: "SLOT-01" } },
		update: { slotName: "Feeder Slot 01", position: 1 },
		create: {
			lineId: lineA.id,
			slotCode: "SLOT-01",
			slotName: "Feeder Slot 01",
			position: 1,
		},
	});

	await prisma.slotMaterialMapping.upsert({
		where: { slotId_materialCode: { slotId: slot01.id, materialCode: "MAT-001" } },
		update: {
			productCode: "P-1001",
			routingId: smtRouting.id,
			priority: 1,
			isAlternate: false,
		},
		create: {
			slotId: slot01.id,
			materialCode: "MAT-001",
			productCode: "P-1001",
			routingId: smtRouting.id,
			priority: 1,
			isAlternate: false,
		},
	});

	// Equipment (for readiness check)
	for (const station of stations) {
		await prisma.tpmEquipment.upsert({
			where: { equipmentCode: station.code },
			update: {
				name: `${station.name} Equipment`,
				status: "normal",
				workshopCode: station.lineId === dipLineA.id ? dipLineA.code : lineA.code,
				location: station.lineId === dipLineA.id ? dipLineA.name : lineA.name,
			},
			create: {
				equipmentCode: station.code,
				name: `${station.name} Equipment`,
				status: "normal",
				workshopCode: station.lineId === dipLineA.id ? dipLineA.code : lineA.code,
				location: station.lineId === dipLineA.id ? dipLineA.name : lineA.name,
			},
		});
	}
	console.log("  -> Equipment data ensured");

	// Materials + BOM (for readiness check)
	const materials = [
		{ code: "MAT-001", name: "Chip Resistor 10K", category: "SMD", unit: "PCS" },
		{ code: "MAT-002", name: "MLCC Capacitor 100nF", category: "SMD", unit: "PCS" },
		{ code: "MAT-003", name: "IC Chip MCU", category: "IC", unit: "PCS" },
	];
	for (const material of materials) {
		await prisma.material.upsert({
			where: { code: material.code },
			update: material,
			create: material,
		});
	}

	const bomItems = [
		{ parentCode: "P-1001", childCode: "MAT-001", qty: 10 },
		{ parentCode: "P-1001", childCode: "MAT-002", qty: 5 },
		{ parentCode: "P-1001", childCode: "MAT-003", qty: 1 },
	] as const;
	for (const item of bomItems) {
		await prisma.bomItem.upsert({
			where: { parentCode_childCode: { parentCode: item.parentCode, childCode: item.childCode } },
			update: { qty: item.qty, unit: "PCS" },
			create: { ...item, unit: "PCS" },
		});
	}
	console.log("  -> Material & BOM data ensured");

	// Stencil readiness
	const stencilId = "STENCIL-001";
	const stencilBoundAt = new Date("2024-01-01");
	await prisma.lineStencil.upsert({
		where: {
			lineId_stencilId_boundAt: {
				lineId: lineA.id,
				stencilId,
				boundAt: stencilBoundAt,
			},
		},
		update: { isCurrent: true },
		create: {
			lineId: lineA.id,
			stencilId,
			isCurrent: true,
			boundAt: stencilBoundAt,
			boundBy: "system",
		},
	});

	await prisma.stencilStatusRecord.upsert({
		where: { eventId: `stencil-ready-${stencilId}` },
		update: { status: StencilStatus.READY },
		create: {
			eventId: `stencil-ready-${stencilId}`,
			eventTime: new Date(),
			stencilId,
			status: StencilStatus.READY,
			tensionValue: 45.0,
			lastCleanedAt: new Date(),
			source: IntegrationSource.MANUAL,
		},
	});
	console.log("  -> Stencil data ensured");

	// Solder paste readiness
	const solderPasteLotId = "SP-LOT-001";
	const solderPasteBoundAt = new Date("2024-01-01");
	await prisma.lineSolderPaste.upsert({
		where: {
			lineId_lotId_boundAt: {
				lineId: lineA.id,
				lotId: solderPasteLotId,
				boundAt: solderPasteBoundAt,
			},
		},
		update: { isCurrent: true },
		create: {
			lineId: lineA.id,
			lotId: solderPasteLotId,
			isCurrent: true,
			boundAt: solderPasteBoundAt,
			boundBy: "system",
		},
	});

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30);
	await prisma.solderPasteStatusRecord.upsert({
		where: { eventId: `solder-paste-compliant-${solderPasteLotId}` },
		update: { status: SolderPasteStatus.COMPLIANT, expiresAt },
		create: {
			eventId: `solder-paste-compliant-${solderPasteLotId}`,
			eventTime: new Date(),
			lotId: solderPasteLotId,
			status: SolderPasteStatus.COMPLIANT,
			expiresAt,
			thawedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			stirredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
			source: IntegrationSource.MANUAL,
		},
	});
	console.log("  -> Solder paste data ensured");

	// Optional: ensure a default OQC sampling rule exists (avoid duplicates)
	const existingOqcRule = await prisma.oqcSamplingRule.findFirst({
		where: {
			productCode: "P-1001",
			lineId: dipLineA.id,
			routingId: dipRouting.id,
		},
	});
	if (!existingOqcRule) {
		await prisma.oqcSamplingRule.create({
			data: {
				productCode: "P-1001",
				lineId: dipLineA.id,
				routingId: dipRouting.id,
				samplingType: "FIXED",
				sampleValue: 1,
				priority: 10,
				isActive: true,
			},
		});
	}

	if (compileRoutes) {
		await ensureDefaultRouteVersions(prisma);
		console.log("  -> Executable route versions ensured");
	}

	console.log("MES master data seed complete.");
};
