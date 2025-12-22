import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

export default defineConfig({
	schema: path.join("prisma", "schema"),
	datasource: {
		url: (() => {
			let rawUrl = "file:./data/";
			try {
				rawUrl = env("DATABASE_URL");
			} catch {
				// Allow prisma generate in CI/build environments without a configured DATABASE_URL.
			}
			if (!rawUrl.startsWith("file:")) return rawUrl;
			const filePath = rawUrl.slice("file:".length);
			if (filePath.startsWith("/")) return rawUrl;

			const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
			const repoRoot = path.resolve(packageDir, "..", "..");
			const absolutePath = path.resolve(repoRoot, filePath);
			return `file:${absolutePath}`;
		})(),
	},
});
