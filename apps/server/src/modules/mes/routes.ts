import { Elysia } from "elysia";
import { integrationModule } from "./integration/routes";
import { workOrderModule } from "./work-order/routes";
import { runModule } from "./run/routes";
import { executionModule } from "./execution/routes";
import { stationModule } from "./station/routes";

export const mesModule = new Elysia()
	.get("/health", () => ({ status: "mes-ok" }), {
		detail: { tags: ["MES - Health"] },
	})
	.use(integrationModule)
	.use(workOrderModule)
	.use(runModule)
	.use(executionModule)
	.use(stationModule);
