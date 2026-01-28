/**
 * seed-loading-config.ts - 增强 LINE-A 的上料配置
 *
 * 在 bun run db:seed 之后运行，为 LINE-A 添加完整的上料站位表和物料映射
 * 这样 LINE-A 既有多状态数据（seed-demo.ts），又有完整的上料演示配置
 *
 * 使用方法:
 *   bun apps/server/scripts/seed-loading-config.ts
 */
type Db = typeof import("@better-app/db");

type SeedLoadingOptions = {
	prisma?: Db["default"];
};

const resolvePrisma = async (prisma?: Db["default"]) => {
	if (prisma) return prisma;
	const db = (await import("@better-app/db")) as Db;
	return db.default;
};

// 上料站位定义
const slotDefs = [
	{ slotCode: "2F-46", slotName: "SMT2-F-46", position: 10 },
	{ slotCode: "2F-34", slotName: "SMT2-F-34", position: 20 },
	{ slotCode: "1R-14", slotName: "SMT1-R-14", position: 30 },
	{ slotCode: "1F-46", slotName: "SMT1-F-46", position: 40 },
];

// 物料定义
const materialDefs = [
	{ code: "5212090001", name: "Resistor 10K 0603", category: "SMD", unit: "PCS" },
	{ code: "5212090001B", name: "Resistor 10K 0603 (Alt)", category: "SMD", unit: "PCS" },
	{ code: "5212090007", name: "Capacitor 1uF 0603", category: "SMD", unit: "PCS" },
	{ code: "5212098001", name: "IC Driver QFN", category: "IC", unit: "PCS" },
	{ code: "5212098004", name: "Connector 6P", category: "CONN", unit: "PCS" },
];

// 物料批次
const materialLots = [
	{ materialCode: "5212090001", lotNo: "LOT-20250526-001" },
	{ materialCode: "5212090001B", lotNo: "LOT-20250526-002" },
	{ materialCode: "5212090007", lotNo: "LOT-20250526-003" },
	{ materialCode: "5212098001", lotNo: "LOT-20250526-004" },
	{ materialCode: "5212098004", lotNo: "LOT-20250526-005" },
];

// 站位-物料映射（含替代料）
const slotMappings = [
	{ slotCode: "2F-46", materialCode: "5212090001", priority: 1, isAlternate: false },
	{ slotCode: "2F-46", materialCode: "5212090001B", priority: 2, isAlternate: true },
	{ slotCode: "2F-34", materialCode: "5212090007", priority: 1, isAlternate: false },
	{ slotCode: "1R-14", materialCode: "5212098001", priority: 1, isAlternate: false },
	{ slotCode: "1F-46", materialCode: "5212098004", priority: 1, isAlternate: false },
];

