export type WebMode = "off" | "embedded" | "dir";

export type WebConfig = { mode: "off" } | { mode: "embedded" } | { mode: "dir"; dir: string };

const parseArgValue = (name: string) => {
	const prefix = `${name}=`;
	for (const arg of process.argv.slice(2)) {
		if (arg === name) return "";
		if (arg.startsWith(prefix)) return arg.slice(prefix.length);
	}
	return null;
};

const readFlag = (name: string) => process.argv.slice(2).includes(name);

export const getWebConfig = (): WebConfig => {
	const cliMode = parseArgValue("--web");
	const cliDir = parseArgValue("--web-dir");

	const envMode = process.env.APP_WEB_MODE;
	const envDir = process.env.APP_WEB_DIR;

	const isStandalone = typeof Bun !== "undefined" && Bun.main.startsWith("/$bunfs/");
	const defaultMode: WebMode =
		process.env.NODE_ENV === "production" || isStandalone ? "embedded" : "off";

	if (cliDir) return { mode: "dir", dir: cliDir };

	const mode = (cliMode || envMode || defaultMode) as WebMode;

	if (readFlag("--web-off")) return { mode: "off" };
	if (readFlag("--web-embedded")) return { mode: "embedded" };

	if (mode === "dir") {
		if (!cliDir && !envDir) return { mode: "off" };
		return { mode: "dir", dir: cliDir || envDir || "" };
	}

	if (mode === "embedded") return { mode: "embedded" };
	return { mode: "off" };
};
