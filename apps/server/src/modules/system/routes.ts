import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Elysia } from "elysia";
import { AuditEntityType } from "@better-app/db";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
import { buildAuditActor, buildAuditRequestMeta, recordAuditEvent } from "../audit/service";
import { appBrandingSchema, uploadSchema, wecomConfigSchema, wecomTestSchema } from "./schema";
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
			return getAppBrandingConfig(db);
		},
		{
			isAuth: true,
			response: appBrandingSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/app-branding",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await getAppBrandingConfig(db);
			try {
				const updated = await saveAppBrandingConfig(db, body, user.id);
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "app.branding",
					entityDisplay: "app.branding",
					action: "SYSTEM_APP_BRANDING_UPDATE",
					actor,
					status: "SUCCESS",
					before,
					after: updated,
					request: requestMeta,
				});
				return updated;
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "app.branding",
					entityDisplay: "app.branding",
					action: "SYSTEM_APP_BRANDING_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "APP_BRANDING_UPDATE_FAILED",
					errorMessage: error instanceof Error ? error.message : "更新品牌配置失败",
					before,
					request: requestMeta,
				});
				throw error;
			}
		},
		{
			isAuth: true,
			body: appBrandingSchema,
			response: appBrandingSchema,
			detail: { tags: ["System"] },
		},
	)
	.get(
		"/wecom-config",
		async ({ db }) => {
			return getWecomConfig(db);
		},
		{
			isAuth: true,
			response: wecomConfigSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-config",
		async ({ db, body, user, request }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			const before = await getWecomConfig(db);
			try {
				await saveWecomConfig(db, body, user.id);
				const after = await getWecomConfig(db);
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
				return { message: "Configuration saved" };
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM_CONFIG,
					entityId: "wecom_notifications",
					entityDisplay: "wecom_notifications",
					action: "SYSTEM_WECOM_CONFIG_UPDATE",
					actor,
					status: "FAIL",
					errorCode: "WECOM_CONFIG_UPDATE_FAILED",
					errorMessage: error instanceof Error ? error.message : "保存通知配置失败",
					before,
					request: requestMeta,
				});
				throw error;
			}
		},
		{
			isAuth: true,
			body: wecomConfigSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-test",
		async ({ body, user, request, db }) => {
			const actor = buildAuditActor(user);
			const requestMeta = buildAuditRequestMeta(request);
			if (!body.webhookUrl) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "wecom-test",
					entityDisplay: "wecom-test",
					action: "SYSTEM_WECOM_TEST",
					actor,
					status: "FAIL",
					errorCode: "WEBHOOK_URL_REQUIRED",
					errorMessage: "Webhook URL is required",
					request: requestMeta,
				});
				throw new Error("Webhook URL is required");
			}
			try {
				await testWecomWebhook(body.webhookUrl, body.mentionAll);
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
			} catch (error) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "wecom-test",
					entityDisplay: "wecom-test",
					action: "SYSTEM_WECOM_TEST",
					actor,
					status: "FAIL",
					errorCode: "WECOM_TEST_FAILED",
					errorMessage: error instanceof Error ? error.message : "测试消息失败",
					request: requestMeta,
					payload: {
						webhookUrl: body.webhookUrl,
						mentionAll: body.mentionAll,
					},
				});
				throw error;
			}
			return { message: "Test message sent" };
		},
		{
			isAuth: true,
			body: wecomTestSchema,
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
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: "upload",
					entityDisplay: "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode: "NO_FILE",
					errorMessage: "缺少上传文件",
					request: requestMeta,
				});
				set.status = 400;
				return { code: "NO_FILE", message: "缺少上传文件" };
			}

			if (file.size > MAX_UPLOAD_SIZE) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: file.name ?? "upload",
					entityDisplay: file.name ?? "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode: "FILE_TOO_LARGE",
					errorMessage: "文件大小不能超过 50MB",
					request: requestMeta,
					payload: { filename: file.name, contentType: file.type, size: file.size },
				});
				set.status = 400;
				return { code: "FILE_TOO_LARGE", message: "文件大小不能超过 50MB" };
			}

			if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
				await recordAuditEvent(db, {
					entityType: AuditEntityType.SYSTEM,
					entityId: file.name ?? "upload",
					entityDisplay: file.name ?? "upload",
					action: "SYSTEM_UPLOAD",
					actor,
					status: "FAIL",
					errorCode: "UNSUPPORTED_TYPE",
					errorMessage: "仅支持 mp4/mov/mkv/webm/avi 视频",
					request: requestMeta,
					payload: { filename: file.name, contentType: file.type, size: file.size },
				});
				set.status = 400;
				return { code: "UNSUPPORTED_TYPE", message: "仅支持 mp4/mov/mkv/webm/avi 视频" };
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

			return { url: `/api/system/uploads/${filename}` };
		},
		{
			isAuth: true,
			body: uploadSchema,
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
