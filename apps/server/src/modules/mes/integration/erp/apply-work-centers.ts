import type { Prisma } from "@better-app/db";
import { parseDate, toJsonValue } from "../utils";
import type { ErpWorkCenter } from "./types";

/**
 * Apply work centers to the database.
 */
export const applyWorkCenters = async (
	tx: Prisma.TransactionClient,
	items: ErpWorkCenter[],
	dedupeKey: string,
): Promise<void> => {
	for (const item of items) {
		// Store raw data for audit
		await tx.erpWorkCenterRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: item.workCenterCode,
				payload: toJsonValue(item),
				dedupeKey,
			},
		});

		const erpMeta = {
			workCenterType: item.workCenterType || null,
			description: item.description || null,
			documentStatus: item.documentStatus || null,
		};

		await tx.workCenter.upsert({
			where: { code: item.workCenterCode },
			update: {
				name: item.name,
				departmentCode: item.departmentCode,
				departmentName: item.departmentName,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
			create: {
				code: item.workCenterCode,
				name: item.name,
				departmentCode: item.departmentCode,
				departmentName: item.departmentName,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
		});
	}
};
