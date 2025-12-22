import { treaty } from "@elysiajs/eden";
import type {
	DefinitionBase,
	Elysia,
	EphemeralType,
	MetadataBase,
	RouteBase,
	SingletonBase,
} from "elysia";
import type { App as ServerApp } from "../../../server/src/index";

type RoutesSchema = ServerApp["~Routes"];
type EdenApp = Elysia<
	string,
	SingletonBase,
	DefinitionBase,
	MetadataBase,
	RouteBase,
	EphemeralType,
	EphemeralType
> & {
	"~Routes": RoutesSchema;
};

export const client = treaty<EdenApp>(import.meta.env.VITE_SERVER_URL || window.location.origin, {
	fetch: {
		credentials: "include",
	},
});

export const api = client;
