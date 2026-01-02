import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

export const integrationReceiveWorkOrderSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.Optional(t.String()),
	sourceSystem: t.Optional(t.String()),
	pickStatus: t.Optional(t.String()), // MES 领料状态 (手动工单用)
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

export const tpmSyncQuerySchema = t.Object({
	since: t.Optional(t.String()),
});

export const erpMasterSyncQuerySchema = t.Object({
	since: t.Optional(t.String()),
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
	productName: t.Optional(t.String()),
	productSpec: t.Optional(t.String()),
	plannedQty: t.Number(),
	planStartDate: t.Optional(t.String({ format: "date-time" })),
	planFinishDate: t.Optional(t.String({ format: "date-time" })),
	unitCode: t.Optional(t.String()),
	unitName: t.Optional(t.String()),
	workshopCode: t.Optional(t.String()),
	workshopName: t.Optional(t.String()),
	routingCode: t.Optional(t.String()),
	routingName: t.Optional(t.String()),
	status: t.String(),
	pickStatus: t.Optional(t.String()),
	priority: t.Optional(t.String()),
	srcBillNo: t.Optional(t.String()),
	rptFinishQty: t.Optional(t.Number()),
	scrapQty: t.Optional(t.Number()),
	dueDate: t.Optional(t.String({ format: "date-time" })),
	updatedAt: t.String({ format: "date-time" }),
});

const erpMaterialSchema = t.Object({
	materialCode: t.String(),
	name: t.String(),
	category: t.String(),
	categoryCode: t.Optional(t.String()),
	unit: t.String(),
	unitCode: t.Optional(t.String()),
	model: t.String(),
	specification: t.Optional(t.String()),
	barcode: t.Optional(t.String()),
	description: t.Optional(t.String()),
	documentStatus: t.Optional(t.String()),
	forbidStatus: t.Optional(t.String()),
	isBatchManage: t.Optional(t.Boolean()),
	isKFPeriod: t.Optional(t.Boolean()),
	isProduce: t.Optional(t.Boolean()),
	isPurchase: t.Optional(t.Boolean()),
	produceUnitCode: t.Optional(t.String()),
	produceUnitName: t.Optional(t.String()),
	updatedAt: t.String({ format: "date-time" }),
});

const erpBomSchema = t.Object({
	bomCode: t.Optional(t.String()),
	parentCode: t.String(),
	parentName: t.Optional(t.String()),
	parentSpec: t.Optional(t.String()),
	childCode: t.String(),
	childName: t.Optional(t.String()),
	childSpec: t.Optional(t.String()),
	qty: t.Number(),
	denominator: t.Optional(t.Number()),
	scrapRate: t.Optional(t.Number()),
	fixScrapQty: t.Optional(t.Number()),
	isKeyComponent: t.Optional(t.Boolean()),
	issueType: t.Optional(t.String()),
	backflushType: t.Optional(t.String()),
	unit: t.String(),
	unitCode: t.Optional(t.String()),
	documentStatus: t.Optional(t.String()),
	forbidStatus: t.Optional(t.String()),
	updatedAt: t.String({ format: "date-time" }),
});

const erpWorkCenterSchema = t.Object({
	workCenterCode: t.String(),
	name: t.String(),
	departmentCode: t.String(),
	departmentName: t.String(),
	workCenterType: t.Optional(t.String()),
	description: t.Optional(t.String()),
	documentStatus: t.Optional(t.String()),
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
export const erpWorkOrderPullResponseSchema = integrationEnvelopeSchema(
	t.Array(erpWorkOrderSchema),
);
export const erpMaterialPullResponseSchema = integrationEnvelopeSchema(t.Array(erpMaterialSchema));
export const erpBomPullResponseSchema = integrationEnvelopeSchema(t.Array(erpBomSchema));
export const erpWorkCenterPullResponseSchema = integrationEnvelopeSchema(
	t.Array(erpWorkCenterSchema),
);
export const tpmEquipmentPullResponseSchema = integrationEnvelopeSchema(
	t.Array(tpmEquipmentSchema),
);
export const tpmStatusLogPullResponseSchema = integrationEnvelopeSchema(
	t.Array(tpmStatusLogSchema),
);
export const tpmMaintenanceTaskPullResponseSchema = integrationEnvelopeSchema(
	t.Array(tpmMaintenanceTaskSchema),
);

const integrationCursorStatusSchema = t.Object({
	sourceSystem: t.String(),
	entityType: t.String(),
	lastSyncAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	lastSeq: t.Union([t.String(), t.Null()]),
	meta: t.Union([t.Any(), t.Null()]),
	updatedAt: t.String({ format: "date-time" }),
});

const integrationCronStatusSchema = t.Object({
	action: t.String(),
	status: t.String(),
	createdAt: t.String({ format: "date-time" }),
	details: t.Union([t.Any(), t.Null()]),
});

const integrationSyncStatusSchema = t.Object({
	sourceSystem: t.String(),
	entityType: t.String(),
	cursor: t.Union([integrationCursorStatusSchema, t.Null()]),
	lastCron: t.Union([integrationCronStatusSchema, t.Null()]),
});

export const integrationStatusResponseSchema = t.Object({
	ok: t.Boolean(),
	data: t.Object({
		jobs: t.Array(integrationSyncStatusSchema),
	}),
});

export const integrationErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});
