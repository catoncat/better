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
import path from "node:path";
import dotenv from "dotenv";
import prisma from "@better-app/db";
import { runSeedDcDemo } from "../src/seed/seed-dc-demo";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

await runSeedDcDemo({ prisma })
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Failed:", error);
		await prisma.$disconnect();
		process.exit(1);
	});
