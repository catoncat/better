import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

import prisma, {
	StationType,
	StencilStatus,
	SolderPasteStatus,
	IntegrationSource,
} from "@better-app/db";

export const seedMESMasterData = async () => {
	console.log("Seeding MES Master Data...");

	// 1. Create Line
	const lineA = await prisma.line.upsert({
		where: { code: "LINE-A" },
		update: {},
		create: {
			code: "LINE-A",
			name: "SMT Production Line A",
		},
	});

	const isRecord = (value: unknown): value is Record<string, unknown> =>
		Boolean(value) && typeof value === "object" && !Array.isArray(value);

	const ensureLineReadinessEnabled = async (lineId: string, enabledReadiness: string[]) => {
		const existingMeta = await prisma.line.findUnique({
			where: { id: lineId },
			select: { meta: true },
		});

		const baseMeta = isRecord(existingMeta?.meta) ? existingMeta?.meta : {};
		const readinessChecks = isRecord(baseMeta.readinessChecks) ? baseMeta.readinessChecks : {};
		const existingEnabled =
			Array.isArray(readinessChecks.enabled) && readinessChecks.enabled.every((v) => typeof v === "string")
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
				data: { meta: nextMeta },
			});
		}
	};

	// 1.1 Create DIP line (minimal go-live seed baseline)
	const dipLineA = await prisma.line.upsert({
		where: { code: "LINE-DIP-A" },
		update: {},
		create: {
			code: "LINE-DIP-A",
			name: "DIP Production Line A",
		},
	});

	// 1.2 Seed go-live defaults for Readiness checks
	// For full SMT E2E acceptance, enable all six checks
	await ensureLineReadinessEnabled(lineA.id, [
		"ROUTE",
		"LOADING",
		"EQUIPMENT",
		"MATERIAL",
		"STENCIL",
		"SOLDER_PASTE",
	]);
	await ensureLineReadinessEnabled(dipLineA.id, ["ROUTE"]);

	// 2. Create Station Group
	const smtGroupA = await prisma.stationGroup.upsert({
		where: { code: "SMT-LINE-A" },
		update: {},
		create: {
			code: "SMT-LINE-A",
			name: "SMT Line A Group",
		},
	});

	const dipGroupA = await prisma.stationGroup.upsert({
		where: { code: "DIP-LINE-A" },
		update: {},
		create: {
			code: "DIP-LINE-A",
			name: "DIP Line A Group",
		},
	});

	// 3. Create Stations
	const stations = [
		{ code: "ST-PRINT-01", name: "Stencil Printer 01", type: StationType.MANUAL },
		{ code: "ST-SPI-01", name: "SPI 01", type: StationType.MANUAL },
		{ code: "ST-MOUNT-01", name: "Pick & Place 01", type: StationType.MANUAL },
		{ code: "ST-REFLOW-01", name: "Reflow Oven 01", type: StationType.MANUAL },
		{ code: "ST-AOI-01", name: "AOI 01", type: StationType.MANUAL },
	];

	for (const s of stations) {
		await prisma.station.upsert({
			where: { code: s.code },
			update: { lineId: lineA.id, groupId: smtGroupA.id },
			create: {
				code: s.code,
				name: s.name,
				stationType: s.type,
				lineId: lineA.id,
				groupId: smtGroupA.id,
			},
		});
	}

	const dipStations = [
		{ code: "ST-DIP-INS-01", name: "DIP Insertion 01", type: StationType.MANUAL },
		{ code: "ST-DIP-WAVE-01", name: "Wave Solder 01", type: StationType.MANUAL },
		{ code: "ST-DIP-POST-01", name: "Post Solder 01", type: StationType.MANUAL },
		{ code: "ST-DIP-TEST-01", name: "Functional Test 01", type: StationType.MANUAL },
	];

	for (const s of dipStations) {
		await prisma.station.upsert({
			where: { code: s.code },
			update: { lineId: dipLineA.id, groupId: dipGroupA.id },
			create: {
				code: s.code,
				name: s.name,
				stationType: s.type,
				lineId: dipLineA.id,
				groupId: dipGroupA.id,
			},
		});
	}

	// 4. Create Operations
	const operations = [
		{ code: "PRINTING", name: "Solder Paste Printing", type: StationType.MANUAL },
		{ code: "SPI", name: "Solder Paste Inspection", type: StationType.MANUAL, isKeyQuality: true },
		{ code: "MOUNTING", name: "Component Mounting", type: StationType.MANUAL },
		{ code: "REFLOW", name: "Reflow Soldering", type: StationType.MANUAL },
		{ code: "AOI", name: "Automated Optical Inspection", type: StationType.MANUAL, isKeyQuality: true },
		{ code: "DIP_INSERT", name: "DIP Insertion", type: StationType.MANUAL },
		{ code: "WAVE_SOLDER", name: "Wave Solder", type: StationType.MANUAL },
		{ code: "POST_SOLDER", name: "Post Solder", type: StationType.MANUAL },
		{ code: "FUNC_TEST", name: "Functional Test", type: StationType.MANUAL, isKeyQuality: true },
	];

	const opRecords: Record<string, any> = {};
	for (const op of operations) {
		opRecords[op.code] = await prisma.operation.upsert({
			where: { code: op.code },
			update: {},
			create: {
				code: op.code,
				name: op.name,
				defaultType: op.type,
				isKeyQuality: op.isKeyQuality || false,
			},
		});
	}

	// 5. Create Routing
	const routing = await prisma.routing.upsert({
		where: { code: "PCBA-STD-V1" },
		update: {},
		create: {
			code: "PCBA-STD-V1",
			name: "Standard PCBA Process V1",
			version: "1.0",
		},
	});

	// 6. Create Routing Steps
	const steps = [
		{ stepNo: 1, opCode: "PRINTING", requiresFAI: true },
		{ stepNo: 2, opCode: "SPI" },
		{ stepNo: 3, opCode: "MOUNTING" },
		{ stepNo: 4, opCode: "REFLOW" },
		{ stepNo: 5, opCode: "AOI", isLast: true },
	];

	for (const step of steps) {
		await prisma.routingStep.upsert({
			where: {
				routingId_stepNo: {
					routingId: routing.id,
					stepNo: step.stepNo,
				},
			},
			update: {},
			create: {
				routingId: routing.id,
				stepNo: step.stepNo,
				operationId: opRecords[step.opCode].id,
				stationGroupId: smtGroupA.id,
				stationType: opRecords[step.opCode].defaultType,
				requiresFAI: step.requiresFAI || false,
				isLast: step.isLast || false,
			},
		});
	}

	// 6.1 Create DIP Routing
	const dipRouting = await prisma.routing.upsert({
		where: { code: "PCBA-DIP-V1" },
		update: {},
		create: {
			code: "PCBA-DIP-V1",
			name: "DIP PCBA Process V1",
			version: "1.0",
		},
	});

	const dipSteps = [
		{ stepNo: 1, opCode: "DIP_INSERT", requiresFAI: true },
		{ stepNo: 2, opCode: "WAVE_SOLDER" },
		{ stepNo: 3, opCode: "POST_SOLDER" },
		{ stepNo: 4, opCode: "FUNC_TEST", isLast: true },
	];

	for (const step of dipSteps) {
		await prisma.routingStep.upsert({
			where: {
				routingId_stepNo: {
					routingId: dipRouting.id,
					stepNo: step.stepNo,
				},
			},
			update: {},
			create: {
				routingId: dipRouting.id,
				stepNo: step.stepNo,
				operationId: opRecords[step.opCode].id,
				stationGroupId: dipGroupA.id,
				stationType: opRecords[step.opCode].defaultType,
				requiresFAI: step.requiresFAI || false,
				isLast: step.isLast || false,
			},
		});
	}

	// 7. Seed Loading Verification config (FeederSlot + SlotMaterialMapping)
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
			routingId: routing.id,
			priority: 1,
			isAlternate: false,
		},
		create: {
			slotId: slot01.id,
			materialCode: "MAT-001",
			productCode: "P-1001",
			routingId: routing.id,
			priority: 1,
			isAlternate: false,
		},
	});

	// 8. Seed Equipment data for EQUIPMENT readiness check
	const equipmentCodes = ["PRINTER-001", "SPI-001", "MOUNTER-001", "REFLOW-001", "AOI-001"];
	for (const code of equipmentCodes) {
		await prisma.tpmEquipment.upsert({
			where: { equipmentCode: code },
			update: { status: "normal" },
			create: {
				equipmentCode: code,
				name: `${code} Equipment`,
				status: "normal",
				workshopCode: "LINE-A",
				location: "SMT Area",
			},
		});
	}
	console.log("  -> Equipment data seeded");

	// 9. Seed Material and BomItem data for MATERIAL readiness check
	const materials = [
		{ code: "MAT-001", name: "Chip Resistor 10K", category: "SMD", unit: "PCS" },
		{ code: "MAT-002", name: "MLCC Capacitor 100nF", category: "SMD", unit: "PCS" },
		{ code: "MAT-003", name: "IC Chip MCU", category: "IC", unit: "PCS" },
	];
	for (const mat of materials) {
		await prisma.material.upsert({
			where: { code: mat.code },
			update: {},
			create: mat,
		});
	}

	// BOM: P-1001 requires MAT-001, MAT-002, MAT-003
	const bomItems = [
		{ parentCode: "P-1001", childCode: "MAT-001", qty: 10 },
		{ parentCode: "P-1001", childCode: "MAT-002", qty: 5 },
		{ parentCode: "P-1001", childCode: "MAT-003", qty: 1 },
	];
	for (const bom of bomItems) {
		await prisma.bomItem.upsert({
			where: { parentCode_childCode: { parentCode: bom.parentCode, childCode: bom.childCode } },
			update: {},
			create: { ...bom, unit: "PCS" },
		});
	}
	console.log("  -> Material & BOM data seeded");

	// 10. Seed Stencil data for STENCIL readiness check
	const stencilId = "STENCIL-001";
	await prisma.lineStencil.upsert({
		where: { lineId_stencilId_boundAt: { lineId: lineA.id, stencilId, boundAt: new Date("2024-01-01") } },
		update: { isCurrent: true },
		create: {
			lineId: lineA.id,
			stencilId,
			isCurrent: true,
			boundAt: new Date("2024-01-01"),
			boundBy: "system",
		},
	});
	// StencilStatusRecord: READY status
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
	console.log("  -> Stencil data seeded");

	// 11. Seed Solder Paste data for SOLDER_PASTE readiness check
	const solderPasteLotId = "SP-LOT-001";
	await prisma.lineSolderPaste.upsert({
		where: { lineId_lotId_boundAt: { lineId: lineA.id, lotId: solderPasteLotId, boundAt: new Date("2024-01-01") } },
		update: { isCurrent: true },
		create: {
			lineId: lineA.id,
			lotId: solderPasteLotId,
			isCurrent: true,
			boundAt: new Date("2024-01-01"),
			boundBy: "system",
		},
	});
	// SolderPasteStatusRecord: COMPLIANT status with valid expiry
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30); // expires in 30 days
	await prisma.solderPasteStatusRecord.upsert({
		where: { eventId: `solder-paste-compliant-${solderPasteLotId}` },
		update: { status: SolderPasteStatus.COMPLIANT, expiresAt },
		create: {
			eventId: `solder-paste-compliant-${solderPasteLotId}`,
			eventTime: new Date(),
			lotId: solderPasteLotId,
			status: SolderPasteStatus.COMPLIANT,
			expiresAt,
			thawedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // thawed 2 hours ago
			stirredAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // stirred 1 hour ago
			source: IntegrationSource.MANUAL,
		},
	});
	console.log("  -> Solder Paste data seeded");

	console.log("MES Master Data Seeded Successfully.");
};

if (import.meta.main) {
	seedMESMasterData()
		.then(async () => {
			await prisma.$disconnect();
		})
		.catch(async (e) => {
			console.error(e);
			await prisma.$disconnect();
			process.exit(1);
		});
}
