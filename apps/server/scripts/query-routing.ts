import path from "node:path";
import dotenv from "dotenv";

// Load env first before importing db
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const { default: prisma } = await import("@better-app/db");

async function main() {
	// 查看所有站点组
	const groups = await prisma.stationGroup.findMany({
		include: {
			stations: true,
		},
	});

	// 查看产线
	const lines = await prisma.line.findMany();
	const lineMap = new Map(lines.map((l) => [l.id, l.name]));

	console.log("=== 站点组列表 ===");
	for (const g of groups) {
		console.log(`站点组: ${g.code} - ${g.name}`);
		console.log(`  所属产线: ${lineMap.get(g.lineId) || "无"}`);
		console.log(`  工位数: ${g.stations.length}`);
		for (const s of g.stations) {
			console.log(`    - ${s.code}: ${s.name}`);
		}
		console.log("");
	}

	// 查看 EOIS-03-P 路由的工序
	const routing = await prisma.routing.findUnique({
		where: { code: "EOIS-03-P" },
		include: {
			steps: {
				orderBy: { stepNo: "asc" },
				include: { operation: true },
			},
		},
	});

	if (routing) {
		console.log("=== EOIS-03-P 工序分析 ===");
		for (const step of routing.steps) {
			const opName = step.operation ? step.operation.name : "未知";
			const opCode = step.operation ? step.operation.code : "未知";
			console.log(`Step ${step.stepNo}: ${opName} (${opCode})`);
		}
	}

	// 查看工作中心（ERP 同步来的）
	const workCenters = await prisma.workCenter.findMany({ take: 20 });
	console.log(`\n=== ERP 工作中心 (共 ${workCenters.length} 个) ===`);
	for (const wc of workCenters) {
		console.log(`- ${wc.code}: ${wc.name}`);
	}
}

main();
