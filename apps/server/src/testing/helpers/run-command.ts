type RunCommandOptions = {
	cwd?: string;
	env?: Record<string, string | undefined>;
};

export const runCommand = async (cmd: string[], options?: RunCommandOptions) => {
	const proc = Bun.spawn(cmd, {
		cwd: options?.cwd,
		env: { ...process.env, ...(options?.env ?? {}) },
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Command failed (${exitCode}): ${cmd.join(" ")}`);
	}
};
