import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	completeFaiSchema,
	createFaiSchema,
	faiQuerySchema,
	recordFaiItemSchema,
} from "./schema";
import {
	checkFaiGate,
	completeFai,
	createFai,
	getFai,
	getFaiByRun,
	listFai,
	recordFaiItem,
	startFai,
} from "./service";

export const faiRoutes = new Elysia({ prefix: "/fai" })
	.use(prismaPlugin)
	.use(authPlugin)
	// List FAI inspections
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listFai(db, query);
			return result;
		},
		{
			query: faiQuerySchema,
			detail: { tags: ["MES - FAI"], summary: "List FAI inspections" },
		},
	)
	// Get FAI by ID
	.get(
		"/:faiId",
		async ({ db, params, set }) => {
			const result = await getFai(db, params.faiId);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			detail: { tags: ["MES - FAI"], summary: "Get FAI by ID" },
		},
	)
	// Get FAI by run
	.get(
		"/run/:runNo",
		async ({ db, params, set }) => {
			const result = await getFaiByRun(db, params.runNo);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			detail: { tags: ["MES - FAI"], summary: "Get FAI for a run" },
		},
	)
	// Check FAI gate for run
	.get(
		"/run/:runNo/gate",
		async ({ db, params, set }) => {
			const result = await checkFaiGate(db, params.runNo);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			detail: { tags: ["MES - FAI"], summary: "Check FAI gate for run authorization" },
		},
	)
	// Create FAI for run
	.post(
		"/run/:runNo",
		async ({ db, params, body, set, user }) => {
			const result = await createFai(db, params.runNo, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			set.status = 201;
			return result.data;
		},
		{
			isAuth: true,
			body: createFaiSchema,
			detail: { tags: ["MES - FAI"], summary: "Create FAI task for run" },
		},
	)
	// Start FAI inspection
	.post(
		"/:faiId/start",
		async ({ db, params, set, user }) => {
			const result = await startFai(db, params.faiId, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			isAuth: true,
			detail: { tags: ["MES - FAI"], summary: "Start FAI inspection" },
		},
	)
	// Record FAI item
	.post(
		"/:faiId/items",
		async ({ db, params, body, set, user }) => {
			const result = await recordFaiItem(db, params.faiId, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			set.status = 201;
			return result.data;
		},
		{
			isAuth: true,
			body: recordFaiItemSchema,
			detail: { tags: ["MES - FAI"], summary: "Record FAI inspection item" },
		},
	)
	// Complete FAI
	.post(
		"/:faiId/complete",
		async ({ db, params, body, set, user }) => {
			const result = await completeFai(db, params.faiId, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			isAuth: true,
			body: completeFaiSchema,
			detail: { tags: ["MES - FAI"], summary: "Complete FAI with decision" },
		},
	);
