import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

type Db = typeof import("@better-app/db");
type AuthModule = typeof import("@better-app/auth");
type RoutingServiceModule = typeof import("../src/modules/mes/routing/service");

const WECOM_CONFIG_KEY = "wecom_notifications";
const APP_BRANDING_KEY = "app.branding";

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";
const DEFAULT_TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "Test123!";

const routingCodes = ["PCBA-STD-V1", "PCBA-DIP-V1"] as const;

const resolveDbFilePath = (databaseUrl: string) => {
	if (!databaseUrl.startsWith("file:")) return null;
	const filePath = databaseUrl.slice("file:".length);
	if (!filePath) return null;
	if (filePath.startsWith("/")) return filePath;
	return path.resolve(process.cwd(), filePath);
};

const assertSafeToReset = () => {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) throw new Error("DATABASE_URL is required");

	const filePath = resolveDbFilePath(databaseUrl);
	if (!filePath) return;

	const repoRoot = path.resolve(import.meta.dirname, "../../..");
	const safeDir = path.resolve(repoRoot, "data") + path.sep;
	const normalized = path.resolve(filePath);
	if (!normalized.startsWith(safeDir) && process.env.SEED_ALLOW_UNSAFE_RESET !== "true") {
		throw new Error(
			`Refusing to reset DB outside ${safeDir} (DATABASE_URL=${databaseUrl}). Set SEED_ALLOW_UNSAFE_RESET=true to override.`,
		);
	}
};

const resetAllTables = async (prisma: Db["default"]) => {
	console.log("Resetting database tables (acceptance seed)...");
	await prisma.$executeRawUnsafe("PRAGMA foreign_keys=OFF;");

	const tables = (await prisma.$queryRawUnsafe<
		Array<{ name: string }>
	>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)) as Array<{
		name: string;
	}>;

	for (const { name } of tables) {
		if (name === "_prisma_migrations") continue;
		if (!/^[A-Za-z0-9_]+$/.test(name)) {
			throw new Error(`Unexpected table name from sqlite_master: ${name}`);
		}
		await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
	}

	await prisma.$executeRawUnsafe("PRAGMA foreign_keys=ON;");
	console.log("Database reset complete.");
};

const seedSystemConfig = async (prisma: Db["default"], adminId: string) => {
	await prisma.systemConfig.createMany({
		data: [
			{
				key: WECOM_CONFIG_KEY,
				name: "企业微信通知配置",
				value: { enabled: false, webhookUrl: "", mentionAll: false },
				updatedBy: adminId,
			},
			{
				key: APP_BRANDING_KEY,
				name: "应用品牌配置",
				value: { appName: "Better APP", shortName: "Better" },
				updatedBy: adminId,
			},
		],
	});
};

const seedRoles = async (prisma: Db["default"], db: Db) => {
	console.log("Seeding roles...");
	await prisma.role.createMany({
		data: db.PRESET_ROLES.map((role) => ({
			code: role.code,
			name: role.name,
			description: role.description,
			permissions: JSON.stringify(role.permissions),
			dataScope: role.dataScope,
			isSystem: role.isSystem,
		})),
	});
	console.log(`Seeded ${db.PRESET_ROLES.length} preset roles`);
};

const ensureAdminUser = async (prisma: Db["default"], auth: AuthModule["auth"], db: Db) => {
	process.env.AUTH_EMAIL_DEV_FALLBACK ||= "true";
	process.env.APP_URL ||= "http://localhost:3001";

	await auth.api.signUpEmail({
		body: {
			email: DEFAULT_ADMIN_EMAIL,
			password: DEFAULT_ADMIN_PASSWORD,
			name: DEFAULT_ADMIN_NAME,
		},
	});

	const created = await prisma.user.findUnique({
		where: { email: DEFAULT_ADMIN_EMAIL },
	});

	if (!created) {
		throw new Error("Failed to create admin user");
	}

	const username = created.username || DEFAULT_ADMIN_EMAIL.split("@")[0] || "admin";

	await prisma.user.update({
		where: { id: created.id },
		data: {
			name: DEFAULT_ADMIN_NAME,
			username,
			role: db.UserRole.admin,
			isActive: true,
			emailVerified: true,
			enableWecomNotification: true,
		},
	});

	return created.id;
};

