import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const { default: prisma } = await import("@better-app/db");

async function main() {
  const run = await prisma.run.findFirst({
    where: { runNo: { contains: "RUN-DEMO" } },
    orderBy: { createdAt: "desc" },
    include: {
      workOrder: true,
      routeVersion: {
        include: {
          routing: {
            include: {
              steps: {
                orderBy: { stepNo: "asc" },
                include: { operation: true }
              }
            }
          }
        }
      },
      line: true,
      units: { take: 5 },
      inspections: true,
    }
  });

  if (!run) {
    console.log("未找到 RUN-DEMO 开头的批次");
    return;
  }

  console.log("=== Run 信息 ===");
  console.log("Run 编号:", run.runNo);
  console.log("状态:", run.status);
  console.log("产线:", run.line ? run.line.name : "未指定");
  console.log("工单:", run.workOrder ? run.workOrder.woNo : "-");
  console.log("计划数量:", run.plannedQty);
  
  console.log("\n=== 路由信息 ===");
  if (run.routeVersion) {
    const routing = run.routeVersion.routing;
    console.log("路由:", routing ? routing.code + " - " + routing.name : "-");
    console.log("版本:", run.routeVersion.version, "(" + run.routeVersion.status + ")");
    
    if (routing && routing.steps) {
      console.log("\n工序列表:");
      for (const step of routing.steps) {
        const opName = step.operation ? step.operation.name : step.name;
        console.log("  Step " + step.stepNo + ": " + opName + " - 站点组ID: " + (step.stationGroupId || "未配置"));
      }
    }
  }

  console.log("\n=== 检验记录 ===");
  for (const insp of run.inspections) {
    console.log("  " + insp.type + ": " + insp.status);
  }

  console.log("\n=== 单件 (前5个) ===");
  for (const unit of run.units) {
    console.log("  " + unit.sn + ": " + unit.status);
  }

  const execConfigs = await prisma.routeExecutionConfig.findMany({
    where: { routingId: run.routeVersion ? run.routeVersion.routingId : undefined },
    include: { stationGroup: true, step: true }
  });
  
  console.log("\n=== 路由执行配置 ===");
  if (execConfigs.length === 0) {
    console.log("  无执行配置！");
  } else {
    for (const cfg of execConfigs) {
      const stepInfo = cfg.step ? "Step " + cfg.step.stepNo : "全局";
      const sgName = cfg.stationGroup ? cfg.stationGroup.code : "未指定";
      console.log("  scope:", cfg.scope, "| 步骤:", stepInfo, "| 站点组:", sgName);
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
}

main();
