import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import {
	calibrationCreateSchema,
	calibrationDeleteQuerySchema,
	calibrationListAllQuerySchema,
	calibrationListQuerySchema,
	calibrationRecordParamsSchema,
	calibrationUpdateSchema,
	instrumentCalibrationUpdateSchema,
	instrumentCreateSchema,
	instrumentListQuerySchema,
	instrumentParamsSchema,
	instrumentUpdateSchema,
} from "./schema";
import {
	createCalibrationRecord,
	createInstrument,
	deleteCalibrationRecord,
	deleteInstrument,
	getInstrument,
	listAllCalibrationRecords,
	listCalibrationRecords,
	listDepartments,
	listInstruments,
	updateCalibrationRecord,
	updateInstrument,
	updateInstrumentCalibration,
} from "./service";

export const instrumentModule = new Elysia({
	prefix: "/instruments",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			return listInstruments(db, query);
		},
		{
			isAuth: true,
			query: instrumentListQuerySchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.get(
		"/departments",
		async ({ db }) => {
			return listDepartments(db);
		},
		{
			isAuth: true,
			detail: { tags: ["Instruments"] },
		},
	)
	.get(
		"/calibrations",
		async ({ db, query, set }) => {
			const result = await listAllCalibrationRecords(db, query);

			if (!result.success) {
				set.status = result.status ?? 400;
				return { code: result.code, message: result.message };
			}

			return result.data;
		},
		{
			isAuth: true,
			query: calibrationListAllQuerySchema,
			detail: { tags: ["Calibrations"] },
		},
	)
	.get(
		"/:id",
		async ({ db, params, set }) => {
			const instrument = await getInstrument(db, params.id);

			if (!instrument) {
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			return instrument;
		},
		{
			isAuth: true,
			params: instrumentParamsSchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.post(
		"/",
		async ({ db, body }) => {
			return createInstrument(db, body);
		},
		{
			isAuth: true,
			body: instrumentCreateSchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.patch(
		"/:id",
		async ({ db, params, body, set }) => {
			const updated = await updateInstrument(db, params.id, body);

			if (!updated) {
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			return updated;
		},
		{
			isAuth: true,
			params: instrumentParamsSchema,
			body: instrumentUpdateSchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.patch(
		"/:id/calibration",
		async ({ db, params, body, set }) => {
			const updated = await updateInstrumentCalibration(db, params.id, body);

			if (!updated) {
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			return updated;
		},
		{
			isAuth: true,
			params: instrumentParamsSchema,
			body: instrumentCalibrationUpdateSchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.group("/:id/calibrations", (app) =>
		app
			.get(
				"/",
				async ({ db, params, query, set }) => {
					const result = await listCalibrationRecords(db, params.id, query);

					if (!result.success) {
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					return result.data;
				},
				{
					isAuth: true,
					params: instrumentParamsSchema,
					query: calibrationListQuerySchema,
					detail: { tags: ["Calibrations"] },
				},
			)
			.post(
				"/",
				async ({ db, params, body, set, user }) => {
					const result = await createCalibrationRecord(db, params.id, user.id, body);

					if (!result.success) {
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					return result.data;
				},
				{
					isAuth: true,
					params: instrumentParamsSchema,
					body: calibrationCreateSchema,
					detail: { tags: ["Calibrations"] },
				},
			)
			.patch(
				"/:recordId",
				async ({ db, params, body, set }) => {
					const result = await updateCalibrationRecord(db, params.id, params.recordId, body);

					if (!result.success) {
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					return result.data;
				},
				{
					isAuth: true,
					params: calibrationRecordParamsSchema,
					body: calibrationUpdateSchema,
					detail: { tags: ["Calibrations"] },
				},
			)
			.delete(
				"/:recordId",
				async ({ db, params, query, set }) => {
					const result = await deleteCalibrationRecord(db, params.id, params.recordId, query);

					if (!result.success) {
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					return result.data;
				},
				{
					isAuth: true,
					params: calibrationRecordParamsSchema,
					query: calibrationDeleteQuerySchema,
					detail: { tags: ["Calibrations"] },
				},
			),
	)
	.delete(
		"/:id",
		async ({ db, params, set }) => {
			const deleted = await deleteInstrument(db, params.id);

			if (!deleted) {
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			return deleted;
		},
		{
			isAuth: true,
			params: instrumentParamsSchema,
			detail: { tags: ["Instruments"] },
		},
	);
