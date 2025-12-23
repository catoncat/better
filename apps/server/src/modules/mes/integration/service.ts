import type { PrismaClient } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";

export const receiveWorkOrder = async (db: PrismaClient, data: any) => {
	const routing = data.routingCode
		? await db.routing.findUnique({ where: { code: data.routingCode } })
		: null;

	// TODO: Add Idempotency-Key handling if needed here.

	return await db.workOrder.upsert({
		where: { woNo: data.woNo },
		update: {
			productCode: data.productCode,
			plannedQty: data.plannedQty,
			routingId: routing?.id,
			reviewStatus: data.reviewStatus,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			meta: data.meta,
		},
		create: {
			woNo: data.woNo,
			productCode: data.productCode,
			plannedQty: data.plannedQty,
			routingId: routing?.id,
			reviewStatus: data.reviewStatus,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			meta: data.meta,
			status: WorkOrderStatus.RECEIVED,
		},
	});
};