const seedTestUsers = async (prisma: Db["default"], auth: AuthModule["auth"]) => {
	console.log("Seeding test users...");

	const testUsers = [
		{
			email: "planner@example.com",
			name: "张计划",
			username: "planner",
			department: "生产计划部",
			roleCode: "planner",
		},
		{
			email: "engineer@example.com",
			name: "李工艺",
			username: "engineer",
			department: "工艺工程部",
			roleCode: "engineer",
		},
		{
			email: "quality@example.com",
			name: "王质量",
			username: "quality",
			department: "质量部",
			roleCode: "quality",
		},
		{
			email: "leader@example.com",
			name: "赵组长",
			username: "leader",
			department: "生产部",
			roleCode: "leader",
		},
		{
			email: "operator@example.com",
			name: "钱操作",
			username: "operator",
			department: "生产部",
			roleCode: "operator",
		},
	];

	const lineA = await prisma.line.findUnique({ where: { code: "LINE-A" } });
	const dipLineA = await prisma.line.findUnique({ where: { code: "LINE-DIP-A" } });
	if (!lineA || !dipLineA) {
		throw new Error("Missing seeded lines (LINE-A / LINE-DIP-A)");
	}

	const lineAStations = await prisma.station.findMany({
		where: { lineId: lineA.id },
		orderBy: [{ code: "asc" }],
		take: 2,
	});
	const dipStations = await prisma.station.findMany({
		where: { lineId: dipLineA.id },
		orderBy: [{ code: "asc" }],
		take: 2,
	});

	for (const testUser of testUsers) {
		await auth.api.signUpEmail({
			body: {
				email: testUser.email,
				password: DEFAULT_TEST_PASSWORD,
				name: testUser.name,
			},
		});

		const user = await prisma.user.findUnique({ where: { email: testUser.email } });
		if (!user) {
			throw new Error(`Failed to create user ${testUser.email}`);
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				username: testUser.username,
				department: testUser.department,
				isActive: true,
				emailVerified: true,
			},
		});

		const role = await prisma.role.findUnique({
			where: { code: testUser.roleCode },
		});
		if (!role) {
			throw new Error(`Missing seeded role: ${testUser.roleCode}`);
		}

		await prisma.userRoleAssignment.create({
			data: {
				userId: user.id,
				roleId: role.id,
			},
		});

		if (testUser.roleCode === "leader") {
			await prisma.userLineBinding.createMany({
				data: [
					{ userId: user.id, lineId: lineA.id },
					{ userId: user.id, lineId: dipLineA.id },
				],
			});
		}

		if (testUser.roleCode === "operator") {
			await prisma.userStationBinding.createMany({
				data: [...lineAStations, ...dipStations].map((station) => ({
					userId: user.id,
					stationId: station.id,
				})),
			});
		}

		console.log(`Created user: ${testUser.email} (${testUser.roleCode})`);
	}

	console.log("Test users seeded");
};

