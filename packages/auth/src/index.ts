import prisma from "@better-app/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { resendSendEmail } from "./resend";

const DEFAULT_APP_NAME = "Better APP";

const sendEmailVerification = async (data: {
	user: { email: string };
	url: string;
	token: string;
}) => {
	const toEmail = data.user.email;
	const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
	const appName = process.env.APP_NAME || DEFAULT_APP_NAME;

	if (!process.env.RESEND_API_KEY || !fromEmail) {
		const baseUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL;
		const isLocalBaseUrl =
			!!baseUrl &&
			(baseUrl.startsWith("http://localhost") ||
				baseUrl.startsWith("https://localhost") ||
				baseUrl.startsWith("http://127.0.0.1") ||
				baseUrl.startsWith("https://127.0.0.1"));

		if (isLocalBaseUrl || process.env.AUTH_EMAIL_DEV_FALLBACK === "true") {
			console.info(
				[
					"[better-auth] Verification email (dev fallback):",
					`to=${toEmail}`,
					`url=${data.url}`,
					`token=${data.token}`,
				].join(" "),
			);
			return;
		}

		throw new Error(
			"Email verification is enabled but RESEND_API_KEY/RESEND_FROM is missing (set them, or set AUTH_EMAIL_DEV_FALLBACK=true for local dev)",
		);
	}

	await resendSendEmail({
		from: `${appName} <${fromEmail}>`,
		to: [toEmail],
		subject: `${appName} - 验证邮箱`,
		html: [
			`<p>你正在验证邮箱：<strong>${toEmail}</strong></p>`,
			`<p><a href="${data.url}">点击这里完成验证</a></p>`,
			`<p>如果无法点击，请复制以下链接到浏览器打开：</p>`,
			`<p><code>${data.url}</code></p>`,
		].join(""),
		text: `验证邮箱：${toEmail}\n打开链接完成验证：${data.url}\n`,
	});
};

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	basePath: "/api/auth",
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
	},
	emailVerification: {
		sendVerificationEmail: async (data) => {
			await sendEmailVerification(data);
		},
	},
	advanced: {
		trustedProxyHeaders: true,
		defaultCookieAttributes: {
			sameSite: (process.env.APP_URL || process.env.BETTER_AUTH_URL || "").startsWith("https")
				? "none"
				: "lax",
			secure: (process.env.APP_URL || process.env.BETTER_AUTH_URL || "").startsWith("https"),
			httpOnly: true,
		},
	},
	plugins: [openAPI()],
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
			},
		},
		changeEmail: {
			enabled: true,
		},
	},
	baseURL: process.env.APP_URL || process.env.BETTER_AUTH_URL,
});

// OpenAPI schema extraction for Elysia integration
// Following: https://elysiajs.com/integrations/better-auth.md#openapi
let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
const getSchema = async () => {
	if (!_schema) {
		_schema = auth.api.generateOpenAPISchema();
	}
	return _schema;
};

export const BetterAuthOpenAPI = {
	getPaths: async (prefix = "/api/auth") => {
		const { paths } = await getSchema();
		const reference: typeof paths = Object.create(null);

		for (const path of Object.keys(paths)) {
			const key = prefix + path;
			const pathItem = paths[path];
			if (!pathItem) continue;

			const clonedPath: typeof pathItem = { ...pathItem };
			for (const method of Object.keys(clonedPath) as Array<keyof typeof clonedPath>) {
				const operation = clonedPath[method];
				if (operation && typeof operation === "object") {
					operation.tags = ["Better Auth"];
				}
			}

			reference[key] = clonedPath;
		}

		return reference;
	},
	components: getSchema().then(({ components }) => components),
} as const;
