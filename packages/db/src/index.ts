import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../prisma/generated/client/index.js";
import { PrismaBunSqlite } from "./bun-sqlite-adapter";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(SRC_DIR, ".."); // packages/db
const REPO_ROOT = path.resolve(PACKAGE_DIR, "..", "..");

function resolveDatabaseUrl(rawUrl: string): string {
	if (!rawUrl.startsWith("file:")) return rawUrl;

	const filePath = rawUrl.slice("file:".length);
	if (filePath.startsWith("/")) return rawUrl;

	const baseDir = REPO_ROOT.startsWith("/$bunfs/") ? process.cwd() : REPO_ROOT;
	const absolutePath = path.resolve(baseDir, filePath);
	return `file:${absolutePath}`;
}

export function createDbClient(): PrismaClient {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL is required to initialize Prisma (expected a sqlite file:... URL)",
		);
	}

	const adapter = new PrismaBunSqlite({ url: resolveDatabaseUrl(databaseUrl) });
	return new PrismaClient({ adapter });
}

const prisma = createDbClient();

export default prisma;

export type { PrismaClient } from "../prisma/generated/client/index.js";
// Re-export all Prisma types and enums
export * from "../prisma/generated/client/index.js";
