import path from "node:path";
import { spawn } from "bun";
import type { TestDbHandle } from "./test-db";

export type TestAppHandle = {
	baseUrl: string;
	port: number;
	stop: () => Promise<void>;
};

const repoRoot = () => {
	// Navigate from apps/server/src/testing/helpers to repo root
	return path.resolve(import.meta.dirname, "../../../../..");
};

/**
 * Starts a test server in a subprocess with the given test database.
 * This avoids the Prisma singleton issue by running in a separate process.
 */
export const startTestServer = async (db: TestDbHandle): Promise<TestAppHandle> => {
	// Find an available port
	const port = 3100 + Math.floor(Math.random() * 900);
	const root = repoRoot();
	const serverDir = path.join(root, "apps/server");

	const proc = spawn({
		cmd: ["bun", "run", "src/index.ts"],
		cwd: serverDir,
		env: {
			...process.env,
			DATABASE_URL: db.databaseUrl,
			PORT: String(port),
			HOST: "127.0.0.1",
			DISABLE_CRONS: "true",
			TIME_RULE_CRON_ENABLED: "false",
			MES_INTEGRATION_CRON_ENABLED: "false",
			AUDIT_ARCHIVE_ENABLED: "false",
		},
		stdout: "inherit",
		stderr: "inherit",
	});

	const baseUrl = `http://127.0.0.1:${port}`;

	// Wait for server to be ready
	const maxWait = 30000;
	const start = Date.now();
	let serverReady = false;
	while (Date.now() - start < maxWait) {
		try {
			const res = await fetch(`${baseUrl}/api/health`);
			if (res.ok) {
				serverReady = true;
				break;
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((r) => setTimeout(r, 200));
	}

	if (!serverReady) {
		proc.kill();
		throw new Error(`Test server failed to start within ${maxWait}ms on port ${port}`);
	}

	return {
		baseUrl,
		port,
		stop: async () => {
			proc.kill();
			await proc.exited;
		},
	};
};
