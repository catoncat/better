import * as Prismabox from "@better-app/db/prismabox";
import { t } from "elysia";

export const workOrderReceiveSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.Optional(t.String()),
	sourceSystem: t.Optional(t.String()),
	pickStatus: t.Optional(t.String()), // MES 领料状态 (手动工单用)
	dueDate: t.Optional(t.String({ format: "date-time" })),
	status: t.Optional(t.String()), // WorkOrderStatus
	erpStatus: t.Optional(t.String()),
	erpPickStatus: t.Optional(t.String()),
	meta: t.Optional(t.Any()),
});

export const workOrderResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.WorkOrderPlain,
});

export const workOrderErrorResponseSchema = t.Object({
	ok: t.Boolean(),
	error: t.Object({
		code: t.String(),
		message: t.String(),
	}),
});

export const workOrderReleaseSchema = t.Object({
	lineCode: t.Optional(t.String()),
	stationGroupCode: t.Optional(t.String()),
});

export const runCreateSchema = t.Object({
	lineCode: t.String(),
	shiftCode: t.Optional(t.String()),
	changeoverNo: t.Optional(t.String()),
});

export const workOrderListQuerySchema = t.Object({
	page: t.Optional(t.Numeric({ default: 1 })),
	pageSize: t.Optional(t.Numeric({ default: 30 })),
	status: t.Optional(t.String()),
	erpPickStatus: t.Optional(t.String()),
	routingId: t.Optional(t.String()), // comma-separated routing IDs
	search: t.Optional(t.String()),
	sort: t.Optional(t.String()),
});

export const workOrderUpdatePickStatusSchema = t.Object({
	pickStatus: t.String(), // "1" | "2" | "3" | "4"
});
