import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prismaPlugin } from "../../../plugins/prisma";
import {
	assignDispositionSchema,
	completeReworkSchema,
	createDefectSchema,
	defectQuerySchema,
	releaseHoldSchema,
	reworkTaskQuerySchema,
} from "./schema";
import {
	assignDisposition,
	completeRework,
	createDefect,
	getDefect,
	listDefects,
	listReworkTasks,
	releaseHold,
} from "./service";

export const defectRoutes = new Elysia({ prefix: "/defects" })
	.use(prismaPlugin)
	.use(authPlugin)
	// List defects
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listDefects(db, query);
			return result;
		},
		{
			query: defectQuerySchema,
			detail: { tags: ["MES - Defect"], summary: "List defects" },
		},
	)
	// Get defect by ID
	.get(
		"/:defectId",
		async ({ db, params, set }) => {
			const result = await getDefect(db, params.defectId);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			detail: { tags: ["MES - Defect"], summary: "Get defect by ID" },
		},
	)
	// Create defect
	.post(
		"/",
		async ({ db, body, set, user }) => {
			const result = await createDefect(db, body, undefined, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			set.status = 201;
			return result.data;
		},
		{
			isAuth: true,
			body: createDefectSchema,
			detail: { tags: ["MES - Defect"], summary: "Create defect" },
		},
	)
	// Assign disposition
	.post(
		"/:defectId/disposition",
		async ({ db, params, body, set, user }) => {
			const result = await assignDisposition(db, params.defectId, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			isAuth: true,
			body: assignDispositionSchema,
			detail: { tags: ["MES - Defect"], summary: "Assign disposition to defect" },
		},
	)
	// Release hold
	.post(
		"/:defectId/release",
		async ({ db, params, body, set, user }) => {
			const result = await releaseHold(db, params.defectId, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			isAuth: true,
			body: releaseHoldSchema,
			detail: { tags: ["MES - Defect"], summary: "Release unit from HOLD" },
		},
	);

export const reworkRoutes = new Elysia({ prefix: "/rework-tasks" })
	.use(prismaPlugin)
	.use(authPlugin)
	// List rework tasks
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listReworkTasks(db, query);
			return result;
		},
		{
			query: reworkTaskQuerySchema,
			detail: { tags: ["MES - Rework"], summary: "List rework tasks" },
		},
	)
	// Complete rework task
	.post(
		"/:taskId/complete",
		async ({ db, params, body, set, user }) => {
			const result = await completeRework(db, params.taskId, body, user?.id);
			if (!result.success) {
				set.status = result.status;
				return { error: result.code, message: result.message };
			}
			return result.data;
		},
		{
			isAuth: true,
			body: completeReworkSchema,
			detail: { tags: ["MES - Rework"], summary: "Complete rework task" },
		},
	);