const seedMesMasterData = async (prisma: Db["default"], db: Db) => {
	console.log("Seeding MES master data (SMT + DIP)...");

	const lineA = await prisma.line.create({
		data: {
			code: "LINE-A",
			name: "SMT Production Line A",
			meta: {
				readinessChecks: {
					enabled: ["ROUTE", "LOADING", "EQUIPMENT", "MATERIAL", "STENCIL", "SOLDER_PASTE"],
				},
			},
		},
	});

	const dipLineA = await prisma.line.create({
		data: {
			code: "LINE-DIP-A",
			name: "DIP Production Line A",
			meta: { readinessChecks: { enabled: ["ROUTE", "EQUIPMENT", "MATERIAL"] } },
		},
	});

	const smtGroupA = await prisma.stationGroup.create({
		data: { code: "SMT-LINE-A", name: "SMT Line A Group" },
	});
	const dipGroupA = await prisma.stationGroup.create({
		data: { code: "DIP-LINE-A", name: "DIP Line A Group" },
	});

	const smtStations = [
		{ code: "ST-PRINT-01", name: "Stencil Printer 01", type: db.StationType.MANUAL },
		{ code: "ST-SPI-01", name: "SPI 01", type: db.StationType.MANUAL },
		{ code: "ST-MOUNT-01", name: "Pick & Place 01", type: db.StationType.MANUAL },
		{ code: "ST-REFLOW-01", name: "Reflow Oven 01", type: db.StationType.MANUAL },
		{ code: "ST-AOI-01", name: "AOI 01", type: db.StationType.MANUAL },
	];

	for (const station of smtStations) {
		await prisma.station.create({
			data: {
				code: station.code,
				name: station.name,
				stationType: station.type,
				lineId: lineA.id,
				groupId: smtGroupA.id,
			},
		});
	}

	const dipStations = [
		{ code: "ST-DIP-INS-01", name: "DIP Insertion 01", type: db.StationType.MANUAL },
		{ code: "ST-DIP-WAVE-01", name: "Wave Solder 01", type: db.StationType.MANUAL },
		{ code: "ST-DIP-POST-01", name: "Post Solder 01", type: db.StationType.MANUAL },
		{ code: "ST-DIP-TEST-01", name: "Functional Test 01", type: db.StationType.MANUAL },
	];

	for (const station of dipStations) {
		await prisma.station.create({
			data: {
				code: station.code,
				name: station.name,
				stationType: station.type,
				lineId: dipLineA.id,
				groupId: dipGroupA.id,
			},
		});
	}

	const operations = [
		{ code: "PRINTING", name: "Solder Paste Printing", type: db.StationType.MANUAL },
		{ code: "SPI", name: "Solder Paste Inspection", type: db.StationType.MANUAL, isKeyQuality: true },
		{ code: "MOUNTING", name: "Component Mounting", type: db.StationType.MANUAL },
		{ code: "REFLOW", name: "Reflow Soldering", type: db.StationType.MANUAL },
		{ code: "AOI", name: "Automated Optical Inspection", type: db.StationType.MANUAL, isKeyQuality: true },
		{ code: "DIP_INSERT", name: "DIP Insertion", type: db.StationType.MANUAL },
		{ code: "WAVE_SOLDER", name: "Wave Solder", type: db.StationType.MANUAL },
		{ code: "POST_SOLDER", name: "Post Solder", type: db.StationType.MANUAL },
		{ code: "FUNC_TEST", name: "Functional Test", type: db.StationType.MANUAL, isKeyQuality: true },
	];

	const opRecords: Record<string, { id: string; defaultType: Db["StationType"] }> = {};
	for (const operation of operations) {
		const created = await prisma.operation.create({
			data: {
				code: operation.code,
				name: operation.name,
				defaultType: operation.type,
				isKeyQuality: operation.isKeyQuality ?? false,
			},
		});
		opRecords[operation.code] = { id: created.id, defaultType: created.defaultType };
	}

	const smtRouting = await prisma.routing.create({
		data: {
			code: "PCBA-STD-V1",
			name: "Standard PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
		},
	});

	const smtSteps = [
		{ stepNo: 1, opCode: "PRINTING", requiresFAI: true },
		{ stepNo: 2, opCode: "SPI" },
		{ stepNo: 3, opCode: "MOUNTING" },
		{ stepNo: 4, opCode: "REFLOW" },
		{ stepNo: 5, opCode: "AOI", isLast: true },
	];

	for (const step of smtSteps) {
		await prisma.routingStep.create({
			data: {
				routingId: smtRouting.id,
				stepNo: step.stepNo,
				operationId: opRecords[step.opCode].id,
				stationGroupId: smtGroupA.id,
				stationType: opRecords[step.opCode].defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
		});
	}

	const dipRouting = await prisma.routing.create({
		data: {
			code: "PCBA-DIP-V1",
			name: "DIP PCBA Process V1",
			version: "1.0",
			sourceSystem: "MES",
		},
	});

	const dipSteps = [
		{ stepNo: 1, opCode: "DIP_INSERT", requiresFAI: true },
		{ stepNo: 2, opCode: "WAVE_SOLDER" },
		{ stepNo: 3, opCode: "POST_SOLDER" },
		{ stepNo: 4, opCode: "FUNC_TEST", isLast: true },
	];

	for (const step of dipSteps) {
		await prisma.routingStep.create({
			data: {
				routingId: dipRouting.id,
				stepNo: step.stepNo,
				operationId: opRecords[step.opCode].id,
				stationGroupId: dipGroupA.id,
				stationType: opRecords[step.opCode].defaultType,
				requiresFAI: step.requiresFAI ?? false,
				isLast: step.isLast ?? false,
			},
		});
	}

	const slot01 = await prisma.feederSlot.create({
		data: {
			lineId: lineA.id,
			slotCode: "SLOT-01",
			slotName: "Feeder Slot 01",
			position: 1,
		},
	});

	await prisma.slotMaterialMapping.create({
		data: {
			slotId: slot01.id,
			materialCode: "MAT-001",
			productCode: "P-1001",
			routingId: smtRouting.id,
			priority: 1,
			isAlternate: false,
		},
	});

	const equipmentSeeds = [
		...smtStations.map((station) => ({
			equipmentCode: station.code,
			name: `${station.name} Equipment`,
			workshopCode: lineA.code,
			location: lineA.name,
		})),
		...dipStations.map((station) => ({
			equipmentCode: station.code,
			name: `${station.name} Equipment`,
			workshopCode: dipLineA.code,
			location: dipLineA.name,
		})),
	];

	for (const equipment of equipmentSeeds) {
		await prisma.tpmEquipment.create({
			data: {
				equipmentCode: equipment.equipmentCode,
				name: equipment.name,
				status: "normal",
				workshopCode: equipment.workshopCode,
				location: equipment.location,
			},
		});
	}
	console.log("  -> Equipment data seeded");

	// Seed Material and BomItem data for MATERIAL readiness check
	const materials = [
		{ code: "MAT-001", name: "Chip Resistor 10K", category: "SMD", unit: "PCS" },
		{ code: "MAT-002", name: "MLCC Capacitor 100nF", category: "SMD", unit: "PCS" },
		{ code: "MAT-003", name: "IC Chip MCU", category: "IC", unit: "PCS" },
	];
	for (const mat of materials) {
		await prisma.material.create({ data: mat });
	}

	// BOM: P-1001 requires MAT-001, MAT-002, MAT-003
	const bomItems = [
		{ parentCode: "P-1001", childCode: "MAT-001", qty: 10 },
		{ parentCode: "P-1001", childCode: "MAT-002", qty: 5 },
		{ parentCode: "P-1001", childCode: "MAT-003", qty: 1 },
	];
	for (const bom of bomItems) {
		await prisma.bomItem.create({ data: { ...bom, unit: "PCS" } });
	}
	console.log("  -> Material & BOM data seeded");

	// Seed Stencil data for STENCIL readiness check
	const stencilId = "STENCIL-001";
	await prisma.lineStencil.create({
		data: {
			lineId: lineA.id,
			stencilId,
			isCurrent: true,
			boundAt: new Date("2024-01-01"),
			boundBy: "system",
		},
	});
	await prisma.stencilStatusRecord.create({
		data: {
			eventId: `stencil-ready-${stencilId}`,
			eventTime: new Date(),
			stencilId,
			status: db.StencilStatus.READY,
			tensionValue: 45.0,
			lastCleanedAt: new Date(),
			source: db.IntegrationSource.MANUAL,
		},
	});
	console.log("  -> Stencil data seeded");

	// Seed Solder Paste data for SOLDER_PASTE readiness check
	const solderPasteLotId = "SP-LOT-001";
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30);
	await prisma.lineSolderPaste.create({
		data: {
			lineId: lineA.id,
			lotId: solderPasteLotId,
			isCurrent: true,
			boundAt: new Date("2024-01-01"),
			boundBy: "system",
		},
	});
	await prisma.solderPasteStatusRecord.create({
		data: {
			eventId: `solder-paste-compliant-${solderPasteLotId}`,
			eventTime: new Date(),
			lotId: solderPasteLotId,
			status: db.SolderPasteStatus.COMPLIANT,
			expiresAt,
			thawedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			stirredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
			source: db.IntegrationSource.MANUAL,
		},
	});
	console.log("  -> Solder Paste data seeded");

	await prisma.oqcSamplingRule.create({
		data: {
			productCode: "P-1001",
			lineId: dipLineA.id,
			routingId: dipRouting.id,
			samplingType: db.OqcSamplingType.FIXED,
			sampleValue: 1,
			priority: 10,
			isActive: true,
		},
	});

	console.log("MES master data seeded.");
	return { lineA, dipLineA, smtRouting, dipRouting };
};

