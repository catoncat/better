import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { prismaPlugin } from "../../plugins/prisma";
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
		async ({ db, body, user }) => {
			return saveAppBrandingConfig(db, body, user.id);
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
		async ({ db, body, user }) => {
			await saveWecomConfig(db, body, user.id);
			return { message: "Configuration saved" };
		},
		{
			isAuth: true,
			body: wecomConfigSchema,
			detail: { tags: ["System"] },
		},
	)
	.post(
		"/wecom-test",
		async ({ body }) => {
			if (!body.webhookUrl) {
				throw new Error("Webhook URL is required");
			}
			await testWecomWebhook(body.webhookUrl, body.mentionAll);
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
		async ({ body, set }) => {
			const file = body.file;
			if (!file) {
				set.status = 400;
				return { code: "NO_FILE", message: "缺少上传文件" };
			}

			if (file.size > MAX_UPLOAD_SIZE) {
				set.status = 400;
				return { code: "FILE_TOO_LARGE", message: "文件大小不能超过 50MB" };
			}

			if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
				set.status = 400;
				return { code: "UNSUPPORTED_TYPE", message: "仅支持 mp4/mov/mkv/webm/avi 视频" };
			}

			await mkdir(UPLOAD_DIR, { recursive: true });
			const ext = file.name?.split(".").pop() || "bin";
			const filename = `${Date.now()}-${randomUUID()}.${ext}`;
			const path = `${UPLOAD_DIR}/${filename}`;

			await Bun.write(path, file);

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
