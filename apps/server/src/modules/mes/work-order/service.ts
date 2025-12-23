import type { PrismaClient } from "@better-app/db";
import { RunStatus, WorkOrderStatus } from "@better-app/db";
import type { Static } from "elysia";
import type {
	runCreateSchema,
	workOrderReceiveSchema,
	workOrderReleaseSchema,
} from "./schema";

type WorkOrderReceiveInput = Static<typeof workOrderReceiveSchema>;
type WorkOrderReleaseInput = Static<typeof workOrderReleaseSchema>;
type RunCreateInput = Static<typeof runCreateSchema>;

export const receiveWorkOrder = async (db: PrismaClient, data: WorkOrderReceiveInput) => {
	const routing = data.routingCode
		? await db.routing.findUnique({ where: { code: data.routingCode } })
		: null;

	return await db.$transaction(async (tx) => {
		const wo = await tx.workOrder.upsert({
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

		await tx.integrationMessage.create({
			data: {
				direction: "IN",
				system: data.sourceSystem ?? "ERP",
				businessKey: data.woNo,
				status: "SUCCESS",
				payload: data,
			},
		});

		return wo;
	});
};

export const releaseWorkOrder = async (
	db: PrismaClient,
	woNo: string,
	_data: WorkOrderReleaseInput,
) => {
	const wo = await db.workOrder.findUnique({ where: { woNo } });
	if (!wo) return { success: false, code: "WORK_ORDER_NOT_FOUND", message: "Work order not found" };

	if (wo.status !== WorkOrderStatus.RECEIVED) {
		return { success: false, code: "WORK_ORDER_NOT_RECEIVED", message: "Work order already released or in progress" };
	}

	const updated = await db.workOrder.update({
		where: { woNo },
		data: {
			status: WorkOrderStatus.RELEASED,
		},
	});

	return { success: true, data: updated };
};

export const createRun = async (db: PrismaClient, woNo: string, data: RunCreateInput) => {
	const wo = await db.workOrder.findUnique({ where: { woNo } });
	if (!wo) return { success: false, code: "WORK_ORDER_NOT_FOUND", message: "Work order not found" };
	if (wo.status !== WorkOrderStatus.RELEASED && wo.status !== WorkOrderStatus.IN_PROGRESS) {
		return { success: false, code: "WORK_ORDER_NOT_RELEASED", message: "Work order not released" };
	}

	const line = await db.line.findUnique({ where: { code: data.lineCode } });
	if (!line) return { success: false, code: "LINE_NOT_FOUND", message: "Line not found" };

	// Generate a simple run number if not provided
	const runNo = `RUN-${woNo}-${Date.now()}`;

	const run = await db.$transaction(async (tx) => {
		const created = await tx.run.create({
			data: {
				runNo,
				woId: wo.id,
				lineId: line.id,
				shiftCode: data.shiftCode,
				changeoverNo: data.changeoverNo,
				status: RunStatus.PREP,
			},
		});

		if (wo.status !== WorkOrderStatus.IN_PROGRESS) {
			await tx.workOrder.update({
				where: { woNo },
				data: { status: WorkOrderStatus.IN_PROGRESS },
			});
		}

		return created;
	});

	return { success: true, data: run };
};
