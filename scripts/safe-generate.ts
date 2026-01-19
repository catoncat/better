/**
 * Safe Prisma Generate Script
 *
 * 问题：prisma generate 会先删除 generated 目录再重建，
 * 在这个时间窗口内，如果 dev server 的 watch 检测到文件消失并尝试重载，
 * 会因为 ENOENT 而崩溃。
 *
 * 解决方案：在 generate 前备份现有文件，失败时恢复，
 * 确保文件始终存在（或至少减少不存在的时间窗口）。
 */

import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dirname ? join(import.meta.dirname, "..") : process.cwd();
const PRISMABOX_DIR = join(ROOT, "packages/db/prisma/generated/prismabox");
const BACKUP_DIR = `${PRISMABOX_DIR}.bak`;

function backup() {
	if (existsSync(PRISMABOX_DIR)) {
		console.log("[safe-generate] Backing up prismabox...");
		rmSync(BACKUP_DIR, { recursive: true, force: true });
		cpSync(PRISMABOX_DIR, BACKUP_DIR, { recursive: true });
	}
}

function cleanup() {
	rmSync(BACKUP_DIR, { recursive: true, force: true });
}

function restore() {
	if (existsSync(BACKUP_DIR)) {
		console.log("[safe-generate] Restoring prismabox from backup...");
		rmSync(PRISMABOX_DIR, { recursive: true, force: true });
		cpSync(BACKUP_DIR, PRISMABOX_DIR, { recursive: true });
		cleanup();
	}
}

async function main() {
	backup();

	const proc = Bun.spawn(["bun", "run", "--filter", "@better-app/db", "db:generate"], {
		stdout: "inherit",
		stderr: "inherit",
		cwd: ROOT,
	});

	const exitCode = await proc.exited;

	if (exitCode === 0) {
		console.log("[safe-generate] Generate succeeded, cleaning up backup...");
		cleanup();
	} else {
		console.error("[safe-generate] Generate failed, restoring backup...");
		restore();
		process.exit(exitCode);
	}
}

main();
