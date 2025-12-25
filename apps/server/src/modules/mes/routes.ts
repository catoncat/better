import { Elysia } from "elysia";
import { executionModule } from "./execution/routes";
import { integrationModule } from "./integration/routes";
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
	.use(workOrderModule)
	.use(runModule)
	.use(routingModule)
	.use(executionModule)
	.use(stationModule)
	.use(traceModule);
