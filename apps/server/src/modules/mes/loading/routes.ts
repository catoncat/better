import { AuditEntityType } from "@better-app/db";
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { Permission, permissionPlugin } from "../../../plugins/permission";
import { prismaPlugin } from "../../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../../audit/service";
import {
	errorResponseSchema,
	feederSlotCreateBodySchema,
	feederSlotResponseSchema,
	feederSlotsResponseSchema,
	feederSlotUpdateBodySchema,
	lineIdParamSchema,
	loadingExpectationsResponseSchema,
	loadingRecordsResponseSchema,
	loadSlotTableResponseSchema,
	replaceLoadingBodySchema,
	runNoParamSchema,
	slotIdParamSchema,
	slotMappingCreateBodySchema,
	slotMappingIdParamSchema,
	slotMappingQuerySchema,
	slotMappingResponseSchema,
	slotMappingsResponseSchema,
	slotMappingUpdateBodySchema,
	unlockSlotBodySchema,
	verifyLoadingBodySchema,
	verifyLoadingResponseSchema,
} from "./schema";
import {
	createFeederSlot,
	createSlotMaterialMapping,
	deleteFeederSlot,
	deleteSlotMaterialMapping,
	getFeederSlots,
	getRunLoadingExpectations,
	getRunLoadingRecords,
	listSlotMaterialMappings,
	loadSlotTable,
	replaceLoading,
	unlockSlot,
	updateFeederSlot,
	updateSlotMaterialMapping,
	verifyLoading,
} from "./service";

