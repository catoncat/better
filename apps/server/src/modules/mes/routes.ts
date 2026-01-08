import { Elysia } from "elysia";
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
import { mrbRoutes } from "./oqc/mrb-routes";
import { oqcRoutes } from "./oqc/routes";
import { samplingRuleRoutes } from "./oqc/sampling-rule-routes";
import { dataCollectionSpecModule } from "./data-collection-spec/routes";
import { readinessExceptionsModule, readinessModule } from "./readiness/routes";
import { routingModule } from "./routing/routes";
import { runModule } from "./run/routes";
import { stationModule } from "./station/routes";
import { traceModule } from "./trace/routes";
import { workOrderModule } from "./work-order/routes";

export const mesModule = new Elysia()
	.get("/health", () => ({ status: "mes-ok" }), {
		detail: { tags: ["MES - Health"] },
	})
	.use(integrationModule)
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
	.use(routingModule)
	.use(executionModule)
	.use(stationModule)
	.use(traceModule)
	.use(faiRoutes)
	.use(defectRoutes)
	.use(reworkRoutes)
	// OQC & MRB (M2)
	.use(oqcRoutes)
	.use(samplingRuleRoutes)
	.use(mrbRoutes);
