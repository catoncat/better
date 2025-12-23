import type { PrismaClient } from "@better-app/db";
import { RunStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { runAuthorizeSchema } from "./schema";

type RunAuthorizeInput = Static<typeof runAuthorizeSchema>;

export const authorizeRun = async (db: PrismaClient, runNo: string, data: RunAuthorizeInput) => {
	const run = await db.run.findUnique({ where: { runNo } });
	if (!run) return { success: false, code: "RUN_NOT_FOUND", message: "Run not found" };

	if (data.action === "AUTHORIZE") {
		if (run.status === RunStatus.AUTHORIZED) {
			return { success: true, data: run };
		}
		if (run.status !== RunStatus.PREP && run.status !== RunStatus.FAI_PENDING) {
			return {
				success: false,
				code: "RUN_NOT_READY",
				message: "Run is not in a state that can be authorized",
			};
		}
		const updated = await db.run.update({
			where: { runNo },
			data: {
				status: RunStatus.AUTHORIZED,
			},
		});
		return { success: true, data: updated };
	} else {
		if (run.status !== RunStatus.AUTHORIZED) {
			return { success: true, data: run };
		}
		const updated = await db.run.update({
			where: { runNo },
			data: {
				status: RunStatus.PREP,
			},
		});
		return { success: true, data: updated };
	}
};
