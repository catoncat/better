import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const { default: prisma } = await import("@better-app/db");

async function main() {
  // 查找执行配置
  const execConfigs = await prisma.routeExecutionConfig.findMany({
    include: { stationGroup: true, routingStep: true, routing: true }
  });
  
  console.log("=== 所有路由执行配置 ===");
  if (execConfigs.length === 0) {
    console.log("  无执行配置！");
  } else {
    for (const cfg of execConfigs) {
      const stepInfo = cfg.routingStep ? "Step " + cfg.routingStep.stepNo : "全局";
      const sgName = cfg.stationGroup ? cfg.stationGroup.code : "未指定";
      const routeName = cfg.routing ? cfg.routing.code : "-";
      console.log("  路由:", routeName, "| scope:", cfg.scope, "| 步骤:", stepInfo, "| 站点组:", sgName);
    }
  }

  console.log("\n=== 可用站点组和工位 ===");
  const groups = await prisma.stationGroup.findMany({
    include: { stations: true }
  });
  const lines = await prisma.line.findMany();
  const lineMap = new Map(lines.map(l => [l.id, l.name]));
  
  for (const g of groups) {
    console.log("站点组:", g.code, "-", g.name, "(产线:", lineMap.get(g.lineId) || "无", ")");
    for (const s of g.stations) {
      console.log("  工位:", s.code, "-", s.name);
    }
  }

  // 查找单件
  const units = await prisma.unit.findMany({
    where: { run: { runNo: { contains: "RUN-DEMO" } } },
    take: 10
  });
  console.log("\n=== 单件列表 ===");
  if (units.length === 0) {
    console.log("  无单件！批次没有创建单件");
  } else {
    for (const u of units) {
      console.log("  " + u.sn + ": " + u.status);
    }
  }
}

main();
