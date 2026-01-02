import type { Prisma } from "@better-app/db";
import { parseDate, toJsonValue } from "../utils";
import type { ErpBomItem } from "./types";

/**
 * Apply BOM items to the database.
 * B6 Fix: Store both qty (numerator) and denominator for proper ratio calculation.
 */
export const applyBoms = async (
	tx: Prisma.TransactionClient,
	items: ErpBomItem[],
	dedupeKey: string,
): Promise<void> => {
	for (const item of items) {
		// Store raw data for audit
		await tx.erpBomRaw.create({
			data: {
				sourceSystem: "ERP",
				sourceKey: `${item.parentCode}_${item.childCode}`,
				payload: toJsonValue(item),
				dedupeKey,
			},
		});

		// B6 Fix: Calculate effective qty using denominator
		// If denominator is 0 or 1, use qty directly; otherwise compute ratio
		const effectiveQty = item.denominator > 1 ? item.qty / item.denominator : item.qty;

		const erpMeta = {
			bomCode: item.bomCode || null,
			parentName: item.parentName || null,
			parentSpec: item.parentSpec || null,
			childName: item.childName || null,
			childSpec: item.childSpec || null,
			// B6 Fix: Store both numerator and denominator for reference
			qtyNumerator: item.qty,
			qtyDenominator: item.denominator,
			scrapRate: item.scrapRate,
			fixScrapQty: item.fixScrapQty,
			isKeyComponent: item.isKeyComponent,
			issueType: item.issueType || null,
			backflushType: item.backflushType || null,
			unitCode: item.unitCode || null,
			documentStatus: item.documentStatus || null,
			forbidStatus: item.forbidStatus || null,
		};

		await tx.bomItem.upsert({
			where: { parentCode_childCode: { parentCode: item.parentCode, childCode: item.childCode } },
			update: {
				qty: effectiveQty, // B6 Fix: Use computed effective qty
				unit: item.unit,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
			create: {
				parentCode: item.parentCode,
				childCode: item.childCode,
				qty: effectiveQty, // B6 Fix: Use computed effective qty
				unit: item.unit,
				sourceUpdatedAt: parseDate(item.updatedAt),
				meta: toJsonValue({ erp: erpMeta }),
			},
		});
	}
};
