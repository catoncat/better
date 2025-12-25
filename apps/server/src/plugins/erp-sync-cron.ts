import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import { getTimezoneIana } from "../utils/datetime";
import { prisma, prismaPlugin } from "./prisma";
import { syncErpRoutes } from "../modules/mes/integration/sync-service";
import {
	syncErpBoms,
	syncErpMaterials,
	syncErpWorkCenters,
	syncErpWorkOrders,
} from "../modules/mes/integration/erp-master-sync-service";
import {
	syncTpmEquipment,
	syncTpmMaintenanceTasks,
	syncTpmStatusLogs,
} from "../modules/mes/integration/tpm-sync-service";

type SyncJobResult = {
	success: true;
	data: { payload: { items: unknown[]; cursor: { nextSyncAt?: string; hasMore: boolean } } };
} | {
	success: false;
	code: string;
	message: string;
	status?: number;
};

const integrationEnabled = process.env.MES_INTEGRATION_CRON_ENABLED === "true";

const patterns = {
	erpRoute: process.env.MES_INTEGRATION_ERP_ROUTE_CRON ?? "0 */2 * * *",
	erpWorkOrder: process.env.MES_INTEGRATION_ERP_WORK_ORDER_CRON ?? "0 */4 * * *",
	erpMaterial: process.env.MES_INTEGRATION_ERP_MATERIAL_CRON ?? "0 */6 * * *",
	erpBom: process.env.MES_INTEGRATION_ERP_BOM_CRON ?? "0 */6 * * *",
	erpWorkCenter: process.env.MES_INTEGRATION_ERP_WORK_CENTER_CRON ?? "0 */6 * * *",
	tpmEquipment: process.env.MES_INTEGRATION_TPM_EQUIPMENT_CRON ?? "0 */2 * * *",
	tpmStatusLog: process.env.MES_INTEGRATION_TPM_STATUS_LOG_CRON ?? "0 */2 * * *",
	tpmMaintenanceTask: process.env.MES_INTEGRATION_TPM_MAINTENANCE_TASK_CRON ?? "0 */4 * * *",
};

const logCron = async (action: string, status: string, details: Record<string, unknown>) => {
	await prisma.systemLog.create({
		data: {
			action,
			module: "Integration",
			status,
			details,
		},
	});
};

const runSyncJob = async (action: string, runner: () => Promise<SyncJobResult>) => {
	if (!integrationEnabled) return;
	const startedAt = new Date().toISOString();
	await logCron(action, "STARTED", { startedAt });

	try {
		const result = await runner();
		if (!result.success) {
			await logCron(action, "ERROR", {
				startedAt,
				error: result.message,
				code: result.code,
			});
			return;
		}
		await logCron(action, "SUCCESS", {
			startedAt,
			finishedAt: new Date().toISOString(),
			count: result.data.payload.items.length,
			cursor: result.data.payload.cursor,
		});
	} catch (error) {
		await logCron(action, "ERROR", {
			startedAt,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export const erpSyncCronPlugin = new Elysia({
	name: "erp-sync-cron",
})
	.use(prismaPlugin)
	.use(
		cron({
			name: "erp-route-sync",
			pattern: patterns.erpRoute,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_ERP_ROUTE_SYNC", () => syncErpRoutes(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "erp-work-order-sync",
			pattern: patterns.erpWorkOrder,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_ERP_WORK_ORDER_SYNC", () => syncErpWorkOrders(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "erp-material-sync",
			pattern: patterns.erpMaterial,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_ERP_MATERIAL_SYNC", () => syncErpMaterials(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "erp-bom-sync",
			pattern: patterns.erpBom,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_ERP_BOM_SYNC", () => syncErpBoms(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "erp-work-center-sync",
			pattern: patterns.erpWorkCenter,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_ERP_WORK_CENTER_SYNC", () => syncErpWorkCenters(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "tpm-equipment-sync",
			pattern: patterns.tpmEquipment,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_TPM_EQUIPMENT_SYNC", () => syncTpmEquipment(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "tpm-status-log-sync",
			pattern: patterns.tpmStatusLog,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_TPM_STATUS_LOG_SYNC", () => syncTpmStatusLogs(prisma, {}));
			},
		}),
	)
	.use(
		cron({
			name: "tpm-maintenance-task-sync",
			pattern: patterns.tpmMaintenanceTask,
			timezone: getTimezoneIana(),
			catch: true,
			async run() {
				await runSyncJob("CRON_TPM_MAINTENANCE_TASK_SYNC", () => syncTpmMaintenanceTasks(prisma, {}));
			},
		}),
	);
