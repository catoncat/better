import "dotenv/config";
import { startServer } from "./app";

if (import.meta.main) {
	startServer().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

export type { App } from "./app";
export { createApi, createApp, startServer } from "./app";
