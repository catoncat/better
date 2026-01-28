import type { PrismaClient } from "@better-app/db";
import type { ServiceResult } from "../../types/service-result";
import { runSeed } from "../../scripts/seed";
import { runSeedDemo } from "../../scripts/seed-demo";
import { runSeedLoadingConfig } from "../../scripts/seed-loading-config";
import { runSeedDcDemo } from "../../scripts/seed-dc-demo";

export type DemoSeedMode = "append" | "overwrite";
export type DemoSeedDataset = "base" | "mgmt_demo" | "loading_config" | "data_collection";

export type DemoSeedInput = {
	mode: DemoSeedMode;
	datasets: DemoSeedDataset[];
};

export type DemoSeedResult = {
	message: string;
	mode: DemoSeedMode;
	requestedDatasets: DemoSeedDataset[];
	executedDatasets: DemoSeedDataset[];
	warnings: string[];
};

const DATASET_ORDER: DemoSeedDataset[] = [
	"base",
	"mgmt_demo",
	"loading_config",
	"data_collection",
];

const DATASET_DEPENDENCIES: Record<DemoSeedDataset, DemoSeedDataset[]> = {
	base: [],
	mgmt_demo: ["base"],
	loading_config: ["base"],
	data_collection: ["base"],
};

const datasetLabel: Record<DemoSeedDataset, string> = {
	base: "基础数据",
	mgmt_demo: "管理演示数据",
	loading_config: "上料演示配置",
	data_collection: "数据采集演示",
};

const isDemoSeedEnabled = () => process.env.ALLOW_DEMO_SEED === "true";

const hasBaseData = async (db: PrismaClient) => {
	const line = await db.line.findUnique({ where: { code: "LINE-A" }, select: { id: true } });
	const routing = await db.routing.findUnique({
		where: { code: "PCBA-STD-V1" },
		select: { id: true },
	});
	return Boolean(line && routing);
};

const normalizeDatasets = (datasets: DemoSeedDataset[]) =>
	Array.from(new Set(datasets)).filter((item) => DATASET_ORDER.includes(item));

export const runDemoSeed = async (
	db: PrismaClient,
	input: DemoSeedInput,
): Promise<ServiceResult<DemoSeedResult>> => {
	if (!isDemoSeedEnabled()) {
		return {
			success: false,
			code: "DEMO_SEED_DISABLED",
			message: "演示数据生成未启用，请设置 ALLOW_DEMO_SEED=true",
			status: 403,
		};
	}

	const requestedDatasets = normalizeDatasets(input.datasets);
	if (requestedDatasets.length === 0) {
		return {
			success: false,
			code: "DATASET_REQUIRED",
			message: "至少选择一个演示数据集",
			status: 400,
		};
	}

	if (input.mode === "append" && requestedDatasets.includes("base")) {
		return {
			success: false,
			code: "BASE_APPEND_UNSUPPORTED",
			message: "基础数据仅支持覆盖模式，请切换为覆盖后执行",
			status: 400,
		};
	}

	const warnings: string[] = [];
	const executedDatasets: DemoSeedDataset[] = [];

	const dependencies = new Set<DemoSeedDataset>();
	for (const dataset of requestedDatasets) {
		for (const dep of DATASET_DEPENDENCIES[dataset]) {
			dependencies.add(dep);
		}
	}

	if (input.mode === "append") {
		const baseReady = await hasBaseData(db);
		if (!baseReady) {
			return {
				success: false,
				code: "BASE_REQUIRED",
				message: "追加模式依赖基础数据，请先执行覆盖模式生成基础数据",
				status: 400,
			};
		}
	} else if (dependencies.size > 0 && !requestedDatasets.includes("base")) {
		warnings.push("已自动追加基础数据（覆盖模式下需要基础数据依赖）");
	}

	const shouldRun = new Set<DemoSeedDataset>(requestedDatasets);
	if (input.mode === "overwrite") {
		for (const dep of dependencies) {
			shouldRun.add(dep);
		}
	}

	for (const dataset of DATASET_ORDER) {
		if (!shouldRun.has(dataset)) continue;

		if (dataset === "base") {
			if (input.mode === "append") continue;
			await runSeed({ allowUnsafeReset: true, loadEnv: false, prisma: db });
			executedDatasets.push(dataset);
			continue;
		}

		if (dataset === "mgmt_demo") {
			await runSeedDemo({ loadEnv: false, prisma: db });
			executedDatasets.push(dataset);
			continue;
		}

		if (dataset === "loading_config") {
			await runSeedLoadingConfig({ loadEnv: false, prisma: db });
			executedDatasets.push(dataset);
			continue;
		}

		if (dataset === "data_collection") {
			await runSeedDcDemo({ loadEnv: false, prisma: db });
			executedDatasets.push(dataset);
		}
	}

	if (executedDatasets.length === 0) {
		return {
			success: false,
			code: "NO_DATASET_EXECUTED",
			message: "未执行任何演示数据集",
			status: 400,
		};
	}

	if (input.mode === "overwrite" && !requestedDatasets.includes("base")) {
		warnings.push("基础数据已执行（覆盖模式会清空并重建）");
	}

	return {
		success: true,
		data: {
			message: "演示数据生成完成",
			mode: input.mode,
			requestedDatasets,
			executedDatasets,
			warnings,
		},
	};
};

export const demoSeedDatasetLabels = (datasets: DemoSeedDataset[]) =>
	datasets.map((dataset) => datasetLabel[dataset]).filter(Boolean);
