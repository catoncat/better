import { Elysia } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
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
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			try {
				const created = await createInstrument(db, body);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSTRUMENT,
					entityId: created.id,
					entityDisplay: created.instrumentNo,
					action: "INSTRUMENT_CREATE",
					actor,
					status: "SUCCESS",
					before: null,
					after: created,
					request: requestMeta,
				});
				return created;
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSTRUMENT,
					entityId: body.instrumentNo,
					entityDisplay: body.instrumentNo,
					action: "INSTRUMENT_CREATE",
					actor,
					status: "FAIL",
					errorCode: "INSTRUMENT_CREATE_FAILED",
					errorMessage: error instanceof Error ? error.message : "创建量具失败",
					request: requestMeta,
					payload: { instrumentNo: body.instrumentNo },
				});
				throw error;
			}
		},
		{
			isAuth: true,
			body: instrumentCreateSchema,
			detail: { tags: ["Instruments"] },
		},
	)
	.patch(
		"/:id",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.instrument.findUnique({ where: { id: params.id } });
			const updated = await updateInstrument(db, params.id, body);

			if (!updated) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSTRUMENT,
					entityId: params.id,
					entityDisplay: params.id,
					action: "INSTRUMENT_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "NOT_FOUND",
					errorMessage: "Instrument not found",
					before,
					request: requestMeta,
				});
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSTRUMENT,
				entityId: updated.id,
				entityDisplay: updated.instrumentNo,
				action: "INSTRUMENT_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: updated,
				request: requestMeta,
			});

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
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.instrument.findUnique({ where: { id: params.id } });
			const updated = await updateInstrumentCalibration(db, params.id, body);

			if (!updated) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSTRUMENT,
					entityId: params.id,
					entityDisplay: params.id,
					action: "INSTRUMENT_CALIBRATION_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "NOT_FOUND",
					errorMessage: "Instrument not found",
					before,
					request: requestMeta,
				});
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSTRUMENT,
				entityId: updated.id,
				entityDisplay: updated.instrumentNo,
				action: "INSTRUMENT_CALIBRATION_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: updated,
				request: requestMeta,
			});

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
				async ({ db, params, body, set, user, request }) => {
					const actor = buildAuditActor(user);
					const requestMeta = buildAuditRequestMeta(request);
					const result = await createCalibrationRecord(db, params.id, user.id, body);

					if (!result.success) {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.CALIBRATION,
							entityId: params.id,
							entityDisplay: params.id,
							action: "CALIBRATION_CREATE",
							actor,
							status: "FAIL",
							errorCode: result.code,
							errorMessage: result.message,
							request: requestMeta,
							payload: { instrumentId: params.id },
						});
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					await recordAuditEvent(db, {
						entityType: AuditEntityType.CALIBRATION,
						entityId: result.data.id,
						entityDisplay: result.data.certificateNo ?? result.data.id,
						action: "CALIBRATION_CREATE",
						actor,
						status: "SUCCESS",
						before: null,
						after: result.data,
						request: requestMeta,
						payload: { instrumentId: params.id },
					});

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
				async ({ db, params, body, set, user, request }) => {
					const actor = buildAuditActor(user);
					const requestMeta = buildAuditRequestMeta(request);
					const before = await db.calibrationRecord.findUnique({
						where: { id: params.recordId },
					});
					const result = await updateCalibrationRecord(db, params.id, params.recordId, body);

					if (!result.success) {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.CALIBRATION,
							entityId: before?.id ?? params.recordId,
							entityDisplay: before?.certificateNo ?? params.recordId,
							action: "CALIBRATION_UPDATE",
							actor,
							status: "FAIL",
							errorCode: result.code,
							errorMessage: result.message,
							before,
							request: requestMeta,
							payload: { instrumentId: params.id },
						});
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					await recordAuditEvent(db, {
						entityType: AuditEntityType.CALIBRATION,
						entityId: result.data.id,
						entityDisplay: result.data.certificateNo ?? result.data.id,
						action: "CALIBRATION_UPDATE",
						actor,
						status: "SUCCESS",
						before,
						after: result.data,
						request: requestMeta,
						payload: { instrumentId: params.id },
					});

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
				async ({ db, params, query, set, user, request }) => {
					const actor = buildAuditActor(user);
					const requestMeta = buildAuditRequestMeta(request);
					const before = await db.calibrationRecord.findUnique({
						where: { id: params.recordId },
					});
					const result = await deleteCalibrationRecord(db, params.id, params.recordId, query);

					if (!result.success) {
						await recordAuditEvent(db, {
							entityType: AuditEntityType.CALIBRATION,
							entityId: before?.id ?? params.recordId,
							entityDisplay: before?.certificateNo ?? params.recordId,
							action: "CALIBRATION_DELETE",
							actor,
							status: "FAIL",
							errorCode: result.code,
							errorMessage: result.message,
							before,
							request: requestMeta,
							payload: { instrumentId: params.id },
						});
						set.status = result.status ?? 400;
						return { code: result.code, message: result.message };
					}

					await recordAuditEvent(db, {
						entityType: AuditEntityType.CALIBRATION,
						entityId: before?.id ?? params.recordId,
						entityDisplay: before?.certificateNo ?? params.recordId,
						action: "CALIBRATION_DELETE",
						actor,
						status: "SUCCESS",
						before,
						after: null,
						request: requestMeta,
						payload: { instrumentId: params.id },
					});

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
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const deleted = await deleteInstrument(db, params.id);

			if (!deleted) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.INSTRUMENT,
					entityId: params.id,
					entityDisplay: params.id,
					action: "INSTRUMENT_DELETE",
					actor,
					status: "FAIL",
					errorCode: "NOT_FOUND",
					errorMessage: "Instrument not found",
					request: requestMeta,
				});
				set.status = 404;
				return { code: "NOT_FOUND", message: "Instrument not found" };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.INSTRUMENT,
				entityId: deleted.id,
				entityDisplay: deleted.instrumentNo,
				action: "INSTRUMENT_DELETE",
				actor,
				status: "SUCCESS",
				before: deleted,
				after: null,
				request: requestMeta,
			});

			return deleted;
		},
		{
			isAuth: true,
			params: instrumentParamsSchema,
			detail: { tags: ["Instruments"] },
		},
	);
