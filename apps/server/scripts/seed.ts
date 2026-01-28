import path from "node:path";
import dotenv from "dotenv";
import prisma from "@better-app/db";
import { runSeed } from "../src/seed/seed";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

await runSeed({ prisma })
	.then(async () => {
		console.log("Seed completed");
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error("Seed failed", error);
		await prisma.$disconnect();
		process.exitCode = 1;
	});
