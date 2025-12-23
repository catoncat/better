import { t } from "elysia";
import { Prismabox } from "@better-app/db";

export const workOrderReceiveSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.Optional(t.String()),
	sourceSystem: t.Optional(t.String()),
	reviewStatus: t.Optional(t.String()),
	dueDate: t.Optional(t.String({ format: "date-time" })),
	meta: t.Optional(t.Any()),
});

export const workOrderResponseSchema = t.Object({
	ok: t.Boolean(),
	data: Prismabox.WorkOrderPlain,
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

