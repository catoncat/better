# 演示数据脚本

## 1. 概述
本文档提供 DIP 演示数据生成的脚本模板，可根据实际 API 结构调整使用。

## 2. 脚本结构

```
scripts/demo-data/
├── dip/
│   ├── 01-config-data.ts      # 配置数据
│   ├── 02-work-orders.ts      # 工单数据
│   ├── 03-runs-and-units.ts   # 批次和单件
│   ├── 04-fai.ts              # 首件数据
│   ├── 05-execution.ts        # 执行记录
│   ├── 06-test-records.ts     # 测试记录
│   ├── 07-defects.ts          # 不良数据
│   ├── 08-oqc.ts              # OQC 数据
│   └── 09-tooling-usage.ts    # 夹具使用
└── run-dip-demo.ts            # 主执行脚本
```

## 3. 配置数据脚本

```typescript
// scripts/demo-data/dip/01-config-data.ts

import { prisma } from "@/db";

export async function createDipConfigData() {
  console.log("Creating DIP config data...");

  // 1. 创建产线
  const line = await prisma.line.create({
    data: {
      lineCode: "DIP-A",
      name: "DIP 产线 A",
      type: "DIP",
      status: "ACTIVE",
    },
  });

  // 2. 创建工位
  const stations = [
    { code: "DIP-A-AI-01", name: "AI 插件工位", type: "INSERTION", seq: 10 },
    { code: "DIP-A-MI-01", name: "手工插件工位", type: "INSERTION", seq: 20 },
    { code: "DIP-A-OI-01", name: "异形件插件工位", type: "INSERTION", seq: 30 },
    { code: "DIP-A-WS-01", name: "波峰焊工位", type: "WAVE", seq: 40 },
    { code: "DIP-A-HS-01", name: "手工焊接工位", type: "POST_SOLDER", seq: 50 },
    { code: "DIP-A-TL-01", name: "剪脚工位", type: "POST_SOLDER", seq: 60 },
    { code: "DIP-A-CC-01", name: "三防漆喷涂工位", type: "POST_SOLDER", seq: 70 },
    { code: "DIP-A-CU-01", name: "固化工位", type: "POST_SOLDER", seq: 80 },
    { code: "DIP-A-VI-01", name: "外观检验工位", type: "INSPECTION", seq: 90 },
    { code: "DIP-A-ICT-01", name: "ICT 测试工位", type: "TEST", seq: 100 },
    { code: "DIP-A-FCT-01", name: "FCT 测试工位", type: "TEST", seq: 110 },
  ];

  for (const s of stations) {
    await prisma.station.create({
      data: {
        stationCode: s.code,
        name: s.name,
        lineId: line.id,
        stationType: s.type,
        sequence: s.seq,
        status: "ACTIVE",
      },
    });
  }

  // 3. 创建产品
  const productA = await prisma.product.create({
    data: {
      productCode: "PROD-DIP-A",
      name: "DIP 产品 A",
      category: "PCBA",
    },
  });

  // 4. 创建路由
  const route = await prisma.routing.create({
    data: {
      routeCode: "ROUTE-DIP-PRDA",
      name: "产品 A DIP 路由",
      productId: productA.id,
      type: "DIP",
    },
  });

  const routeVersion = await prisma.routeVersion.create({
    data: {
      routeId: route.id,
      versionCode: "V1.0",
      status: "ACTIVE",
    },
  });

  // 创建路由步骤
  for (const s of stations) {
    const station = await prisma.station.findUnique({
      where: { stationCode: s.code },
    });
    await prisma.routingStep.create({
      data: {
        routeVersionId: routeVersion.id,
        stationId: station!.id,
        sequence: s.seq,
        stepName: s.name,
        required: true,
      },
    });
  }

  // 5. 创建夹具
  const toolings = [
    { code: "WS-JIG-PRDA-001", name: "产品 A 波峰焊治具 1", type: "WAVE_JIG", max: 5000, current: 1234 },
    { code: "WS-JIG-PRDA-002", name: "产品 A 波峰焊治具 2", type: "WAVE_JIG", max: 5000, current: 4800 },
    { code: "ICT-JIG-PRDA-001", name: "产品 A ICT 测试夹具", type: "ICT_JIG", max: 10000, current: 2500 },
    { code: "FCT-JIG-PRDA-001", name: "产品 A FCT 测试夹具", type: "FCT_JIG", max: 10000, current: 3000 },
  ];

  for (const t of toolings) {
    await prisma.tooling.create({
      data: {
        toolingCode: t.code,
        name: t.name,
        type: t.type,
        productId: productA.id,
        maxLife: t.max,
        currentLife: t.current,
        status: "ACTIVE",
      },
    });
  }

  console.log("DIP config data created.");
}
```

