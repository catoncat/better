import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";

export const client = treaty<App>(import.meta.env.VITE_SERVER_URL || window.location.origin, {
	fetch: {
		credentials: "include",
	},
});

export const api = client;