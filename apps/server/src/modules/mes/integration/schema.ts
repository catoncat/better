import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

export const integrationReceiveWorkOrderSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.Optional(t.String()),
	sourceSystem: t.Optional(t.String()),
	reviewStatus: t.Optional(t.String()),
	dueDate: t.Optional(t.String({ format: "date-time" })),
	meta: t.Optional(t.Any()),
});

export const integrationWorkOrderResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.WorkOrderPlain,
});

export const erpRouteSyncQuerySchema = t.Object({
	since: t.Optional(t.String()),
	startRow: t.Optional(t.Numeric()),
	limit: t.Optional(t.Numeric()),
});

const integrationCursorSchema = t.Object({
	nextSyncAt: t.Optional(t.String({ format: "date-time" })),
	hasMore: t.Boolean(),
});

const integrationEnvelopeSchema = (itemsSchema: ReturnType<typeof t.Array>) =>
	t.Object({
		ok: t.Boolean(),
		data: t.Object({
			sourceSystem: t.String(),
			entityType: t.String(),
			cursor: integrationCursorSchema,
			items: itemsSchema,
		}),
	});

const erpRouteHeaderSchema = t.Object({
	headId: t.String(),
	routeNo: t.String(),
	routeName: t.String(),
	productCode: t.String(),
	productName: t.String(),
	useOrgCode: t.String(),
	createOrgCode: t.String(),
	effectiveFrom: t.String(),
	effectiveTo: t.String(),
	routeSource: t.String(),
	bomCode: t.String(),
	modifiedAt: t.String({ format: "date-time" }),
});

const erpRouteStepSchema = t.Object({
	stepNo: t.Number(),
	processCode: t.String(),
	processName: t.String(),
	workCenterCode: t.String(),
	workCenterName: t.String(),
	departmentCode: t.String(),
	departmentName: t.String(),
	description: t.String(),
	keyOper: t.Boolean(),
	firstPieceInspect: t.Boolean(),
	processRecordStation: t.Boolean(),
	qualityInspectStation: t.Boolean(),
});

const erpRouteSchema = t.Object({
	header: erpRouteHeaderSchema,
	steps: t.Array(erpRouteStepSchema),
});

const erpWorkOrderSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.String(),
	status: t.String(),
	dueDate: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

const erpMaterialSchema = t.Object({
	materialCode: t.String(),
	name: t.String(),
	category: t.String(),
	unit: t.String(),
	model: t.String(),
	updatedAt: t.String({ format: "date-time" }),
});

const erpBomSchema = t.Object({
	parentCode: t.String(),
	childCode: t.String(),
	qty: t.Number(),
	unit: t.String(),
	updatedAt: t.String({ format: "date-time" }),
});

const erpWorkCenterSchema = t.Object({
	workCenterCode: t.String(),
	name: t.String(),
	departmentCode: t.String(),
	departmentName: t.String(),
	updatedAt: t.String({ format: "date-time" }),
});

const tpmEquipmentSchema = t.Object({
	equipmentCode: t.String(),
	name: t.String(),
	status: t.String(),
	workshopCode: t.String(),
	location: t.String(),
	updatedAt: t.String({ format: "date-time" }),
});

const tpmStatusLogSchema = t.Object({
	equipmentCode: t.String(),
	status: t.String(),
	reason: t.Union([t.String(), t.Null()]),
	startedAt: t.String({ format: "date-time" }),
	endedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});

const tpmMaintenanceTaskSchema = t.Object({
	taskNo: t.String(),
	equipmentCode: t.String(),
	type: t.String(),
	status: t.String(),
	scheduledDate: t.String(),
	startTime: t.String({ format: "date-time" }),
	completedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});

export const erpRoutePullResponseSchema = integrationEnvelopeSchema(t.Array(erpRouteSchema));
export const erpWorkOrderPullResponseSchema = integrationEnvelopeSchema(t.Array(erpWorkOrderSchema));
export const erpMaterialPullResponseSchema = integrationEnvelopeSchema(t.Array(erpMaterialSchema));
export const erpBomPullResponseSchema = integrationEnvelopeSchema(t.Array(erpBomSchema));
export const erpWorkCenterPullResponseSchema = integrationEnvelopeSchema(t.Array(erpWorkCenterSchema));
export const tpmEquipmentPullResponseSchema = integrationEnvelopeSchema(t.Array(tpmEquipmentSchema));
export const tpmStatusLogPullResponseSchema = integrationEnvelopeSchema(t.Array(tpmStatusLogSchema));
export const tpmMaintenanceTaskPullResponseSchema = integrationEnvelopeSchema(t.Array(tpmMaintenanceTaskSchema));
