import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./run-command";

type SetupTestDbOptions = {
	seed?: boolean;
	prefix?: string;
};

export type TestDbHandle = {
	databaseUrl: string;
	filePath: string;
	cleanup: () => Promise<void>;
};

const repoRoot = () => process.cwd();

const createDbFilePath = (prefix: string) => {
	const dir = path.join(repoRoot(), "data", "test");
	mkdirSync(dir, { recursive: true });

	const id = crypto.randomBytes(6).toString("hex");
	const filename = `${prefix}-${Date.now()}-${id}.db`;
	return path.join(dir, filename);
};

export const setupTestDb = async (options?: SetupTestDbOptions): Promise<TestDbHandle> => {
	const prefix = options?.prefix ?? "test";
	const seed = options?.seed ?? true;

	const filePath = createDbFilePath(prefix);
	const databaseUrl = `file:${filePath}`;

	await runCommand(["bun", "run", "db:deploy"], {
		cwd: repoRoot(),
		env: {
			DATABASE_URL: databaseUrl,
		},
	});

	if (seed) {
		await runCommand(["bun", "run", "db:seed"], {
			cwd: repoRoot(),
			env: {
				DATABASE_URL: databaseUrl,
			},
		});
	}

	return {
		databaseUrl,
		filePath,
		cleanup: async () => {
			await rm(filePath, { force: true });
		},
	};
};

