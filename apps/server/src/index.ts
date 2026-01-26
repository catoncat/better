import "dotenv/config";
import { startServer } from "./app";
import { runCli } from "./cli";

if (import.meta.main) {
	runCli(process.argv.slice(2))
		.then(async ({ handled, exitCode }) => {
			if (handled) {
				process.exit(exitCode ?? process.exitCode ?? 0);
			}

			await startServer();
		})
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		});
}

export type { App } from "./app";
export { createApi, createApp, startServer } from "./app";
