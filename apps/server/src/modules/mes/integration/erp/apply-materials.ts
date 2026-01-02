import type { Prisma } from "@better-app/db";
import { parseDate, toJsonValue } from "../utils";
import type { ErpMaterial } from "./types";

/**
 * Apply materials to the database.
 */
export const applyMaterials = async (
	tx: Prisma.TransactionClient,
	items: ErpMaterial[],
	dedupeKey: string,
): Promise<void> => {
	for (const item of items) {
		// Store raw data for audit
		await tx.erpMaterialRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: item.materialCode,
				payload: toJsonValue(item),
				dedupeKey,
			},
		});

		const erpMeta = {
			specification: item.specification || null,
			barcode: item.barcode || null,
			description: item.description || null,
			documentStatus: item.documentStatus || null,
			forbidStatus: item.forbidStatus || null,
			isBatchManage: item.isBatchManage,
			isKFPeriod: item.isKFPeriod,
			isProduce: item.isProduce,
			isPurchase: item.isPurchase,
			categoryCode: item.categoryCode || null,
			unitCode: item.unitCode || null,
			produceUnitCode: item.produceUnitCode || null,
			produceUnitName: item.produceUnitName || null,
		};

		await tx.material.upsert({
			where: { code: item.materialCode },
			update: {
				name: item.name,
				category: item.category,
				unit: item.unit,
				model: item.model,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
			create: {
				code: item.materialCode,
				name: item.name,
				category: item.category,
				unit: item.unit,
				model: item.model,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
		});
	}
};