## 4. 工单脚本

```typescript
// scripts/demo-data/dip/02-work-orders.ts

export async function createDipWorkOrders() {
  console.log("Creating DIP work orders...");

  const productA = await prisma.product.findUnique({
    where: { productCode: "PROD-DIP-A" },
  });

  const workOrders = [
    { no: "WO-DIP-001", qty: 200, status: "IN_PROGRESS" },
    { no: "WO-DIP-002", qty: 100, status: "RELEASED" },
    { no: "WO-DIP-003", qty: 150, status: "RELEASED" },
  ];

  for (const wo of workOrders) {
    await prisma.workOrder.create({
      data: {
        workOrderNo: wo.no,
        productId: productA!.id,
        quantity: wo.qty,
        status: wo.status,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("DIP work orders created.");
}
```

## 5. 批次与单件脚本

```typescript
// scripts/demo-data/dip/03-runs-and-units.ts

export async function createDipRunsAndUnits() {
  console.log("Creating DIP runs and units...");

  const line = await prisma.line.findUnique({ where: { lineCode: "DIP-A" } });
  const routeVersion = await prisma.routeVersion.findFirst({
    where: { route: { routeCode: "ROUTE-DIP-PRDA" } },
  });

  // 批次 1: 已完成
  const run1 = await createRunWithUnits({
    runNo: "RUN-DIP-001",
    workOrderNo: "WO-DIP-001",
    lineId: line!.id,
    routeVersionId: routeVersion!.id,
    plannedQty: 100,
    status: "COMPLETED",
    unitCount: 100,
    doneCount: 98,
    scrappedCount: 2,
  });

  // 批次 2: 执行中
  const run2 = await createRunWithUnits({
    runNo: "RUN-DIP-002",
    workOrderNo: "WO-DIP-001",
    lineId: line!.id,
    routeVersionId: routeVersion!.id,
    plannedQty: 100,
    status: "IN_PROGRESS",
    unitCount: 100,
    doneCount: 45,
    inProgressCount: 10,
    defectiveCount: 3,
  });

  // 批次 3: 待首件
  const run3 = await createRunWithUnits({
    runNo: "RUN-DIP-003",
    workOrderNo: "WO-DIP-002",
    lineId: line!.id,
    routeVersionId: routeVersion!.id,
    plannedQty: 100,
    status: "PREP",
    unitCount: 100,
    doneCount: 0,
  });

  // 批次 4: OQC 挂起
  const run4 = await createRunWithUnits({
    runNo: "RUN-DIP-004",
    workOrderNo: "WO-DIP-002",
    lineId: line!.id,
    routeVersionId: routeVersion!.id,
    plannedQty: 50,
    status: "ON_HOLD",
    unitCount: 50,
    doneCount: 50,
  });

  console.log("DIP runs and units created.");
}

async function createRunWithUnits(params: {
  runNo: string;
  workOrderNo: string;
  lineId: string;
  routeVersionId: string;
  plannedQty: number;
  status: string;
  unitCount: number;
  doneCount: number;
  inProgressCount?: number;
  defectiveCount?: number;
  scrappedCount?: number;
}) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: params.workOrderNo },
  });

  const run = await prisma.run.create({
    data: {
      runNo: params.runNo,
      workOrderId: workOrder!.id,
      lineId: params.lineId,
      routeVersionId: params.routeVersionId,
      plannedQty: params.plannedQty,
      status: params.status,
    },
  });

  // 生成单件
  for (let i = 1; i <= params.unitCount; i++) {
    let status = "QUEUED";
    if (i <= params.doneCount) {
      status = "DONE";
    } else if (i <= params.doneCount + (params.inProgressCount || 0)) {
      status = "IN_PROGRESS";
    } else if (i <= params.doneCount + (params.inProgressCount || 0) + (params.defectiveCount || 0)) {
      status = "DEFECTIVE";
    } else if (i <= params.doneCount + (params.inProgressCount || 0) + (params.defectiveCount || 0) + (params.scrappedCount || 0)) {
      status = "SCRAPPED";
    }

    await prisma.unit.create({
      data: {
        serialNo: `${params.runNo}-${String(i).padStart(3, "0")}`,
        runId: run.id,
        status,
      },
    });
  }

  return run;
}
```

## 6. 执行记录脚本

