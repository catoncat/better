import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Elysia, status } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
import {
	appBrandingResponseSchema,
	appBrandingSchema,
	saveConfigResponseSchema,
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
const ALLOWED_VIDEO_TYPES = new Set([
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
		async ({ db }) => {
			const result = await getAppBrandingConfig(db);
			if (!result.success) {
				return status(result.status ?? 400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			response: appBrandingResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/app-branding",
		async ({ db, body, user, request }) => {
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
				return status(result.status ?? 400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
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
			response: appBrandingResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.get(
		"/wecom-config",
		async ({ db }) => {
			const result = await getWecomConfig(db);
			if (!result.success) {
				return status(result.status ?? 400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
			}
			return { ok: true, data: result.data };
		},
		{
			isAuth: true,
			response: wecomConfigResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-config",
		async ({ db, body, user, request }) => {
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
				return status(result.status ?? 400, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
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
			response: saveConfigResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-test",
		async ({ body, user, request, db }) => {
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
				return status(400, {
					ok: false,
					error: { code: errorCode, message: errorMessage },
				});
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
				return status(result.status ?? 500, {
					ok: false,
					error: { code: result.code, message: result.message },
				});
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
			response: wecomTestResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/upload",
		async ({ body, set, user, request, db }) => {
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
				return status(400, {
					ok: false,
					error: { code: errorCode, message: errorMessage },
				});
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
				return status(400, {
					ok: false,
					error: { code: errorCode, message: errorMessage },
				});
			}

			if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
				const errorCode = "UNSUPPORTED_TYPE";
				const errorMessage = "仅支持 mp4/mov/mkv/webm/avi 视频";
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
				return status(400, {
					ok: false,
					error: { code: errorCode, message: errorMessage },
				});
			}

			await mkdir(UPLOAD_DIR, { recursive: true });
			const ext = file.name?.split(".").pop() || "bin";
			const filename = `${Date.now()}-${randomUUID()}.${ext}`;
			const path = `${UPLOAD_DIR}/${filename}`;

			await Bun.write(path, file);

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
			response: uploadResponseSchema,
			detail: { tags: ["System"] },
		},
	)
	.get(
		"/uploads/:filename",
		({ params: { filename } }) => {
			return Bun.file(`public/uploads/${filename}`);
		},
		{
			detail: { tags: ["System"] },
		},
	);