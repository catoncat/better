/**
 * seed-loading-config.ts - 增强 LINE-A 的上料配置
 *
 * 在 bun run db:seed 之后运行，为 LINE-A 添加完整的上料站位表和物料映射
 * 这样 LINE-A 既有多状态数据（seed-demo.ts），又有完整的上料演示配置
 *
 * 使用方法:
 *   bun apps/server/scripts/seed-loading-config.ts
 */
import path from "node:path";
import dotenv from "dotenv";
import prisma from "@better-app/db";
import { runSeedLoadingConfig } from "../src/seed/seed-loading-config";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

await runSeedLoadingConfig({ prisma })
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Failed:", error);
		await prisma.$disconnect();
		process.exitCode = 1;
	});
