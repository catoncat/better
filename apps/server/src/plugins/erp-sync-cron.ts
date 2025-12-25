import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { pullErpRoutes } from "../modules/mes/integration/erp-service";

const isEnabled = process.env.MES_ERP_KINGDEE_CRON_ENABLED === "true";
const cronPattern = process.env.MES_ERP_KINGDEE_CRON_PATTERN ?? "0 */2 * * *";

export const erpSyncCronPlugin = new Elysia({
	name: "erp-sync-cron",
}).use(
	cron({
		name: "erp-route-sync",
		pattern: cronPattern,
		async run() {
			if (!isEnabled) return;
			const result = await pullErpRoutes({});
			if (!result.success) {
				console.error(`[ErpSyncCron] Failed: ${result.code} ${result.message}`);
				return;
			}
			console.log(
				`[ErpSyncCron] Pulled ${result.data.items.length} routes (hasMore=${result.data.cursor.hasMore})`,
			);
		},
		catch: true,
	}),
);
