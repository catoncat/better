import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

import prisma, {
	StationType,
} from "@better-app/db";

const seedMESMasterData = async () => {
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

	// 2. Create Station Group
	const smtGroupA = await prisma.stationGroup.upsert({
		where: { code: "SMT-LINE-A" },
		update: {},
		create: {
			code: "SMT-LINE-A",
			name: "SMT Line A Group",
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

	// 4. Create Operations
	const operations = [
		{ code: "PRINTING", name: "Solder Paste Printing", type: StationType.MANUAL },
		{ code: "SPI", name: "Solder Paste Inspection", type: StationType.MANUAL, isKeyQuality: true },
		{ code: "MOUNTING", name: "Component Mounting", type: StationType.MANUAL },
		{ code: "REFLOW", name: "Reflow Soldering", type: StationType.MANUAL },
		{ code: "AOI", name: "Automated Optical Inspection", type: StationType.MANUAL, isKeyQuality: true },
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

	console.log("MES Master Data Seeded Successfully.");
};

seedMESMasterData()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
