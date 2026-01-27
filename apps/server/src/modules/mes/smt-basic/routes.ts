import { AuditEntityType } from "@better-app/db";
import Elysia from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	dailyQcCreateSchema,
	dailyQcListQuerySchema,
	dailyQcListResponseSchema,
	dailyQcResponseSchema,
	dailyQcStatsQuerySchema,
	dailyQcStatsResponseSchema,
	equipmentInspectionCreateSchema,
	equipmentInspectionListQuerySchema,
	equipmentInspectionListResponseSchema,
	equipmentInspectionResponseSchema,
	errorResponseSchema,
	fixtureUsageCreateSchema,
	fixtureUsageListQuerySchema,
	fixtureUsageListResponseSchema,
	fixtureUsageResponseSchema,
	ovenProgramCreateSchema,
	ovenProgramListQuerySchema,
	ovenProgramListResponseSchema,
	ovenProgramResponseSchema,
	productionExceptionConfirmSchema,
	productionExceptionCreateSchema,
	productionExceptionIdParamSchema,
	productionExceptionListQuerySchema,
	productionExceptionListResponseSchema,
	productionExceptionResponseSchema,
	squeegeeUsageCreateSchema,
	squeegeeUsageListQuerySchema,
	squeegeeUsageListResponseSchema,
	squeegeeUsageResponseSchema,
	stencilCleaningCreateSchema,
	stencilCleaningListQuerySchema,
	stencilCleaningListResponseSchema,
	stencilCleaningResponseSchema,
	stencilUsageCreateSchema,
	stencilUsageListQuerySchema,
	stencilUsageListResponseSchema,
	stencilUsageResponseSchema,
} from "./schema";
import {
	confirmProductionExceptionRecord,
	createDailyQcRecord,
	createEquipmentInspectionRecord,
	createFixtureUsageRecord,
	createOvenProgramRecord,
	createProductionExceptionRecord,
	createSqueegeeUsageRecord,
	createStencilCleaningRecord,
	createStencilUsageRecord,
	listDailyQcRecords,
	listDailyQcStats,
	listEquipmentInspectionRecords,
	listFixtureUsageRecords,
	listOvenProgramRecords,
	listProductionExceptionRecords,
	listSqueegeeUsageRecords,
	listStencilCleaningRecords,
	listStencilUsageRecords,
} from "./service";

