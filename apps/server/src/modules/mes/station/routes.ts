import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";

export const stationModule = new Elysia({
	prefix: "/stations",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get("/", () => ({ message: "Station module health check" }), {
		detail: { tags: ["MES - Stations"] },
	});
