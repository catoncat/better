import path from "node:path";
import fs from "node:fs";

// Load env manually before importing db
const envPath = path.resolve(import.meta.dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
	if (line.startsWith("#") || !line.includes("=")) continue;
	const [key, ...valueParts] = line.split("=");
	if (key && !process.env[key]) {
		process.env[key] = valueParts.join("=");
	}
}

const db = await import("@better-app/db");
const prisma = db.default;
const { RunStatus, UnitStatus } = db;

async function main() {
	const timestamp = Date.now();

	// 1. 找到 DIP 产线和对应的站点
	const dipLine = await prisma.line.findFirst({
		where: { code: { contains: "DIP" } },
		include: { stations: true },
	});

	if (!dipLine) {
		console.log("❌ 未找到 DIP 产线，请先运行 seed");
		return;
	}

	console.log("✅ 找到产线:", dipLine.code, "-", dipLine.name);

	// 2. 找到 READY 状态的 DIP 路由版本
	const routeVersion = await prisma.executableRouteVersion.findFirst({
		where: {
			status: "READY",
			routing: { code: { contains: "DIP" } },
		},
		include: {
			routing: {
				include: { steps: { orderBy: { stepNo: "asc" } } },
			},
		},
	});

	if (!routeVersion) {
		console.log("❌ 未找到 READY 状态的 DIP 路由版本");
		return;
	}

	console.log("✅ 找到路由版本:", routeVersion.routing.code, "| 步骤数:", routeVersion.routing.steps.length);

	// 3. 找到或创建工单
	let workOrder = await prisma.workOrder.findFirst({
		where: { status: "RELEASED" },
		orderBy: { createdAt: "desc" },
	});

	if (!workOrder) {
		workOrder = await prisma.workOrder.create({
			data: {
				woNo: `WO-DEMO-${timestamp}`,
				productCode: "DEMO-PRODUCT",
				productName: "演示产品",
				plannedQty: 3,
				status: "RELEASED",
			},
		});
		console.log("✅ 创建工单:", workOrder.woNo);
	} else {
		console.log("✅ 使用现有工单:", workOrder.woNo);
	}

	// 4. 创建 Run
	const runNo = `RUN-E2E-${timestamp}`;
	const firstStepNo = routeVersion.routing.steps[0]?.stepNo ?? 1;

	const run = await prisma.run.create({
		data: {
			runNo,
			woId: workOrder.id,
			lineId: dipLine.id,
			routeVersionId: routeVersion.id,
			status: RunStatus.AUTHORIZED, // 直接设为已授权，跳过预检
			plannedQty: 3,
			startedAt: new Date(),
		},
	});

	console.log("✅ 创建 Run:", run.runNo, "| 状态: AUTHORIZED");

	// 5. 创建单件
	const units = await prisma.unit.createManyAndReturn({
		data: [1, 2, 3].map((i) => ({
			sn: `SN-E2E-${timestamp}-${String(i).padStart(4, "0")}`,
			runId: run.id,
			woId: workOrder.id,
			status: UnitStatus.QUEUED,
			currentStepNo: firstStepNo,
		})),
	});

	console.log("✅ 创建单件:", units.length, "个");
	for (const u of units) {
		console.log("   -", u.sn);
	}

	// 6. 显示执行信息
	const firstStation = dipLine.stations[0];

	console.log("\n=== 演示流程 ===");
	console.log("1. 进入执行页面: /mes/execution");
	console.log("2. 选择工位:", firstStation?.code || "任意 DIP 工位");
	console.log("3. 扫描以下 SN 进站/出站:");
	for (const u of units) {
		console.log("   -", u.sn);
	}
	console.log("4. 走完所有步骤后，OQC 自动触发");
	console.log("5. 进入 OQC 页面: /mes/oqc");

	console.log("\n=== 路由步骤 ===");
	for (const step of routeVersion.routing.steps) {
		console.log(`Step ${step.stepNo}: ${step.name}`);
	}
}

main()
	.then(() => prisma.$disconnect())
	.catch(console.error);
