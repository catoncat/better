import "dotenv/config";
import { auth, BetterAuthOpenAPI } from "@better-app/auth";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import * as z from "zod";
import { auditModule } from "./modules/audit";
import { mesModule } from "./modules/mes";
import { metaModule } from "./modules/meta";
import { notificationModule } from "./modules/notifications";
import { permissionsModule } from "./modules/permissions";
import { rolesModule } from "./modules/roles";
import { systemModule } from "./modules/system";
import { usersModule } from "./modules/users";
import { auditArchiveCronPlugin } from "./plugins/audit-archive-cron";
import { authPlugin } from "./plugins/auth";
import { erpSyncCronPlugin } from "./plugins/erp-sync-cron";
import { permissionPlugin } from "./plugins/permission";
import { prismaPlugin } from "./plugins/prisma";
import { timeRuleCronPlugin } from "./plugins/time-rule-cron";
import { serveWebRequest } from "./web/serve-web";

const normalizeOrigin = (value: string | undefined) => {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
};

const allowedOrigins = new Set<string>();
const appOrigin = normalizeOrigin(process.env.APP_URL);
const corsOrigin = normalizeOrigin(process.env.CORS_ORIGIN);
const betterAuthOrigin = normalizeOrigin(process.env.BETTER_AUTH_URL);
if (appOrigin) allowedOrigins.add(appOrigin);
if (corsOrigin) allowedOrigins.add(corsOrigin);
if (betterAuthOrigin) allowedOrigins.add(betterAuthOrigin);

const getAuthOpenApi = async () => {
	// BetterAuth emits OpenAPI definitions using openapi3-ts types; cast to the OpenAPI types
	// expected by Elysia's plugin while keeping the structures intact.
	const authComponents =
		(await BetterAuthOpenAPI.components) as unknown as import("openapi-types").OpenAPIV3.ComponentsObject;
	const authPaths =
		(await BetterAuthOpenAPI.getPaths()) as unknown as import("openapi-types").OpenAPIV3.PathsObject;

	// Filter auth paths to only show what's needed
	const allowedAuthPaths = [
		"/api/auth/sign-in/email",
		"/api/auth/sign-up/email",
		"/api/auth/sign-out",
		"/api/auth/session",
	];

	const filteredAuthPaths: typeof authPaths = {};
	const httpMethods = [
		"get",
		"post",
		"put",
		"patch",
		"delete",
		"options",
		"head",
		"trace",
	] as const;
	const isReferenceObject = (
		value: unknown,
	): value is import("openapi-types").OpenAPIV3.ReferenceObject =>
		typeof value === "object" && value !== null && "$ref" in value;

	for (const [path, config] of Object.entries(authPaths)) {
		// BetterAuth openapi paths might not include the prefix if configured differently,
		// but typically they match the route. Let's check with and without prefix just in case,
		// or better, strict match if we know the output format.
		// Assuming better-auth outputs relative paths like "/sign-in/email":
		const fullPath = `/api/auth${path}`;
		if (allowedAuthPaths.includes(fullPath)) {
			// Add a tag for better organization
			const newConfig = { ...config } as import("openapi-types").OpenAPIV3.PathItemObject;
			for (const method of httpMethods) {
				const operation = newConfig[method];
				if (operation && !isReferenceObject(operation)) {
					operation.tags = ["Authentication"];
				}
			}
			filteredAuthPaths[path] = newConfig;
		}
	}

	return { authComponents, authPaths: filteredAuthPaths };
};

const api = new Elysia({ prefix: "/api", normalize: true })
	.onError(({ code, error, path, request, set }) => {
		// 记录错误日志
		const timestamp = new Date().toISOString();
		console.error(`[${timestamp}] [${code}] ${request.method} ${path}`);

		switch (code) {
			case "VALIDATION":
				// 验证错误 - 返回详细信息帮助调试
				console.error("Validation error:", error.message);
				return;

			case "NOT_FOUND":
				// 404 - 不需要详细日志
				return;

			case "PARSE":
				console.error("Parse error:", error.message);
				return;

			default:
				// 未知错误 - 打印完整堆栈
				console.error("Error:", error);
				if (error instanceof Error && error.stack) {
					console.error(error.stack);
				}
				// 生产环境隐藏内部错误详情
				if (process.env.NODE_ENV === "production") {
					set.status = 500;
					return { code: "INTERNAL_ERROR", message: "服务器内部错误" };
				}
		}
	})
	.use(
		cors({
			origin:
				allowedOrigins.size > 0
					? (request) => {
							const origin = request.headers.get("Origin");
							if (!origin) return true;
							return allowedOrigins.has(origin);
						}
					: true,
			methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.use(prismaPlugin)
	.use(authPlugin)
	.use(permissionPlugin)
	.mount(auth.handler)
	.get("/health", () => ({ status: "ok" }), {
		detail: { tags: ["System - Health"] },
	})
	.use(auditModule)
	.use(mesModule)
	.use(notificationModule)
	.use(metaModule)
	.use(permissionsModule)
	.use(rolesModule)
	.use(usersModule)
	.use(systemModule)
	.use(erpSyncCronPlugin)
	.use(auditArchiveCronPlugin)
	.use(timeRuleCronPlugin);

const getListenOptions = async () => {
	const portFromEnv = process.env.PORT ? Number(process.env.PORT) : null;
	const port = portFromEnv && Number.isFinite(portFromEnv) ? portFromEnv : 3000;
	const hostname = process.env.HOST || "0.0.0.0";

	const certPath = process.env.APP_TLS_CERT_PATH;
	const keyPath = process.env.APP_TLS_KEY_PATH;
	if ((certPath && !keyPath) || (!certPath && keyPath)) {
		throw new Error("Both APP_TLS_CERT_PATH and APP_TLS_KEY_PATH must be set together");
	}
	const hasTls = !!certPath && !!keyPath;

	return {
		port,
		hostname,
		...(hasTls
			? {
					tls: {
						cert: await Bun.file(certPath).text(),
						key: await Bun.file(keyPath).text(),
					},
				}
			: null),
	} as const;
};

const app = new Elysia({ normalize: true }).use(api).get(
	"/*",
	async ({ request }) => {
		if (request.method !== "GET" && request.method !== "HEAD")
			return new Response("Not Found", { status: 404 });
		const url = new URL(request.url);
		if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
			return api.handle(request);
		}
		const response = await serveWebRequest(request);
		return response ?? new Response("Not Found", { status: 404 });
	},
	{
		detail: {
			tags: ["Internal"],
			description: "Frontend catch-all route (internal use)",
			summary: "Internal Frontend Route",
			deprecated: true, // Mark as deprecated to de-emphasize
		},
	},
);

const start = async () => {
	const { authComponents, authPaths } = await getAuthOpenApi();

	api.use(
		openapi({
			mapJsonSchema: {
				zod: z.toJSONSchema,
			},
			documentation: {
				info: {
					title: "Better APP API",
					version: "1.0.0",
					description: "Better Management System API",
				},
				components: authComponents,
				paths: authPaths,
			},
		}),
	);

	const listenOptions = await getListenOptions();
	app.listen(listenOptions, () => {
		const scheme = "tls" in listenOptions ? "https" : "http";
		console.log(`Server is running on ${scheme}://${listenOptions.hostname}:${listenOptions.port}`);
	});
};

start().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

export type App = typeof api;