export const runSeedLoadingConfig = async ({ prisma }: SeedLoadingOptions = {}) => {
	console.log("Enhancing LINE-A loading configuration...\n");

	const prismaClient = await resolvePrisma(prisma);

	// 1. 查找 LINE-A 和 SMT 路由
	const lineA = await prismaClient.line.findUnique({ where: { code: "LINE-A" } });
	if (!lineA) {
		throw new Error("LINE-A not found. Run 'bun run db:seed' first.");
	}

	const smtRouting = await prismaClient.routing.findUnique({ where: { code: "PCBA-STD-V1" } });
	if (!smtRouting) {
		throw new Error("PCBA-STD-V1 routing not found. Run 'bun run db:seed' first.");
	}

	console.log(`Found LINE-A: ${lineA.id}`);
	console.log(`Found routing: ${smtRouting.code}`);

	// 2. 创建上料站位
	console.log("\nCreating feeder slots...");
	const slotIdByCode = new Map<string, string>();

	for (const slot of slotDefs) {
		const created = await prismaClient.feederSlot.upsert({
			where: { lineId_slotCode: { lineId: lineA.id, slotCode: slot.slotCode } },
			update: { slotName: slot.slotName, position: slot.position },
			create: {
				lineId: lineA.id,
				slotCode: slot.slotCode,
				slotName: slot.slotName,
				position: slot.position,
			},
		});
		slotIdByCode.set(slot.slotCode, created.id);
		console.log(`  ✓ ${slot.slotCode} (${slot.slotName})`);
	}

	// 3. 创建物料
	console.log("\nCreating materials...");
	for (const material of materialDefs) {
		await prismaClient.material.upsert({
			where: { code: material.code },
			update: { name: material.name, category: material.category, unit: material.unit },
			create: material,
		});
		console.log(`  ✓ ${material.code} (${material.name})`);
	}

	// 4. 创建物料批次
	console.log("\nCreating material lots...");
	for (const lot of materialLots) {
		await prismaClient.materialLot.upsert({
			where: { materialCode_lotNo: { materialCode: lot.materialCode, lotNo: lot.lotNo } },
			update: {},
			create: { materialCode: lot.materialCode, lotNo: lot.lotNo },
		});
		console.log(`  ✓ ${lot.materialCode} | ${lot.lotNo}`);
	}

	// 5. 创建 BOM 关系（物料属于 P-1001 产品）
	console.log("\nCreating BOM items...");
	for (const material of materialDefs) {
		await prismaClient.bomItem.upsert({
			where: {
				parentCode_childCode: { parentCode: "P-1001", childCode: material.code },
			},
			update: { qty: 1 },
			create: { parentCode: "P-1001", childCode: material.code, qty: 1, unit: "PCS" },
		});
	}
	console.log(`  ✓ BOM items for P-1001`);

	// 6. 创建站位-物料映射
	console.log("\nCreating slot-material mappings...");
	for (const mapping of slotMappings) {
		const slotId = slotIdByCode.get(mapping.slotCode);
		if (!slotId) {
			throw new Error(`Slot ${mapping.slotCode} not found`);
		}

		await prismaClient.slotMaterialMapping.upsert({
			where: { slotId_materialCode: { slotId, materialCode: mapping.materialCode } },
			update: {
				productCode: "P-1001",
				routingId: smtRouting.id,
				priority: mapping.priority,
				isAlternate: mapping.isAlternate,
			},
			create: {
				slotId,
				materialCode: mapping.materialCode,
				productCode: "P-1001",
				routingId: smtRouting.id,
				priority: mapping.priority,
				isAlternate: mapping.isAlternate,
			},
		});

		const label = mapping.isAlternate ? "(替代料)" : "(主料)";
		console.log(`  ✓ ${mapping.slotCode} → ${mapping.materialCode} ${label}`);
	}

	// 7. 更新 LINE-A 的 readiness 配置，启用 LOADING 检查
	console.log("\nUpdating LINE-A readiness config...");
	const existingMeta = (lineA.meta as Record<string, unknown>) ?? {};
	const readinessChecks = (existingMeta.readinessChecks as Record<string, unknown>) ?? {};

	const updatedMeta = {
		...existingMeta,
		readinessChecks: {
			...readinessChecks,
			enabled: ["ROUTE", "LOADING", "EQUIPMENT", "MATERIAL", "STENCIL", "SOLDER_PASTE"],
			loadingRequired: true,
		},
	};

	await prismaClient.line.update({
		where: { id: lineA.id },
		data: { meta: updatedMeta },
	});
	console.log("  ✓ LINE-A readiness checks enabled");

	// 8. 统计
	console.log("\n========== Loading Config Summary ==========");
	const slotCount = await prismaClient.feederSlot.count({ where: { lineId: lineA.id } });
	const mappingCount = await prismaClient.slotMaterialMapping.count({
		where: { slot: { lineId: lineA.id } },
	});
	console.log(`  Feeder Slots: ${slotCount}`);
	console.log(`  Slot-Material Mappings: ${mappingCount}`);
	console.log("=============================================\n");

	console.log("LINE-A loading configuration complete!");
	console.log("\n上料演示条码:");
	console.log("  PASS:    5212090007|LOT-20250526-003 (站位 2F-34)");
	console.log("  WARNING: 5212090001B|LOT-20250526-002 (站位 2F-46，替代料)");
	console.log("  FAIL:    9999999999|LOT-FAIL-001 (任意站位)");
};
