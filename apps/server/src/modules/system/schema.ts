import { t } from "elysia";

export const wecomConfigSchema = t.Object({
	enabled: t.Boolean(),
	webhookUrl: t.Optional(t.String()),
	mentionAll: t.Boolean(),
});

export const wecomTestSchema = t.Object({
	webhookUrl: t.Optional(t.String()),
	mentionAll: t.Boolean(),
});

export const uploadSchema = t.Object({
	file: t.File(),
});

export const appBrandingSchema = t.Object({
	appName: t.String(),
	shortName: t.String(),
});
