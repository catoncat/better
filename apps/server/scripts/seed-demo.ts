/**
 * seed-demo.ts - 管理层演示数据脚本
 *
 * 在 bun run db:seed 之后运行，添加多状态工单/批次以展示系统能力
 *
 * 使用方法:
 *   bun apps/server/scripts/seed-demo.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import prisma from "@better-app/db";
import { runSeedDemo } from "../src/seed/seed-demo";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

await runSeedDemo({ prisma })
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Failed:", error);
		await prisma.$disconnect();
		process.exit(1);
	});