export const stencilUsageRoutes = new Elysia({ prefix: "/stencil-usage-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listStencilUsageRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: stencilUsageListQuerySchema,
			response: { 200: stencilUsageListResponseSchema },
			detail: { tags: ["MES - Stencil"], summary: "List stencil usage records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createStencilUsageRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.STENCIL_USAGE,
					entityId: body.stencilId,
					entityDisplay: `Stencil usage for ${body.stencilId}`,
					action: "STENCIL_USAGE_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.STENCIL_USAGE,
				entityId: result.data.id,
				entityDisplay: `Stencil usage for ${result.data.stencilId}`,
				action: "STENCIL_USAGE_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: stencilUsageCreateSchema,
			response: { 201: stencilUsageResponseSchema },
			detail: { tags: ["MES - Stencil"], summary: "Create stencil usage record" },
		},
	);

export const stencilCleaningRoutes = new Elysia({ prefix: "/stencil-cleaning-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listStencilCleaningRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: stencilCleaningListQuerySchema,
			response: { 200: stencilCleaningListResponseSchema },
			detail: { tags: ["MES - Stencil"], summary: "List stencil cleaning records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createStencilCleaningRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.STENCIL_CLEANING,
					entityId: body.stencilId,
					entityDisplay: `Stencil cleaning for ${body.stencilId}`,
					action: "STENCIL_CLEANING_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.STENCIL_CLEANING,
				entityId: result.data.id,
				entityDisplay: `Stencil cleaning for ${result.data.stencilId}`,
				action: "STENCIL_CLEANING_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: stencilCleaningCreateSchema,
			response: { 201: stencilCleaningResponseSchema },
			detail: { tags: ["MES - Stencil"], summary: "Create stencil cleaning record" },
		},
	);

export const squeegeeUsageRoutes = new Elysia({ prefix: "/squeegee-usage-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listSqueegeeUsageRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: squeegeeUsageListQuerySchema,
			response: { 200: squeegeeUsageListResponseSchema },
			detail: { tags: ["MES - Squeegee"], summary: "List squeegee usage records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createSqueegeeUsageRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SQUEEGEE_USAGE,
					entityId: body.squeegeeId,
					entityDisplay: `Squeegee usage for ${body.squeegeeId}`,
					action: "SQUEEGEE_USAGE_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SQUEEGEE_USAGE,
				entityId: result.data.id,
				entityDisplay: `Squeegee usage for ${result.data.squeegeeId}`,
				action: "SQUEEGEE_USAGE_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: squeegeeUsageCreateSchema,
			response: { 201: squeegeeUsageResponseSchema },
			detail: { tags: ["MES - Squeegee"], summary: "Create squeegee usage record" },
		},
	);

export const fixtureUsageRoutes = new Elysia({ prefix: "/fixture-usage-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listFixtureUsageRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: fixtureUsageListQuerySchema,
			response: { 200: fixtureUsageListResponseSchema },
			detail: { tags: ["MES - Fixture"], summary: "List fixture usage records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createFixtureUsageRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.FIXTURE_USAGE,
					entityId: body.fixtureId,
					entityDisplay: `Fixture usage for ${body.fixtureId}`,
					action: "FIXTURE_USAGE_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.FIXTURE_USAGE,
				entityId: result.data.id,
				entityDisplay: `Fixture usage for ${result.data.fixtureId}`,
				action: "FIXTURE_USAGE_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: fixtureUsageCreateSchema,
			response: { 201: fixtureUsageResponseSchema },
			detail: { tags: ["MES - Fixture"], summary: "Create fixture usage record" },
		},
	);

export const equipmentInspectionRoutes = new Elysia({ prefix: "/equipment-inspection-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listEquipmentInspectionRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: equipmentInspectionListQuerySchema,
			response: { 200: equipmentInspectionListResponseSchema },
			detail: { tags: ["MES - Inspection"], summary: "List equipment inspection records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createEquipmentInspectionRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.EQUIPMENT_INSPECTION,
					entityId: body.machineName,
					entityDisplay: `Equipment inspection for ${body.machineName}`,
					action: "EQUIPMENT_INSPECTION_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			const { record, exceptionRecord } = result.data;

			await recordAuditEvent(db, {
				entityType: AuditEntityType.EQUIPMENT_INSPECTION,
				entityId: record.id,
				entityDisplay: `Equipment inspection for ${record.machineName}`,
				action: "EQUIPMENT_INSPECTION_CREATE",
				actor,
				status: "SUCCESS",
				after: record,
				payload: body,
				request: meta,
			});

			if (exceptionRecord) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.PRODUCTION_EXCEPTION,
					entityId: exceptionRecord.id,
					entityDisplay: `Production exception record`,
					action: "PRODUCTION_EXCEPTION_CREATE",
					actor,
					status: "SUCCESS",
					after: exceptionRecord,
					payload: {
						source: "equipment-inspection",
						equipmentInspectionRecordId: record.id,
					},
					request: meta,
				});
			}

			set.status = 201;
			return { ok: true, data: record };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: equipmentInspectionCreateSchema,
			response: { 201: equipmentInspectionResponseSchema },
			detail: { tags: ["MES - Inspection"], summary: "Create equipment inspection record" },
		},
	);

export const ovenProgramRoutes = new Elysia({ prefix: "/oven-program-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listOvenProgramRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_VIEW,
			query: ovenProgramListQuerySchema,
			response: { 200: ovenProgramListResponseSchema },
			detail: { tags: ["MES - Oven"], summary: "List oven program records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createOvenProgramRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.OVEN_PROGRAM_RECORD,
					entityId: body.programName,
					entityDisplay: `Oven program ${body.programName}`,
					action: "OVEN_PROGRAM_RECORD_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.OVEN_PROGRAM_RECORD,
				entityId: result.data.id,
				entityDisplay: `Oven program ${result.data.programName}`,
				action: "OVEN_PROGRAM_RECORD_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.READINESS_CHECK,
			body: ovenProgramCreateSchema,
			response: { 201: ovenProgramResponseSchema },
			detail: { tags: ["MES - Oven"], summary: "Create oven program record" },
		},
	);

export const dailyQcRoutes = new Elysia({ prefix: "/daily-qc-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listDailyQcRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			query: dailyQcListQuerySchema,
			response: { 200: dailyQcListResponseSchema },
			detail: { tags: ["MES - QC"], summary: "List daily QC records" },
		},
	)
	.get(
		"/stats",
		async ({ db, query }) => {
			const result = await listDailyQcStats(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			query: dailyQcStatsQuerySchema,
			response: { 200: dailyQcStatsResponseSchema },
			detail: { tags: ["MES - QC"], summary: "Get daily QC stats" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createDailyQcRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.DAILY_QC_RECORD,
					entityId: body.jobNo ?? body.station ?? body.inspectedAt,
					entityDisplay: `Daily QC record`,
					action: "DAILY_QC_RECORD_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.DAILY_QC_RECORD,
				entityId: result.data.id,
				entityDisplay: `Daily QC record`,
				action: "DAILY_QC_RECORD_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			body: dailyQcCreateSchema,
			response: { 201: dailyQcResponseSchema },
			detail: { tags: ["MES - QC"], summary: "Create daily QC record" },
		},
	);

export const productionExceptionRoutes = new Elysia({ prefix: "/production-exception-records" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query }) => {
			const result = await listProductionExceptionRecords(db, query);
			return { ok: true, data: result };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			query: productionExceptionListQuerySchema,
			response: { 200: productionExceptionListResponseSchema },
			detail: { tags: ["MES - QC"], summary: "List production exception records" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await createProductionExceptionRecord(db, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.PRODUCTION_EXCEPTION,
					entityId: body.jobNo ?? body.issuedAt,
					entityDisplay: `Production exception record`,
					action: "PRODUCTION_EXCEPTION_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.PRODUCTION_EXCEPTION,
				entityId: result.data.id,
				entityDisplay: `Production exception record`,
				action: "PRODUCTION_EXCEPTION_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			set.status = 201;
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			body: productionExceptionCreateSchema,
			response: { 201: productionExceptionResponseSchema },
			detail: { tags: ["MES - QC"], summary: "Create production exception record" },
		},
	)
	.post(
		"/:exceptionId/confirm",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const meta = buildAuditRequestMeta(request);
			const result = await confirmProductionExceptionRecord(db, params.exceptionId, body);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.PRODUCTION_EXCEPTION,
					entityId: params.exceptionId,
					entityDisplay: `Production exception record`,
					action: "PRODUCTION_EXCEPTION_CONFIRM",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					payload: body,
					request: meta,
				});
				set.status = result.status ?? (result.code === "NOT_FOUND" ? 404 : 400);
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.PRODUCTION_EXCEPTION,
				entityId: result.data.id,
				entityDisplay: `Production exception record`,
				action: "PRODUCTION_EXCEPTION_CONFIRM",
				actor,
				status: "SUCCESS",
				after: result.data,
				payload: body,
				request: meta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.QUALITY_OQC,
			params: productionExceptionIdParamSchema,
			body: productionExceptionConfirmSchema,
			response: {
				200: productionExceptionResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - QC"], summary: "Confirm production exception record" },
		},
	);

export const smtBasicRoutes = new Elysia()
	.use(stencilUsageRoutes)
	.use(stencilCleaningRoutes)
	.use(squeegeeUsageRoutes)
	.use(fixtureUsageRoutes)
	.use(equipmentInspectionRoutes)
	.use(ovenProgramRoutes)
	.use(dailyQcRoutes)
	.use(productionExceptionRoutes);
