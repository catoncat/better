/**
 * seed-dc-demo.ts - DataCollectionSpec 采集项演示数据
 *
 * 创建完整的采集项演示数据，包括：
 * 1. DataCollectionSpec - 采集项规格（回流焊温度、AOI 检测结果等）
 * 2. RouteExecutionConfig - 将采集项绑定到路由步骤
 * 3. 工单/批次/单元 - 可执行的生产流程
 *
 * 使用方法:
 *   bun apps/server/scripts/seed-dc-demo.ts
 *
 * 前置条件：
 *   - 已运行 bun run db:seed（创建基础数据）
 */
import { Prisma } from "@better-app/db";

type Db = typeof import("@better-app/db");

type SeedDcDemoOptions = {
	prisma?: Db["default"];
	now?: Date;
};

const resolvePrisma = async (prisma?: Db["default"]) => {
	if (prisma) return prisma;
	const db = (await import("@better-app/db")) as Db;
	return db.default;
};

export const runSeedDcDemo = async ({ prisma, now }: SeedDcDemoOptions = {}) => {
	const NOW = now ?? new Date();
	const HOUR = 60 * 60 * 1000;

	console.log("Creating DataCollectionSpec demo data...\n");

	const db = (await import("@better-app/db")) as Db;
	const prismaClient = await resolvePrisma(prisma);

	// 1. 查找必要的基础数据
	console.log("1. Loading base data...");

	const lineA = await prismaClient.line.findUnique({ where: { code: "LINE-A" } });
	if (!lineA) {
		throw new Error("Missing LINE-A. Run bun run db:seed first.");
	}

	const smtRouting = await prismaClient.routing.findUnique({ where: { code: "PCBA-STD-V1" } });
	if (!smtRouting) {
		throw new Error("Missing PCBA-STD-V1 routing. Run bun run db:seed first.");
	}

	// 获取工序
	const reflowOp = await prismaClient.operation.findUnique({ where: { code: "REFLOW" } });
	const aoiOp = await prismaClient.operation.findUnique({ where: { code: "AOI" } });
	const printingOp = await prismaClient.operation.findUnique({ where: { code: "PRINTING" } });
	const spiOp = await prismaClient.operation.findUnique({ where: { code: "SPI" } });

	if (!reflowOp || !aoiOp || !printingOp || !spiOp) {
		throw new Error("Missing operations. Run bun run db:seed first.");
	}

	const smtVersion = await prismaClient.executableRouteVersion.findFirst({
		where: { routingId: smtRouting.id, status: "READY" },
		orderBy: { versionNo: "desc" },
	});
	if (!smtVersion) {
		throw new Error("Missing route version. Run bun run db:seed first.");
	}

	const smtStations = await prismaClient.station.findMany({
		where: { lineId: lineA.id },
		orderBy: { code: "asc" },
	});

	const operatorUser = await prismaClient.user.findFirst({
		where: { email: "operator@example.com" },
	});
	const qualityUser = await prismaClient.user.findFirst({
		where: { email: "quality@example.com" },
	});

	console.log("  ✓ Base data loaded\n");

	// 2. 创建 DataCollectionSpec 采集项规格
	console.log("2. Creating DataCollectionSpec records...");

	// REFLOW 工序的采集项
	const reflowSpecs = [
		{
			operationId: reflowOp.id,
			name: "峰值温度",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "MANUAL",
			triggerType: "EACH_CARRIER",
			spec: { min: 240, max: 260, target: 250, lsl: 235, usl: 265, unit: "°C" },
			isRequired: true,
			isActive: true,
		},
		{
			operationId: reflowOp.id,
			name: "预热时间",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "AUTO",
			triggerType: "EVENT",
			spec: { min: 60, max: 120, target: 90, unit: "s" },
			isRequired: true,
			isActive: true,
		},
		{
			operationId: reflowOp.id,
			name: "传送带速度",
			itemType: "OBSERVATION",
			dataType: "NUMBER",
			method: "MANUAL",
			triggerType: "EACH_CARRIER",
			spec: { min: 0.8, max: 1.2, target: 1.0, unit: "m/min" },
			isRequired: false,
			isActive: true,
		},
		{
			operationId: reflowOp.id,
			name: "炉温曲线编号",
			itemType: "OBSERVATION",
			dataType: "TEXT",
			method: "MANUAL",
			triggerType: "EVENT",
			isRequired: false,
			isActive: true,
		},
	];

	// AOI 工序的采集项
	const aoiSpecs = [
		{
			operationId: aoiOp.id,
			name: "检测结果",
			itemType: "KEY",
			dataType: "BOOLEAN",
			method: "MANUAL",
			triggerType: "EACH_UNIT",
			isRequired: true,
			isActive: true,
		},
		{
			operationId: aoiOp.id,
			name: "缺陷数量",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "MANUAL",
			triggerType: "EACH_UNIT",
			spec: { min: 0, max: 5, target: 0 },
			isRequired: true,
			isActive: true,
		},
		{
			operationId: aoiOp.id,
			name: "检测备注",
			itemType: "OBSERVATION",
			dataType: "TEXT",
			method: "MANUAL",
			triggerType: "EACH_UNIT",
			isRequired: false,
			isActive: true,
		},
	];

	// SPI 工序的采集项
	const spiSpecs = [
		{
			operationId: spiOp.id,
			name: "锡膏高度",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "AUTO",
			triggerType: "EACH_CARRIER",
			spec: { min: 0.1, max: 0.2, target: 0.15, lsl: 0.08, usl: 0.22, unit: "mm" },
			isRequired: true,
			isActive: true,
		},
		{
			operationId: spiOp.id,
			name: "锡膏面积偏差",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "AUTO",
			triggerType: "EACH_CARRIER",
			spec: { min: -10, max: 10, target: 0, unit: "%" },
			isRequired: true,
			isActive: true,
		},
	];

	// PRINTING 工序的采集项
	const printingSpecs = [
		{
			operationId: printingOp.id,
			name: "刮刀压力",
			itemType: "KEY",
			dataType: "NUMBER",
			method: "MANUAL",
			triggerType: "EVENT",
			spec: { min: 4, max: 8, target: 6, unit: "kg" },
			isRequired: true,
			isActive: true,
		},
		{
			operationId: printingOp.id,
			name: "印刷速度",
			itemType: "OBSERVATION",
			dataType: "NUMBER",
			method: "MANUAL",
			triggerType: "EVENT",
			spec: { min: 20, max: 50, target: 35, unit: "mm/s" },
			isRequired: false,
			isActive: true,
		},
	];

	const allSpecs = [...reflowSpecs, ...aoiSpecs, ...spiSpecs, ...printingSpecs];
	const createdSpecIds: Record<string, string[]> = {};

	for (const spec of allSpecs) {
		const operation = await prismaClient.operation.findUnique({ where: { id: spec.operationId } });
		const opCode = operation?.code || "UNKNOWN";

		const created = await prismaClient.dataCollectionSpec.upsert({
			where: {
				operationId_name: {
					operationId: spec.operationId,
					name: spec.name,
				},
			},
			update: {
				itemType: spec.itemType,
				dataType: spec.dataType,
				method: spec.method,
				triggerType: spec.triggerType,
				spec: spec.spec ?? undefined,
				isRequired: spec.isRequired,
				isActive: spec.isActive,
			},
			create: spec,
		});

		if (!createdSpecIds[opCode]) {
			createdSpecIds[opCode] = [];
		}
		createdSpecIds[opCode].push(created.id);

		console.log(`  ✓ [${opCode}] ${spec.name} (${spec.itemType}, ${spec.dataType})`);
	}

	console.log(`\n  Total: ${allSpecs.length} specs created\n`);

	// 3. 创建 RouteExecutionConfig 将采集项绑定到路由步骤
	console.log("3. Creating RouteExecutionConfig bindings...");

	// 查找路由步骤
	const routingSteps = await prismaClient.routingStep.findMany({
		where: { routingId: smtRouting.id },
		include: { operation: true },
		orderBy: { stepNo: "asc" },
	});

	for (const step of routingSteps) {
		const opCode = step.operation.code;
		const specIds = createdSpecIds[opCode];

		if (specIds && specIds.length > 0) {
			await prismaClient.routeExecutionConfig.upsert({
				where: {
					id: `rec-${smtRouting.id}-${step.id}`,
				},
				update: {
					dataSpecIds: specIds,
				},
				create: {
					id: `rec-${smtRouting.id}-${step.id}`,
					routingId: smtRouting.id,
					routingStepId: step.id,
					operationId: step.operationId,
					dataSpecIds: specIds,
				},
			});
			console.log(`  ✓ Step ${step.stepNo} [${opCode}]: ${specIds.length} specs bound`);
		}
	}

	// 3b. 更新 Route Version 的 snapshotJson 以包含 dataSpecIds
	console.log("\n3b. Updating Route Version snapshotJson with dataSpecIds...");

	const existingSnapshot = smtVersion.snapshotJson as {
		steps?: Array<{
			stepNo: number;
			operationId: string;
			stationType: string;
			stationGroupId: string | null;
			allowedStationIds: string[];
			requiresFAI: boolean;
			requiresAuthorization: boolean;
			dataSpecIds?: string[];
			ingestMapping: unknown;
		}>;
		route?: unknown;
	};

	if (existingSnapshot?.steps) {
		for (const step of existingSnapshot.steps) {
			const routingStep = routingSteps.find((rs) => rs.stepNo === step.stepNo);
			if (routingStep) {
				const opCode = routingStep.operation.code;
				step.dataSpecIds = createdSpecIds[opCode] ?? [];
			}
		}

		await prismaClient.executableRouteVersion.update({
			where: { id: smtVersion.id },
			data: { snapshotJson: existingSnapshot as Prisma.InputJsonValue },
		});

		console.log("  ✓ Snapshot updated with dataSpecIds");
	}

	console.log("");

	// 4. 创建演示用的工单/批次/单元
	console.log("4. Creating demo Work Order / Run / Units...");

	const woData = {
		woNo: "WO-DC-DEMO-001",
		productCode: "P-1001",
		plannedQty: 5,
		pickStatus: "2",
		routingId: smtRouting.id,
		status: db.WorkOrderStatus.IN_PROGRESS,
		createdAt: new Date(NOW.getTime() - 2 * HOUR),
	};

	const wo = await prismaClient.workOrder.upsert({
		where: { woNo: woData.woNo },
		update: { status: woData.status },
		create: woData,
	});

	const runData = {
		runNo: "RUN-DC-DEMO-001",
		woId: wo.id,
		lineId: lineA.id,
		routeVersionId: smtVersion.id,
		status: db.RunStatus.AUTHORIZED,
		planQty: woData.plannedQty,
		shiftCode: "D1",
		changeoverNo: "DC-DEMO-001",
	};

	const demoRun = await prismaClient.run.upsert({
		where: { runNo: runData.runNo },
		update: { status: runData.status },
		create: runData,
	});

	// 创建 FAI 通过记录
	const existingFai = await prismaClient.inspection.findFirst({
		where: { runId: demoRun.id, type: db.InspectionType.FAI },
	});
	if (!existingFai) {
		await prismaClient.inspection.create({
			data: {
				runId: demoRun.id,
				type: db.InspectionType.FAI,
				status: db.InspectionStatus.PASS,
				sampleQty: 1,
				passedQty: 1,
				failedQty: 0,
				inspectorId: qualityUser?.id,
				startedAt: new Date(NOW.getTime() - 1 * HOUR),
				decidedAt: new Date(NOW.getTime() - 0.5 * HOUR),
				decidedBy: qualityUser?.id,
				remark: "首件检验通过，可开始批量生产",
			},
		});
	}

	console.log(`  ✓ Work Order: ${woData.woNo}`);
	console.log(`  ✓ Run: ${runData.runNo} (AUTHORIZED)`);
	console.log(`  ✓ FAI: PASS`);

	// 创建单元 - 不同进度状态
	const unitStates = [
		{
			sn: "SN-DC-DEMO-0001",
			status: db.UnitStatus.QUEUED,
			currentStepNo: 1,
			description: "待进站 (Step 1)",
		},
		{
			sn: "SN-DC-DEMO-0002",
			status: db.UnitStatus.IN_STATION,
			currentStepNo: 1,
			description: "正在 PRINTING",
		},
		{
			sn: "SN-DC-DEMO-0003",
			status: db.UnitStatus.IN_STATION,
			currentStepNo: 2,
			description: "正在 SPI",
		},
		{
			sn: "SN-DC-DEMO-0004",
			status: db.UnitStatus.IN_STATION,
			currentStepNo: 4,
			description: "正在 REFLOW",
		},
		{
			sn: "SN-DC-DEMO-0005",
			status: db.UnitStatus.IN_STATION,
			currentStepNo: 5,
			description: "正在 AOI (最后一站)",
		},
	];

	for (const unitData of unitStates) {
		const unit = await prismaClient.unit.upsert({
			where: { sn: unitData.sn },
			update: { status: unitData.status, currentStepNo: unitData.currentStepNo },
			create: {
				sn: unitData.sn,
				woId: wo.id,
				runId: demoRun.id,
				status: unitData.status,
				currentStepNo: unitData.currentStepNo,
			},
		});

		// 为已过站的单件创建 Track 记录（不含出站，模拟正在采集数据）
		if (unitData.status === db.UnitStatus.IN_STATION) {
			for (let stepNo = 1; stepNo <= unitData.currentStepNo; stepNo++) {
				const station = smtStations[stepNo - 1];
				if (!station) continue;

				const existingTrack = await prismaClient.track.findFirst({
					where: { unitId: unit.id, stepNo },
				});

				if (!existingTrack) {
					const isCurrentStep = stepNo === unitData.currentStepNo;
					const inAt = new Date(
						NOW.getTime() - (unitData.currentStepNo - stepNo + 1) * 20 * 60 * 1000,
					);

					await prismaClient.track.create({
						data: {
							unitId: unit.id,
							stepNo,
							stationId: station.id,
							source: db.TrackSource.MANUAL,
							inAt,
							// 当前站没有出站时间（正在采集数据）
							outAt: isCurrentStep ? null : new Date(inAt.getTime() + 15 * 60 * 1000),
							result: isCurrentStep ? null : db.TrackResult.PASS,
							operatorId: operatorUser?.id,
						},
					});
				}
			}
		}

		console.log(`  ✓ Unit: ${unitData.sn} - ${unitData.description}`);
	}

	// 5. 统计
	console.log("\n========== DC Demo Data Summary ==========");
	const specCount = await prismaClient.dataCollectionSpec.count({
		where: { isActive: true },
	});
	const configCount = await prismaClient.routeExecutionConfig.count({
		where: { dataSpecIds: { not: Prisma.JsonNull } },
	});
	const unitCount = await prismaClient.unit.count({
		where: { sn: { startsWith: "SN-DC-DEMO" } },
	});

	console.log(`  DataCollectionSpec: ${specCount} active specs`);
	console.log(`  RouteExecutionConfig: ${configCount} bindings`);
	console.log(`  Demo Units: ${unitCount}`);
	console.log("==========================================\n");

	console.log("Demo data created successfully!\n");

	console.log("===== 操作指南 =====\n");
	console.log("1. 访问采集项管理页面:");
	console.log("   http://localhost:3000/mes/data-collection-specs\n");

	console.log("2. 筛选查看:");
	console.log("   - 按工序筛选: REFLOW / AOI / SPI / PRINTING");
	console.log("   - 按状态筛选: 启用中 / 已停用\n");

	console.log("3. 编辑采集项:");
	console.log("   - 点击任意采集项的「编辑」按钮");
	console.log("   - 修改数值规格（min/max/target）");
	console.log("   - 切换「必填」或「启用」状态\n");

	console.log("4. 新建采集项:");
	console.log("   - 点击「新建采集项」按钮");
	console.log("   - 选择工序，输入名称");
	console.log("   - 配置类型、数据类型、采集方式等\n");

	console.log("5. 可追溯的演示单元:");
	unitStates.forEach((u) => {
		console.log(`   - ${u.sn}: ${u.description}`);
	});
	console.log("");
};
