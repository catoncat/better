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
