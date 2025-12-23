import { Elysia } from "elysia";
import { executionModule } from "./execution/routes";
import { integrationModule } from "./integration/routes";
import { runModule } from "./run/routes";
import { stationModule } from "./station/routes";
import { workOrderModule } from "./work-order/routes";

export const mesModule = new Elysia()
	.get("/health", () => ({ status: "mes-ok" }), {
		detail: { tags: ["MES - Health"] },
	})
	.use(integrationModule)
	.use(workOrderModule)
	.use(runModule)
	.use(executionModule)
	.use(stationModule);
