import prisma, { type PrismaClient } from "@better-app/db";
import { Elysia } from "elysia";

export type DBContext = {
	db: PrismaClient;
};

export const prismaPlugin = new Elysia({
	name: "prisma",
})
	.decorate("db", prisma)
	.onStop(async () => {
		await prisma.$disconnect();
	});

// Export prisma instance for use in cron jobs and other modules
export { prisma };
