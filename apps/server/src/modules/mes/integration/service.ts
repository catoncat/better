import type { Prisma, PrismaClient } from "@better-app/db";
import { WorkOrderStatus } from "@better-app/db";
import type { Static } from "elysia";
import type { integrationReceiveWorkOrderSchema } from "./schema";

type ReceiveWorkOrderInput = Omit<Static<typeof integrationReceiveWorkOrderSchema>, "meta"> & {
	meta?: unknown;
};

export const receiveWorkOrder = async (db: PrismaClient, data: ReceiveWorkOrderInput) => {
	const routing = data.routingCode
		? await db.routing.findUnique({ where: { code: data.routingCode } })
		: null;
	const meta = data.meta as Prisma.InputJsonValue | undefined;

	// TODO: Add Idempotency-Key handling if needed here.

	return await db.workOrder.upsert({
		where: { woNo: data.woNo },
		update: {
			productCode: data.productCode,
			plannedQty: data.plannedQty,
			routingId: routing?.id,
			reviewStatus: data.reviewStatus,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			meta,
		},
		create: {
			woNo: data.woNo,
			productCode: data.productCode,
			plannedQty: data.plannedQty,
			routingId: routing?.id,
			reviewStatus: data.reviewStatus,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			meta,
			status: WorkOrderStatus.RECEIVED,
		},
	});
};