export const loadingModule = new Elysia({ prefix: "/loading" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.post(
		"/verify",
		async ({ db, body, set, user, request }) => {
			const operatorId = body.operatorId ?? user?.id ?? null;
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await verifyLoading(db, {
				runNo: body.runNo,
				slotCode: body.slotCode,
				materialLotBarcode: body.materialLotBarcode,
				operatorId: operatorId ?? "",
				packageQty: body.packageQty,
				reviewedBy: body.reviewedBy,
			});
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.MATERIAL_USE,
					entityId: body.runNo,
					entityDisplay: `Run ${body.runNo} loading`,
					action: "LOADING_VERIFY",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			if (!result.data.isIdempotent) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.MATERIAL_USE,
					entityId: result.data.id,
					entityDisplay: `Loading ${result.data.id}`,
					action: "LOADING_VERIFY",
					actor,
					status: "SUCCESS",
					after: result.data,
					request: requestMeta,
					payload: body,
				});
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VERIFY,
			body: verifyLoadingBodySchema,
			response: {
				200: verifyLoadingResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Verify loading" },
		},
	)
	.post(
		"/replace",
		async ({ db, body, set, user, request }) => {
			const operatorId = body.operatorId ?? user?.id ?? null;
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await replaceLoading(db, {
				runNo: body.runNo,
				slotCode: body.slotCode,
				newMaterialLotBarcode: body.newMaterialLotBarcode,
				operatorId: operatorId ?? "",
				reason: body.reason,
				packageQty: body.packageQty,
				reviewedBy: body.reviewedBy,
			});
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.MATERIAL_USE,
					entityId: body.runNo,
					entityDisplay: `Run ${body.runNo} loading replace`,
					action: "LOADING_REPLACE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.MATERIAL_USE,
				entityId: result.data.id,
				entityDisplay: `Loading ${result.data.id}`,
				action: "LOADING_REPLACE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VERIFY,
			body: replaceLoadingBodySchema,
			response: {
				200: verifyLoadingResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Replace loaded material" },
		},
	);

export const runLoadingModule = new Elysia({ prefix: "/runs" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.post(
		"/:runNo/loading/load-table",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await loadSlotTable(db, params.runNo);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.RUN,
					entityId: params.runNo,
					entityDisplay: `Run ${params.runNo}`,
					action: "LOADING_LOAD_TABLE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.RUN,
				entityId: params.runNo,
				entityDisplay: `Run ${params.runNo}`,
				action: "LOADING_LOAD_TABLE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VERIFY,
			params: runNoParamSchema,
			response: {
				200: loadSlotTableResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Load slot expectations" },
		},
	)
	.get(
		"/:runNo/loading",
		async ({ db, params, set }) => {
			const result = await getRunLoadingRecords(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VIEW,
			params: runNoParamSchema,
			response: {
				200: loadingRecordsResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "List loading records" },
		},
	)
	.get(
		"/:runNo/loading/expectations",
		async ({ db, params, set }) => {
			const result = await getRunLoadingExpectations(db, params.runNo);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VIEW,
			params: runNoParamSchema,
			response: {
				200: loadingExpectationsResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "List loading expectations" },
		},
	);

export const lineLoadingModule = new Elysia({ prefix: "/lines" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/:lineId/feeder-slots",
		async ({ db, params, set }) => {
			const result = await getFeederSlots(db, params.lineId);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VIEW,
			params: lineIdParamSchema,
			response: {
				200: feederSlotsResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "List feeder slots" },
		},
	)
	.post(
		"/:lineId/feeder-slots",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createFeederSlot(db, params.lineId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.lineId,
					entityDisplay: `Line ${params.lineId}`,
					action: "FEEDER_SLOT_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `FeederSlot ${result.data.slotCode}`,
				action: "FEEDER_SLOT_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: lineIdParamSchema,
			body: feederSlotCreateBodySchema,
			response: {
				200: feederSlotResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Create feeder slot" },
		},
	)
	.put(
		"/:lineId/feeder-slots/:slotId",
		async ({ db, params, body, set, user, request }) => {
			const slot = await db.feederSlot.findUnique({ where: { id: params.slotId } });
			if (!slot) {
				set.status = 404;
				return { ok: false, error: { code: "SLOT_NOT_FOUND", message: "Feeder slot not found" } };
			}
			if (slot.lineId !== params.lineId) {
				set.status = 400;
				return {
					ok: false,
					error: { code: "SLOT_LINE_MISMATCH", message: "Slot does not belong to this line" },
				};
			}
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = slot;
			const result = await updateFeederSlot(db, params.slotId, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.slotId,
					entityDisplay: `FeederSlot ${params.slotId}`,
					action: "FEEDER_SLOT_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `FeederSlot ${result.data.slotCode}`,
				action: "FEEDER_SLOT_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: t.Intersect([lineIdParamSchema, slotIdParamSchema]),
			body: feederSlotUpdateBodySchema,
			response: {
				200: feederSlotResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Update feeder slot" },
		},
	)
	.delete(
		"/:lineId/feeder-slots/:slotId",
		async ({ db, params, set, user, request }) => {
			const slot = await db.feederSlot.findUnique({ where: { id: params.slotId } });
			if (!slot) {
				set.status = 404;
				return { ok: false, error: { code: "SLOT_NOT_FOUND", message: "Feeder slot not found" } };
			}
			if (slot.lineId !== params.lineId) {
				set.status = 400;
				return {
					ok: false,
					error: { code: "SLOT_LINE_MISMATCH", message: "Slot does not belong to this line" },
				};
			}
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = slot;
			const result = await deleteFeederSlot(db, params.slotId);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.slotId,
					entityDisplay: `FeederSlot ${params.slotId}`,
					action: "FEEDER_SLOT_DELETE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: params.slotId,
				entityDisplay: `FeederSlot ${params.slotId}`,
				action: "FEEDER_SLOT_DELETE",
				actor,
				status: "SUCCESS",
				before,
				request: requestMeta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: t.Intersect([lineIdParamSchema, slotIdParamSchema]),
			response: {
				200: t.Object({ ok: t.Boolean(), data: t.Object({ id: t.String() }) }),
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Delete feeder slot" },
		},
	);

export const feederSlotModule = new Elysia({ prefix: "/feeder-slots" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.post(
		"/:slotId/unlock",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const operatorId = user?.id ?? null;
			const result = await unlockSlot(db, params.slotId, operatorId ?? "", body.reason);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.slotId,
					entityDisplay: `FeederSlot ${params.slotId}`,
					action: "FEEDER_SLOT_UNLOCK",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `FeederSlot ${result.data.slotCode}`,
				action: "FEEDER_SLOT_UNLOCK",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: slotIdParamSchema,
			body: unlockSlotBodySchema,
			response: {
				200: feederSlotResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
				409: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Unlock feeder slot" },
		},
	);

export const slotMappingModule = new Elysia({ prefix: "/slot-mappings" })
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.get(
		"/",
		async ({ db, query, set }) => {
			const result = await listSlotMaterialMappings(db, {
				lineId: query.lineId,
				slotId: query.slotId,
				productCode: query.productCode,
				routingId: query.routingId,
			});
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_VIEW,
			query: slotMappingQuerySchema,
			response: {
				200: slotMappingsResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "List slot mappings" },
		},
	)
	.post(
		"/",
		async ({ db, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const result = await createSlotMaterialMapping(db, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: body.slotId,
					entityDisplay: `Slot ${body.slotId}`,
					action: "SLOT_MAPPING_CREATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `SlotMapping ${result.data.id}`,
				action: "SLOT_MAPPING_CREATE",
				actor,
				status: "SUCCESS",
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			body: slotMappingCreateBodySchema,
			response: {
				200: slotMappingResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Create slot mapping" },
		},
	)
	.put(
		"/:id",
		async ({ db, params, body, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.slotMaterialMapping.findUnique({ where: { id: params.id } });
			const result = await updateSlotMaterialMapping(db, params.id, body);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.id,
					entityDisplay: `SlotMapping ${params.id}`,
					action: "SLOT_MAPPING_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
					payload: body,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: result.data.id,
				entityDisplay: `SlotMapping ${result.data.id}`,
				action: "SLOT_MAPPING_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
				payload: body,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: slotMappingIdParamSchema,
			body: slotMappingUpdateBodySchema,
			response: {
				200: slotMappingResponseSchema,
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Update slot mapping" },
		},
	)
	.delete(
		"/:id",
		async ({ db, params, set, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await db.slotMaterialMapping.findUnique({ where: { id: params.id } });
			const result = await deleteSlotMaterialMapping(db, params.id);
			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: params.id,
					entityDisplay: `SlotMapping ${params.id}`,
					action: "SLOT_MAPPING_DELETE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: params.id,
				entityDisplay: `SlotMapping ${params.id}`,
				action: "SLOT_MAPPING_DELETE",
				actor,
				status: "SUCCESS",
				before,
				request: requestMeta,
			});
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			requirePermission: Permission.LOADING_CONFIG,
			params: slotMappingIdParamSchema,
			response: {
				200: t.Object({ ok: t.Boolean(), data: t.Object({ id: t.String() }) }),
				400: errorResponseSchema,
				404: errorResponseSchema,
			},
			detail: { tags: ["MES - Loading"], summary: "Delete slot mapping" },
		},
	);
