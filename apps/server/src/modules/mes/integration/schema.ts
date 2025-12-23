import { t } from "elysia";

export const integrationReceiveWorkOrderSchema = t.Object({
	woNo: t.String(),
	productCode: t.String(),
	plannedQty: t.Number(),
	routingCode: t.Optional(t.String()),
	reviewStatus: t.Optional(t.String()),
	dueDate: t.Optional(t.String({ format: "date-time" })),
	meta: t.Optional(t.Any()),
});