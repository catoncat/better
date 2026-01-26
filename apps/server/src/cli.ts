export type CliResult = { handled: boolean; exitCode?: number };

const HELP = `better-app CLI

Usage:
  better-app [command]

Commands:
  seed mes [--no-compile]   Seed MES/process master data (idempotent)
  seed roles                Seed preset roles (idempotent)
  help                      Show this message

Env:
  DATABASE_URL              Prisma sqlite URL (e.g. file:/db/db.db)
`;

const isHelpArg = (arg: string) => arg === "help" || arg === "--help" || arg === "-h";

export const runCli = async (argv: string[]): Promise<CliResult> => {
	const [command, ...rest] = argv;
	if (!command) return { handled: false };

	if (isHelpArg(command)) {
		console.log(HELP);
		return { handled: true, exitCode: 0 };
	}

	if (command !== "seed") return { handled: false };

	return runSeed(rest);
};

const runSeed = async (argv: string[]): Promise<CliResult> => {
	const target = argv[0] && !argv[0]?.startsWith("-") ? argv[0] : "mes";
	const flags = new Set(argv.slice(target === argv[0] ? 1 : 0));

	const compileRoutes = !flags.has("--no-compile");

	const { default: prisma } = await import("@better-app/db");

	try {
		if (isHelpArg(target)) {
			console.log(HELP);
			return { handled: true, exitCode: 0 };
		}

		if (target === "roles") {
			const { seedPresetRoles } = await import("./seed/seed-roles");
			await seedPresetRoles({ prisma });
			console.log("Seed completed: roles");
			return { handled: true, exitCode: 0 };
		}

		if (target === "mes" || target === "process") {
			const { seedMesMasterData } = await import("./modules/mes/seed/seed-mes-master-data");
			await seedMesMasterData({ prisma, compileRoutes });
			console.log("Seed completed: mes");
			return { handled: true, exitCode: 0 };
		}

		console.error(`Unknown seed target: ${target}`);
		console.log(HELP);
		return { handled: true, exitCode: 2 };
	} catch (error) {
		console.error("Seed failed", error);
		return { handled: true, exitCode: 1 };
	} finally {
		await prisma.$disconnect();
	}
};
