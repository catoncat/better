import path from "node:path";
import dotenv from "dotenv";
import prisma from "@better-app/db";
import { seedTimeRules } from "../src/seed/seed-time-rules";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

if (import.meta.main) {
	await seedTimeRules();
	await prisma.$disconnect();
	console.log("Seed time rules completed");
}