```typescript
// scripts/demo-data/dip/05-execution.ts

export async function createDipExecutionRecords() {
  console.log("Creating DIP execution records...");

  const stations = await prisma.station.findMany({
    where: { line: { lineCode: "DIP-A" } },
    orderBy: { sequence: "asc" },
  });

  // 为批次 1 的已完成单件生成执行记录
  const run1 = await prisma.run.findUnique({ where: { runNo: "RUN-DIP-001" } });
  const units1 = await prisma.unit.findMany({
    where: { runId: run1!.id, status: "DONE" },
  });

  for (const unit of units1) {
    await createFullExecutionRecords(unit, stations);
  }

  // 为批次 2 的单件生成部分执行记录
  const run2 = await prisma.run.findUnique({ where: { runNo: "RUN-DIP-002" } });
  const units2 = await prisma.unit.findMany({
    where: { runId: run2!.id },
  });

  for (const unit of units2) {
    if (unit.status === "DONE") {
      await createFullExecutionRecords(unit, stations);
    } else if (unit.status === "IN_PROGRESS") {
      // 部分执行
      const stopAt = Math.floor(Math.random() * stations.length);
      await createPartialExecutionRecords(unit, stations.slice(0, stopAt));
    }
  }

  console.log("DIP execution records created.");
}

async function createFullExecutionRecords(unit: any, stations: any[]) {
  let time = new Date(Date.now() - 3600000); // 1 小时前开始

  for (const station of stations) {
    const trackInTime = new Date(time);
    time = new Date(time.getTime() + 60000); // 1 分钟后
    const trackOutTime = new Date(time);

    await prisma.trackRecord.create({
      data: {
        unitId: unit.id,
        stationId: station.id,
        trackInTime,
        trackOutTime,
        result: "PASS",
        operatorId: "OP-001",
      },
    });

    time = new Date(time.getTime() + 30000); // 30 秒间隔
  }
}

async function createPartialExecutionRecords(unit: any, stations: any[]) {
  let time = new Date(Date.now() - 1800000); // 30 分钟前开始

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const trackInTime = new Date(time);
    time = new Date(time.getTime() + 60000);

    if (i < stations.length - 1) {
      // 已完成的工位
      const trackOutTime = new Date(time);
      await prisma.trackRecord.create({
        data: {
          unitId: unit.id,
          stationId: station.id,
          trackInTime,
          trackOutTime,
          result: "PASS",
          operatorId: "OP-001",
        },
      });
    } else {
      // 当前工位（进行中）
      await prisma.trackRecord.create({
        data: {
          unitId: unit.id,
          stationId: station.id,
          trackInTime,
          trackOutTime: null,
          result: null,
          operatorId: "OP-001",
        },
      });
    }

    time = new Date(time.getTime() + 30000);
  }
}
```

## 7. 主执行脚本

```typescript
// scripts/demo-data/run-dip-demo.ts

import { createDipConfigData } from "./dip/01-config-data";
import { createDipWorkOrders } from "./dip/02-work-orders";
import { createDipRunsAndUnits } from "./dip/03-runs-and-units";
import { createDipFai } from "./dip/04-fai";
import { createDipExecutionRecords } from "./dip/05-execution";
import { createDipTestRecords } from "./dip/06-test-records";
import { createDipDefects } from "./dip/07-defects";
import { createDipOqc } from "./dip/08-oqc";
import { createDipToolingUsage } from "./dip/09-tooling-usage";

async function main() {
  console.log("=== Starting DIP demo data generation ===");

  try {
    await createDipConfigData();
    await createDipWorkOrders();
    await createDipRunsAndUnits();
    await createDipFai();
    await createDipExecutionRecords();
    await createDipTestRecords();
    await createDipDefects();
    await createDipOqc();
    await createDipToolingUsage();

    console.log("=== DIP demo data generation completed ===");
  } catch (error) {
    console.error("Error generating demo data:", error);
    throw error;
  }
}

main();
```

## 8. 运行方式

```bash
# 运行演示数据生成
bun scripts/demo-data/run-dip-demo.ts

# 或者分步运行
bun scripts/demo-data/dip/01-config-data.ts
bun scripts/demo-data/dip/02-work-orders.ts
# ...
```

## 9. 注意事项

1. **数据清理**：运行前确保数据库无冲突数据
2. **顺序执行**：按顺序执行各脚本，确保依赖数据存在
3. **错误处理**：脚本应包含适当的错误处理
4. **幂等性**：考虑添加幂等性检查，避免重复创建
