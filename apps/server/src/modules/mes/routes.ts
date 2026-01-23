import { Elysia } from "elysia";
import { bakeRecordRoutes } from "./bake/routes";
import { dataCollectionSpecModule } from "./data-collection-spec/routes";
import { defectRoutes, reworkRoutes } from "./defect/routes";
import { executionModule } from "./execution/routes";
import { faiRoutes } from "./fai/routes";
import { integrationModule } from "./integration/routes";
import { lineModule } from "./line/routes";
import {
	feederSlotModule,
	lineLoadingModule,
	loadingModule,
	runLoadingModule,
	slotMappingModule,
} from "./loading/routes";
import { masterDataModule } from "./master-data/routes";
import { operationModule } from "./operation/routes";
import { mrbRoutes } from "./oqc/mrb-routes";
import { oqcRoutes } from "./oqc/routes";
import { samplingRuleRoutes } from "./oqc/sampling-rule-routes";
import { readinessExceptionsModule, readinessModule } from "./readiness/routes";
import { reflowProfileModuleRoutes } from "./reflow-profile/routes";
import { routingModule } from "./routing/routes";
import { runModule } from "./run/routes";
import { smtBasicRoutes } from "./smt-basic/routes";
import { coldStorageTemperatureRoutes, solderPasteUsageRoutes } from "./solder-paste/routes";
import { stationModule } from "./station/routes";
import { timeRuleRoutes } from "./time-rule/routes";
import { traceModule } from "./trace/routes";
import { workOrderModule } from "./work-order/routes";

export const mesModule = new Elysia()
	.get("/health", () => ({ status: "mes-ok" }), {
		detail: { tags: ["MES - Health"] },
	})
	.use(integrationModule)
	.use(masterDataModule)
	.use(loadingModule)
	.use(runLoadingModule)
	.use(lineLoadingModule)
	.use(feederSlotModule)
	.use(slotMappingModule)
	.use(lineModule)
	.use(workOrderModule)
	.use(runModule)
	.use(readinessModule)
	.use(readinessExceptionsModule)
	.use(dataCollectionSpecModule)
	.use(operationModule)
	.use(routingModule)
	.use(executionModule)
	.use(stationModule)
	.use(traceModule)
	.use(bakeRecordRoutes)
	.use(solderPasteUsageRoutes)
	.use(coldStorageTemperatureRoutes)
	.use(smtBasicRoutes)
	.use(reflowProfileModuleRoutes)
	.use(faiRoutes)
	.use(defectRoutes)
	.use(reworkRoutes)
	// OQC & MRB (M2)
	.use(oqcRoutes)
	.use(samplingRuleRoutes)
	.use(mrbRoutes)
	// Time Rules (SMT Gap Phase 2)
	.use(timeRuleRoutes);
