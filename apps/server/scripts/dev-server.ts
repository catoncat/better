/**
 * Dev Server with Auto-Restart
 *
 * 功能：
 * 1. 使用 --watch 模式运行 server
 * 2. 进程崩溃后自动重启
 * 3. 启动前等待 prismabox/barrel.ts 存在（避免 prisma generate 期间的 ENOENT）
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

const SERVER_ARGS = ["--watch", "src/index.ts"];
const RESTART_DELAY_MS = 200;
const BARREL_WAIT_MAX_MS = 5000;
const BARREL_POLL_INTERVAL_MS = 100;

// 相对于 apps/server 目录
const BARREL_PATH = join(import.meta.dirname ?? process.cwd(), "../../packages/db/prisma/generated/prismabox/barrel.ts");

let shouldExit = false;
let child: ReturnType<typeof Bun.spawn> | null = null;

function handleShutdown(signal: NodeJS.Signals) {
	if (shouldExit) return;
	shouldExit = true;
	if (child) child.kill(signal);
	process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

async function waitForBarrel(): Promise<boolean> {
	if (existsSync(BARREL_PATH)) return true;

	console.log("[dev-server] Waiting for prismabox/barrel.ts...");
	const start = Date.now();

	while (!existsSync(BARREL_PATH)) {
		if (shouldExit) return false;
		if (Date.now() - start > BARREL_WAIT_MAX_MS) {
			console.log("[dev-server] barrel.ts not found after timeout, proceeding anyway...");
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, BARREL_POLL_INTERVAL_MS));
	}

	console.log("[dev-server] barrel.ts found, starting server...");
	return true;
}

async function run() {
	while (!shouldExit) {
		// 启动前等待 barrel.ts 存在
		const ready = await waitForBarrel();
		if (!ready || shouldExit) return;

		child = Bun.spawn(["bun", ...SERVER_ARGS], {
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
		});

		const { exitCode } = await child.exited;
		child = null;

		if (shouldExit) return;
		console.log(`[dev-server] server exited (${exitCode ?? "unknown"}), restarting...`);
		await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
	}
}

run().catch((error) => {
	console.error("[dev-server] failed to start", error);
	process.exit(1);
});
