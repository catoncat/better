import { Elysia } from "elysia";
import { defectRoutes, reworkRoutes } from "./defect/routes";
import { executionModule } from "./execution/routes";
import { faiRoutes } from "./fai/routes";
import { integrationModule } from "./integration/routes";
import { lineModule } from "./line/routes";
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
	.use(lineModule)
	.use(workOrderModule)
	.use(runModule)
	.use(readinessModule)
	.use(readinessExceptionsModule)
	.use(routingModule)
	.use(executionModule)
	.use(stationModule)
	.use(traceModule)
	.use(faiRoutes)
	.use(defectRoutes)
	.use(reworkRoutes);
