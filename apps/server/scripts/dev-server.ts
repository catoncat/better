const SERVER_ARGS = ["--watch", "src/index.ts"];
const RESTART_DELAY_MS = 200;

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

async function run() {
	while (!shouldExit) {
		child = Bun.spawn(["bun", ...SERVER_ARGS], {
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
		});

		const { exitCode } = await child.exited;
		child = null;

		if (shouldExit) return;
		console.log(
			`[dev-server] server exited (${exitCode ?? "unknown"}), restarting...`,
		);
		await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
	}
}

run().catch((error) => {
	console.error("[dev-server] failed to start", error);
	process.exit(1);
});
