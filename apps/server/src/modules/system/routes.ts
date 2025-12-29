import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { AuditEntityType } from "@better-app/db";
import { Elysia, t } from "elysia";
import { Jimp } from "jimp";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
import {
	appBrandingResponseSchema,
	appBrandingSchema,
	saveConfigResponseSchema,
	systemErrorResponseSchema,
	uploadResponseSchema,
	uploadSchema,
	wecomConfigResponseSchema,
	wecomConfigSchema,
	wecomTestResponseSchema,
	wecomTestSchema,
} from "./schema";
import {
	getAppBrandingConfig,
	getWecomConfig,
	saveAppBrandingConfig,
	saveWecomConfig,
	testWecomWebhook,
} from "./service";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set([
	// Images
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	// Videos
	"video/mp4",
	"video/quicktime",
	"video/x-matroska",
	"video/webm",
	"video/x-msvideo",
]);
const UPLOAD_DIR = "public/uploads";

export const systemModule = new Elysia({
	prefix: "/system",
})
	.use(prismaPlugin)
	.use(authPlugin)
	.get(
		"/app-branding",
		async ({ db, set }) => {
			const result = await getAppBrandingConfig(db);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			response: {
				200: appBrandingResponseSchema,
				400: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/app-branding",
		async ({ db, body, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeResult = await getAppBrandingConfig(db);
			const before = beforeResult.success ? beforeResult.data : null;

			const result = await saveAppBrandingConfig(db, body, user.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "app.branding",
					entityDisplay: "app.branding",
					action: "SYSTEM_APP_BRANDING_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: "app.branding",
				entityDisplay: "app.branding",
				action: "SYSTEM_APP_BRANDING_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after: result.data,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			body: appBrandingSchema,
			response: {
				200: appBrandingResponseSchema,
				400: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.get(
		"/wecom-config",
		async ({ db, set }) => {
			const result = await getWecomConfig(db);
			if (!result.success) {
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			response: {
				200: wecomConfigResponseSchema,
				400: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-config",
		async ({ db, body, user, request, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const beforeResult = await getWecomConfig(db);
			const before = beforeResult.success ? beforeResult.data : null;

			const result = await saveWecomConfig(db, body, user.id);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "wecom_notifications",
					entityDisplay: "wecom_notifications",
					action: "SYSTEM_WECOM_CONFIG_UPDATE",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					before,
					request: requestMeta,
				});
				set.status = result.status ?? 400;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			const afterResult = await getWecomConfig(db);
			const after = afterResult.success ? afterResult.data : null;

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM_CONFIG,
				entityId: "wecom_notifications",
				entityDisplay: "wecom_notifications",
				action: "SYSTEM_WECOM_CONFIG_UPDATE",
				actor,
				status: "SUCCESS",
				before,
				after,
				request: requestMeta,
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			body: wecomConfigSchema,
			response: {
				200: saveConfigResponseSchema,
				400: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-test",
		async ({ body, user, request, db, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);

			if (!body.webhookUrl) {
				const errorCode = "WEBHOOK_URL_REQUIRED";
				const errorMessage = "Webhook URL is required";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "wecom-test",
					entityDisplay: "wecom-test",
					action: "SYSTEM_WECOM_TEST",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					request: requestMeta,
				});
				set.status = 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}

			const result = await testWecomWebhook(body.webhookUrl, body.mentionAll);

			if (!result.success) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "wecom-test",
					entityDisplay: "wecom-test",
					action: "SYSTEM_WECOM_TEST",
					actor,
					status: "FAIL",
					errorCode: result.code,
					errorMessage: result.message,
					request: requestMeta,
					payload: {
						webhookUrl: body.webhookUrl,
						mentionAll: body.mentionAll,
					},
				});
				set.status = result.status ?? 500;
				return { ok: false, error: { code: result.code, message: result.message } };
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM,
				entityId: "wecom-test",
				entityDisplay: "wecom-test",
				action: "SYSTEM_WECOM_TEST",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					webhookUrl: body.webhookUrl,
					mentionAll: body.mentionAll,
				},
			});

			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			body: wecomTestSchema,
			response: {
				200: wecomTestResponseSchema,
				400: systemErrorResponseSchema,
				500: systemErrorResponseSchema,
				502: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/upload",
		async ({ body, user, request, db, set }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const file = body.file;

			if (!file) {
				const errorCode = "NO_FILE";
				const errorMessage = "缺少上传文件";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "upload",
					entityDisplay: "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					request: requestMeta,
				});
				set.status = 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}

			if (file.size > MAX_UPLOAD_SIZE) {
				const errorCode = "FILE_TOO_LARGE";
				const errorMessage = "文件大小不能超过 50MB";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: file.name ?? "upload",
					entityDisplay: file.name ?? "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					request: requestMeta,
					payload: { filename: file.name, contentType: file.type, size: file.size },
				});
				set.status = 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}

			if (!ALLOWED_TYPES.has(file.type)) {
				const errorCode = "UNSUPPORTED_TYPE";
				const errorMessage = "不支持的文件类型";
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: file.name ?? "upload",
					entityDisplay: file.name ?? "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode,
					errorMessage,
					request: requestMeta,
					payload: { filename: file.name, contentType: file.type, size: file.size },
				});
				set.status = 400;
				return { ok: false, error: { code: errorCode, message: errorMessage } };
			}

			await mkdir(UPLOAD_DIR, { recursive: true });
			const ext = file.name?.split(".").pop() || "bin";
			const filename = `${Date.now()}-${randomUUID()}.${file.type.startsWith("image/") ? "jpg" : ext}`;
			const path = `${UPLOAD_DIR}/${filename}`;

			// 图像处理逻辑 (使用 Jimp，纯 JS 实现，兼容单文件打包)
			if (file.type.startsWith("image/")) {
				const buffer = await file.arrayBuffer();
				const image = await Jimp.read(Buffer.from(buffer));

				// 限制宽度
				if (image.width > 1024) {
					image.resize({ w: 1024 });
				}

				// 设置压缩质量并转换为 Buffer (JPEG 格式)
				const compressedBuffer = await image.getBuffer("image/jpeg", { quality: 60 });
				await Bun.write(path, compressedBuffer);
			} else {
				await Bun.write(path, file);
			}

			await recordAuditEvent(db, {
				entityType: AuditEntityType.SYSTEM,
				entityId: filename,
				entityDisplay: filename,
				action: "SYSTEM_UPLOAD",
				actor,
				status: "SUCCESS",
				request: requestMeta,
				payload: {
					filename,
					contentType: file.type,
					size: file.size,
				},
			});

			return { ok: true, data: { url: `/api/system/uploads/${filename}` } };
		},
		{
			isAuth: true,
			body: uploadSchema,
			response: {
				200: uploadResponseSchema,
				400: systemErrorResponseSchema,
			},
			detail: { tags: ["System"] },
		},
	)
	.get(
		"/uploads/:filename",
		async ({ params: { filename }, query, set }) => {
			const filePath = `${UPLOAD_DIR}/${filename}`;
			const file = Bun.file(filePath);

			if (!(await file.exists())) {
				set.status = 404;
				return { ok: false, error: { code: "NOT_FOUND", message: "文件不存在" } };
			}

			// 强效缓存控制
			const cacheHeaders = {
				"Cache-Control": "public, max-age=31536000, immutable",
			};

			// 处理缩略图逻辑 (?w=xxx)
			const w = query.w ? Number.parseInt(query.w, 10) : 0;
			if (w > 0 && w < 1024 && filename.match(/\.(jpg|jpeg|png|webp)$/i)) {
				const thumbDir = `${UPLOAD_DIR}/thumb`;
				const thumbPath = `${thumbDir}/w${w}_${filename}`;
				const thumbFile = Bun.file(thumbPath);

				// 如果缩略图已存在，直接返回
				if (await thumbFile.exists()) {
					return new Response(thumbFile, { headers: cacheHeaders });
				}

				// 否则生成缩略图并缓存
				try {
					await mkdir(thumbDir, { recursive: true });
					const image = await Jimp.read(filePath);
					image.resize({ w });
					const buffer = await image.getBuffer("image/jpeg", { quality: 60 });
					await Bun.write(thumbPath, buffer);
					return new Response(Bun.file(thumbPath), { headers: cacheHeaders });
				} catch (err) {
					console.error("生成缩略图失败:", err);
					// 失败则降级返回原图
				}
			}

			return new Response(file, { headers: cacheHeaders });
		},
		{
			query: t.Object({
				w: t.Optional(t.String()),
			}),
			detail: { tags: ["System"] },
		},
	);
