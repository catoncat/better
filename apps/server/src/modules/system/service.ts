import type { Prisma, PrismaClient } from "@better-app/db";
import { z } from "zod";

const WECOM_CONFIG_KEY = "wecom_notifications";
const APP_BRANDING_KEY = "app.branding";

type WecomConfigValue = {
	enabled?: boolean;
	webhookUrl?: string;
	mentionAll?: boolean;
};

const wecomDefaultConfig = {
	enabled: false,
	webhookUrl: "",
	mentionAll: false,
};

const appBrandingSchema = z.object({
	appName: z.string().min(1),
	shortName: z.string().min(1),
});

export type AppBrandingConfig = z.infer<typeof appBrandingSchema>;

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

const defaultAppBranding: AppBrandingConfig = {
	appName: "Better APP",
	shortName: "Better",
};

function mergeDefaults<T>(defaults: T, overrides?: DeepPartial<T>): T {
	if (!overrides) {
		return defaults;
	}

	if (Array.isArray(defaults)) {
		return [...defaults] as T;
	}

	const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };

	for (const [key, overrideValue] of Object.entries(overrides)) {
		if (overrideValue === undefined) continue;
		const defaultValue = (defaults as Record<string, unknown>)[key];

		if (
			defaultValue &&
			overrideValue &&
			typeof defaultValue === "object" &&
			typeof overrideValue === "object" &&
			!Array.isArray(defaultValue) &&
			!Array.isArray(overrideValue)
		) {
			result[key] = mergeDefaults(defaultValue, overrideValue as DeepPartial<unknown>);
		} else {
			result[key] = overrideValue;
		}
	}

	return result as T;
}

export async function getWecomConfig(
	db: PrismaClient,
): Promise<{ enabled: boolean; webhookUrl: string; mentionAll: boolean }> {
	const config = await db.systemConfig.findUnique({
		where: { key: WECOM_CONFIG_KEY },
	});
	if (!config) {
		return wecomDefaultConfig;
	}
	const val = (config.value ?? {}) as WecomConfigValue;
	return {
		enabled: val.enabled ?? wecomDefaultConfig.enabled,
		webhookUrl: val.webhookUrl || wecomDefaultConfig.webhookUrl,
		mentionAll: val.mentionAll ?? wecomDefaultConfig.mentionAll,
	};
}

export async function saveWecomConfig(db: PrismaClient, value: WecomConfigValue, userId: string) {
	return db.systemConfig.upsert({
		where: { key: WECOM_CONFIG_KEY },
		update: {
			value,
			updatedBy: userId,
		},
		create: {
			key: WECOM_CONFIG_KEY,
			name: "企业微信通知配置",
			value,
			updatedBy: userId,
		},
	});
}

export async function testWecomWebhook(webhookUrl: string, mentionAll: boolean) {
	try {
		const content = mentionAll ? "Better APP 测试消息 (@所有人)" : "Better APP 测试消息";
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				msgtype: "text",
				text: {
					content: content,
					mentioned_list: mentionAll ? ["@all"] : [],
				},
			}),
		});
		if (!response.ok) {
			throw new Error(`企业微信 API 响应错误: ${response.status} `);
		}
		return { success: true };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "未知错误";
		throw new Error(`发送测试消息失败: ${message} `);
	}
}

export async function getAppBrandingConfig(db: PrismaClient): Promise<AppBrandingConfig> {
	const config = await db.systemConfig.findUnique({
		where: { key: APP_BRANDING_KEY },
	});

	if (!config) {
		return defaultAppBranding;
	}

	const parsed = appBrandingSchema.partial().safeParse(config.value);
	if (!parsed.success) {
		return defaultAppBranding;
	}

	return mergeDefaults(defaultAppBranding, parsed.data);
}

export async function saveAppBrandingConfig(
	db: PrismaClient,
	value: AppBrandingConfig,
	userId: string,
): Promise<AppBrandingConfig> {
	const validated = appBrandingSchema.parse(value);

	await db.systemConfig.upsert({
		where: { key: APP_BRANDING_KEY },
		update: {
			name: "应用品牌配置",
			value: validated as Prisma.InputJsonValue,
			updatedBy: userId,
		},
		create: {
			key: APP_BRANDING_KEY,
			name: "应用品牌配置",
			value: validated as Prisma.InputJsonValue,
			updatedBy: userId,
		},
	});

	return validated;
}
