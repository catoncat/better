import path from "node:path";
import { getWebConfig } from "./config";
import type { EmbeddedWebAsset } from "./embedded-assets";
import { embeddedWebAssets as embeddedWebAssetsFallback } from "./embedded-assets";

const contentTypeByExt: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".ico": "image/x-icon",
	".txt": "text/plain; charset=utf-8",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".eot": "application/vnd.ms-fontobject",
	".wasm": "application/wasm",
};

const looksLikeFileRequest = (pathname: string) => {
	const last = pathname.split("/").pop() ?? "";
	return last.includes(".");
};

const resolveSafePath = (rootDir: string, pathname: string) => {
	const decoded = decodeURIComponent(pathname);
	const normalized = decoded.replace(/^\/+/, "");
	if (normalized.includes("..")) return null;
	return path.join(rootDir, normalized);
};

const responseWithHeaders = (
	body: unknown,
	init: ResponseInit & { headers?: Headers },
	extraHeaders: Record<string, string>,
) => {
	const headers = new Headers(init.headers);
	for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
	return new Response(body as never, { ...init, headers });
};

const cacheHeaders = (immutable: boolean) =>
	immutable
		? { "Cache-Control": "public, max-age=31536000, immutable" }
		: { "Cache-Control": "no-cache" };

let embeddedWebAssets: Record<string, EmbeddedWebAsset> | null = null;
const embeddedDecodedCache = new Map<string, Uint8Array>();

const getEmbeddedWebAssets = async (): Promise<Record<string, EmbeddedWebAsset>> => {
	if (embeddedWebAssets) return embeddedWebAssets;
	try {
		const generated = await import("./embedded-assets.generated");
		embeddedWebAssets = generated.embeddedWebAssets;
	} catch {
		embeddedWebAssets = embeddedWebAssetsFallback;
	}
	return embeddedWebAssets;
};

const serveFromEmbedded = async (pathname: string) => {
	const assets = await getEmbeddedWebAssets();
	const asset = assets[pathname];
	if (!asset) return null;

	const cached = embeddedDecodedCache.get(pathname);
	const body = cached ?? Buffer.from(asset.base64, "base64");
	if (!cached) embeddedDecodedCache.set(pathname, body);
	return responseWithHeaders(
		body,
		{ status: 200 },
		{ "Content-Type": asset.contentType, ...cacheHeaders(!!asset.immutable) },
	);
};

const serveFromDir = async (dir: string, pathname: string) => {
	const filePath = resolveSafePath(dir, pathname);
	if (!filePath) return new Response("Bad Request", { status: 400 });

	const file = Bun.file(filePath);
	if (!(await file.exists())) return null;

	const ext = path.extname(filePath).toLowerCase();
	const contentType = contentTypeByExt[ext] ?? "application/octet-stream";
	const immutable = pathname.startsWith("/assets/") && !pathname.endsWith(".map");

	return responseWithHeaders(
		file,
		{ status: 200 },
		{ "Content-Type": contentType, ...cacheHeaders(immutable) },
	);
};

export const serveWebRequest = async (request: Request): Promise<Response | null> => {
	const { pathname } = new URL(request.url);
	const config = getWebConfig();

	if (config.mode === "off") return null;

	const requestedPath = pathname === "/" ? "/index.html" : pathname;

	if (config.mode === "dir") {
		const direct = await serveFromDir(config.dir, requestedPath);
		if (direct) return direct;

		if (!looksLikeFileRequest(pathname)) {
			const index = await serveFromDir(config.dir, "/index.html");
			return index ?? null;
		}

		return null;
	}

	// embedded
	const direct = await serveFromEmbedded(requestedPath);
	if (direct) return direct;

	if (!looksLikeFileRequest(pathname)) {
		const index = await serveFromEmbedded("/index.html");
		if (index) return index;
		throw new Error(
			"APP_WEB_MODE=embedded is enabled but embedded assets are missing; run `bun run build:single` to generate embedded assets before compiling",
		);
	}

	return null;
};
