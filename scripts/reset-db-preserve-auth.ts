import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const backupPath = path.join(repoRoot, "data", "auth_backup.json");

const envPath = path.join(repoRoot, "apps", "server", ".env");

const loadEnv = async (filePath: string) => {
	const content = await fs.readFile(filePath, "utf8");
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex < 0) continue;
		const key = trimmed.slice(0, separatorIndex).trim();
		let value = trimmed.slice(separatorIndex + 1).trim();
		if (
			(value.startsWith("\"") && value.endsWith("\"")) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
};

if (!process.env.DATABASE_URL) {
	await loadEnv(envPath);
}

type BackupPayload = {
	users: Record<string, unknown>[];
	sessions: Record<string, unknown>[];
	accounts: Record<string, unknown>[];
	verifications: Record<string, unknown>[];
	roles: Record<string, unknown>[];
	userRoles: Record<string, unknown>[];
	notifications: Record<string, unknown>[];
	systemLogs: Record<string, unknown>[];
};

const { createDbClient } = await import("../packages/db/src/index");
const prisma = createDbClient();

const reviveDateFields = (record: Record<string, unknown>) => {
	const next: Record<string, unknown> = { ...record };
	for (const [key, value] of Object.entries(next)) {
		if (typeof value === "string" && key.endsWith("At")) {
			const parsed = new Date(value);
			if (!Number.isNaN(parsed.getTime())) {
				next[key] = parsed;
			}
		}
	}
	return next;
};

const readBackupFile = async (): Promise<BackupPayload | null> => {
	try {
		const raw = await fs.readFile(backupPath, "utf8");
		const parsed = JSON.parse(raw) as BackupPayload;
		if (!parsed || !Array.isArray(parsed.users)) return null;
		return {
			users: parsed.users.map(reviveDateFields),
			sessions: (parsed.sessions ?? []).map(reviveDateFields),
			accounts: (parsed.accounts ?? []).map(reviveDateFields),
			verifications: (parsed.verifications ?? []).map(reviveDateFields),
			roles: (parsed.roles ?? []).map(reviveDateFields),
			userRoles: (parsed.userRoles ?? []).map(reviveDateFields),
			notifications: (parsed.notifications ?? []).map(reviveDateFields),
			systemLogs: (parsed.systemLogs ?? []).map(reviveDateFields),
		};
	} catch {
		return null;
	}
};

let backup = await readBackupFile();

if (!backup) {
	backup = {
		users: await prisma.user.findMany(),
		sessions: await prisma.session.findMany(),
		accounts: await prisma.account.findMany(),
		verifications: await prisma.verification.findMany(),
		roles: await prisma.role.findMany(),
		userRoles: await prisma.userRoleAssignment.findMany(),
		notifications: await prisma.notification.findMany(),
		systemLogs: await prisma.systemLog.findMany(),
	};

	await fs.mkdir(path.dirname(backupPath), { recursive: true });
	await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), "utf8");
}

await prisma.$disconnect();

const resetResult = Bun.spawnSync(
	["bun", "run", "db:push", "--", "--force-reset", "--accept-data-loss"],
	{
		cwd: repoRoot,
		stdout: "inherit",
		stderr: "inherit",
	},
);

if (resetResult.exitCode !== 0) {
	console.error("Database reset failed.");
	process.exit(resetResult.exitCode ?? 1);
}

const { ALL_PERMISSIONS } = await import("../packages/db/src/permissions/permissions");
const allowedPermissions = new Set(ALL_PERMISSIONS);
const sanitizeRolePermissions = (raw: unknown) => {
	if (typeof raw !== "string") return "[]";
	try {
		const parsed = JSON.parse(raw) as string[];
		if (!Array.isArray(parsed)) return "[]";
		const filtered = parsed.filter((item) => allowedPermissions.has(item));
		return JSON.stringify(filtered);
	} catch {
		return "[]";
	}
};

const prismaRestore = createDbClient();

const roles = backup.roles.map((role) => ({
	...role,
	permissions: sanitizeRolePermissions(role.permissions),
}));

if (roles.length > 0) {
	await prismaRestore.role.createMany({ data: roles });
}
if (backup.users.length > 0) {
	await prismaRestore.user.createMany({ data: backup.users });
}
if (backup.accounts.length > 0) {
	await prismaRestore.account.createMany({ data: backup.accounts });
}
if (backup.sessions.length > 0) {
	await prismaRestore.session.createMany({ data: backup.sessions });
}
if (backup.verifications.length > 0) {
	await prismaRestore.verification.createMany({ data: backup.verifications });
}
if (backup.notifications.length > 0) {
	await prismaRestore.notification.createMany({ data: backup.notifications });
}
if (backup.systemLogs.length > 0) {
	await prismaRestore.systemLog.createMany({ data: backup.systemLogs });
}
if (backup.userRoles.length > 0) {
	await prismaRestore.userRoleAssignment.createMany({ data: backup.userRoles });
}

await prismaRestore.$disconnect();

console.log("Database reset complete. Auth backup saved at:", backupPath);