const ensureDefaultRouteVersions = async (
	prisma: Db["default"],
	routingService: RoutingServiceModule,
) => {
	for (const routingCode of routingCodes) {
		const result = await routingService.compileRouteExecution(prisma, routingCode);
		if (!result.success) {
			throw new Error(`Failed to compile route ${routingCode}: ${result.code} ${result.message}`);
		}
		if (result.data.status !== "READY") {
			const errors = Array.isArray(result.data.errorsJson)
				? JSON.stringify(result.data.errorsJson)
				: "Unknown compile errors";
			throw new Error(`Route ${routingCode} is not READY: ${errors}`);
		}
	}
};

const seedDemoBusinessData = async (
	prisma: Db["default"],
	db: Db,
	ids: Awaited<ReturnType<typeof seedMesMasterData>>,
) => {
	console.log("Seeding demo WO/Run/Units...");

	const demoWOs = [
		{
			woNo: "WO-DEMO-SMT-001",
			productCode: "P-1001",
			plannedQty: 10,
			pickStatus: "2",
			routingId: ids.smtRouting.id,
			status: "RECEIVED",
		},
		{
			woNo: "WO-DEMO-DIP-001",
			productCode: "P-1001",
			plannedQty: 10,
			pickStatus: "2",
			routingId: ids.dipRouting.id,
			status: "RECEIVED",
		},
	];

	for (const wo of demoWOs) {
		await prisma.workOrder.create({
			data: {
				woNo: wo.woNo,
				productCode: wo.productCode,
				plannedQty: wo.plannedQty,
				pickStatus: wo.pickStatus,
				routingId: wo.routingId,
				status: db.WorkOrderStatus.RECEIVED,
			},
		});
	}

	const [stdVersion, dipVersion] = await Promise.all([
		prisma.executableRouteVersion.findFirst({
			where: { routingId: ids.smtRouting.id, status: "READY" },
			orderBy: { versionNo: "desc" },
		}),
		prisma.executableRouteVersion.findFirst({
			where: { routingId: ids.dipRouting.id, status: "READY" },
			orderBy: { versionNo: "desc" },
		}),
	]);

	if (!stdVersion || !dipVersion) {
		throw new Error("Missing READY executable route versions for demo data");
	}

	const woSmtRun = await prisma.workOrder.create({
		data: {
			woNo: "WO-DEMO-SMT-RUN-001",
			productCode: "P-1001",
			plannedQty: 3,
			pickStatus: "2",
			routingId: ids.smtRouting.id,
			status: db.WorkOrderStatus.IN_PROGRESS,
		},
	});

	const runSmt = await prisma.run.create({
		data: {
			runNo: "RUN-DEMO-SMT-001",
			woId: woSmtRun.id,
			lineId: ids.lineA.id,
			routeVersionId: stdVersion.id,
			status: db.RunStatus.PREP,
			planQty: 3,
			shiftCode: "D1",
			changeoverNo: "DEMO-SMT-001",
		},
	});

	await prisma.unit.createMany({
		data: ["SN-DEMO-SMT-0001", "SN-DEMO-SMT-0002", "SN-DEMO-SMT-0003"].map((sn) => ({
			sn,
			woId: woSmtRun.id,
			runId: runSmt.id,
			status: db.UnitStatus.QUEUED,
			currentStepNo: 1,
		})),
	});

	const woDipRun = await prisma.workOrder.create({
		data: {
			woNo: "WO-DEMO-DIP-RUN-001",
			productCode: "P-1001",
			plannedQty: 2,
			pickStatus: "2",
			routingId: ids.dipRouting.id,
			status: db.WorkOrderStatus.IN_PROGRESS,
		},
	});

	const runDip = await prisma.run.create({
		data: {
			runNo: "RUN-DEMO-DIP-001",
			woId: woDipRun.id,
			lineId: ids.dipLineA.id,
			routeVersionId: dipVersion.id,
			status: db.RunStatus.PREP,
			planQty: 2,
			shiftCode: "D1",
			changeoverNo: "DEMO-DIP-001",
		},
	});

	await prisma.unit.createMany({
		data: ["SN-DEMO-DIP-0001", "SN-DEMO-DIP-0002"].map((sn) => ({
			sn,
			woId: woDipRun.id,
			runId: runDip.id,
			status: db.UnitStatus.QUEUED,
			currentStepNo: 1,
		})),
	});

	console.log("Demo business data seeded.");
};

const run = async () => {
	assertSafeToReset();

	const db = (await import("@better-app/db")) as Db;
	const authModule = (await import("@better-app/auth")) as AuthModule;
	const routingService = (await import("../src/modules/mes/routing/service")) as RoutingServiceModule;

	const prisma = db.default;

	await resetAllTables(prisma);
	await seedRoles(prisma, db);
	const ids = await seedMesMasterData(prisma, db);

	const adminId = await ensureAdminUser(prisma, authModule.auth, db);
	await seedSystemConfig(prisma, adminId);

	await seedTestUsers(prisma, authModule.auth);
	const adminRole = await prisma.role.findUnique({ where: { code: "admin" } });
	if (!adminRole) throw new Error("Missing seeded role: admin");
	await prisma.userRoleAssignment.create({ data: { userId: adminId, roleId: adminRole.id } });

	await ensureDefaultRouteVersions(prisma, routingService);
	await seedDemoBusinessData(prisma, db, ids);
};

await run()
	.then(async () => {
		const { default: prisma } = (await import("@better-app/db")) as Db;
		console.log("Seed completed");
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		const { default: prisma } = (await import("@better-app/db")) as Db;
		console.error("Seed failed", error);
		await prisma.$disconnect();
		process.exitCode = 1;
	});
