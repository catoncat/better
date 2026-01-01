import type { ServiceResult } from "../../../types/service-result";

export type KingdeeConfig = {
	baseUrl: string;
	dbId: string;
	username: string;
	appId: string;
	appSecret: string;
	lcid: number;
};

const ENV_PREFIX = "MES_ERP_KINGDEE_";

const getEnv = (key: string) => process.env[`${ENV_PREFIX}${key}`];

export const getKingdeeConfig = (): ServiceResult<KingdeeConfig> => {
	const baseUrl = getEnv("BASE_URL");
	const dbId = getEnv("DBID");
	const username = getEnv("USERNAME");
	const appId = getEnv("APPID");
	const appSecret = getEnv("APP_SECRET");
	const lcidRaw = getEnv("LCID");

	if (!baseUrl || !dbId || !username || !appId || !appSecret || !lcidRaw) {
		return {
			success: false,
			code: "KINGDEE_CONFIG_MISSING",
			message: "Kingdee config is incomplete.",
			status: 500,
		};
	}

	const lcid = Number(lcidRaw);
	if (!Number.isFinite(lcid)) {
		return {
			success: false,
			code: "KINGDEE_CONFIG_INVALID",
			message: "Kingdee LCID must be a number.",
			status: 500,
		};
	}

	return {
		success: true,
		data: {
			baseUrl,
			dbId,
			username,
			appId,
			appSecret,
			lcid,
		},
	};
};

const getSetCookieValues = (headers: Headers): string[] => {
	const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
	if (anyHeaders.getSetCookie) {
		const values = anyHeaders.getSetCookie();
		if (Array.isArray(values) && values.length) return values;
	}
	const raw = headers.get("set-cookie");
	return raw ? [raw] : [];
};

const normalizeCookies = (setCookieValues: string[]) =>
	setCookieValues
		.map((value) => value.split(";")[0]?.trim())
		.filter(Boolean)
		.join("; ");

export const kingdeeLogin = async (
	config: KingdeeConfig,
): Promise<ServiceResult<{ cookie: string }>> => {
	const url = `${config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.AuthService.LoginByAppSecret.common.kdsvc`;
	const payload = {
		format: 1,
		useragent: "ApiClient",
		rid: "1",
		parameters: JSON.stringify([
			config.dbId,
			config.username,
			config.appId,
			config.appSecret,
			config.lcid,
		]),
		timestamp: "0",
		v: "1.0",
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			return {
				success: false,
				code: "KINGDEE_LOGIN_FAILED",
				message: `Kingdee login failed: ${response.status}`,
				status: 502,
			};
		}
		const result = (await response.json()) as { LoginResultType?: number; Message?: string };
		if (result.LoginResultType !== 1) {
			return {
				success: false,
				code: "KINGDEE_LOGIN_REJECTED",
				message: result.Message ?? "Kingdee login rejected.",
				status: 502,
			};
		}
		const cookie = normalizeCookies(getSetCookieValues(response.headers));
		if (!cookie) {
			return {
				success: false,
				code: "KINGDEE_COOKIE_MISSING",
				message: "Kingdee login did not return cookies.",
				status: 502,
			};
		}
		return { success: true, data: { cookie } };
	} catch (error) {
		return {
			success: false,
			code: "KINGDEE_LOGIN_ERROR",
			message: error instanceof Error ? error.message : "Kingdee login error.",
			status: 502,
		};
	}
};

type ExecuteBillQueryInput = {
	formId: string;
	fieldKeys: string;
	filterString?: string;
	startRow?: number;
	limit?: number;
};

const extractResponseStatusError = (value: unknown) => {
	if (!value || typeof value !== "object") return null;
	if (!("ResponseStatus" in value)) return null;
	const status = (
		value as { ResponseStatus?: { IsSuccess?: boolean; Errors?: { Message?: string }[] } }
	).ResponseStatus;
	if (!status || status.IsSuccess !== false) return null;
	const message =
		status.Errors?.map((error) => error.Message)
			.filter(Boolean)
			.join("; ") || "Kingdee query rejected.";
	return message;
};

export const kingdeeExecuteBillQuery = async (
	config: KingdeeConfig,
	cookie: string,
	input: ExecuteBillQueryInput,
): Promise<ServiceResult<unknown[]>> => {
	const url = `${config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery.common.kdsvc`;
	const payload = {
		data: {
			FormId: input.formId,
			FieldKeys: input.fieldKeys,
			FilterString: input.filterString ?? "",
			OrderString: "",
			TopRowCount: 0,
			StartRow: input.startRow ?? 0,
			Limit: input.limit ?? 200,
			SubSystemId: "",
		},
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: cookie,
			},
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			return {
				success: false,
				code: "KINGDEE_QUERY_FAILED",
				message: `Kingdee query failed: ${response.status}`,
				status: 502,
			};
		}
		const result = (await response.json()) as unknown;
		if (Array.isArray(result)) {
			const firstRow = result[0];
			const firstValue = Array.isArray(firstRow) ? firstRow[0] : firstRow;
			const errorMessage =
				extractResponseStatusError(firstValue) ??
				extractResponseStatusError(
					(firstValue as { Result?: unknown } | undefined)?.Result ?? null,
				);
			if (errorMessage) {
				return {
					success: false,
					code: "KINGDEE_QUERY_REJECTED",
					message: errorMessage,
					status: 502,
				};
			}
			return { success: true, data: result };
		}
		if (result && typeof result === "object" && "Result" in result) {
			const resultValue = (result as { Result?: unknown }).Result;
			const errorMessage = extractResponseStatusError(resultValue ?? result);
			if (errorMessage) {
				return {
					success: false,
					code: "KINGDEE_QUERY_REJECTED",
					message: errorMessage,
					status: 502,
				};
			}
			const rows = Array.isArray(resultValue) ? resultValue : [];
			return { success: true, data: rows };
		}
		return { success: true, data: [] };
	} catch (error) {
		return {
			success: false,
			code: "KINGDEE_QUERY_ERROR",
			message: error instanceof Error ? error.message : "Kingdee query error.",
			status: 502,
		};
	}
};

type ViewInput = {
	CreateOrgId?: number;
	Number?: string;
	Id?: string;
};

export const kingdeeView = async (
	config: KingdeeConfig,
	cookie: string,
	formId: string,
	input: ViewInput,
): Promise<ServiceResult<Record<string, unknown>>> => {
	const url = `${config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.View.common.kdsvc`;
	const payload = {
		format: 1,
		useragent: "ApiClient",
		rid: "1",
		parameters: JSON.stringify([
			formId,
			JSON.stringify({
				CreateOrgId: input.CreateOrgId ?? 0,
				Number: input.Number ?? "",
				Id: input.Id ?? "",
			}),
		]),
		timestamp: "0",
		v: "1.0",
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: cookie,
			},
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			return {
				success: false,
				code: "KINGDEE_VIEW_FAILED",
				message: `Kingdee view failed: ${response.status}`,
				status: 502,
			};
		}
		const result = (await response.json()) as unknown;
		if (result && typeof result === "object" && "Result" in result) {
			const resultValue = (result as { Result?: unknown }).Result;
			const errorMessage = extractResponseStatusError(resultValue ?? result);
			if (errorMessage) {
				return {
					success: false,
					code: "KINGDEE_VIEW_REJECTED",
					message: errorMessage,
					status: 502,
				};
			}
			if (resultValue && typeof resultValue === "object" && "Result" in resultValue) {
				const model = (resultValue as { Result?: unknown }).Result;
				return { success: true, data: model as Record<string, unknown> };
			}
			return { success: true, data: resultValue as Record<string, unknown> };
		}
		return {
			success: false,
			code: "KINGDEE_VIEW_INVALID",
			message: "Kingdee view returned invalid response.",
			status: 502,
		};
	} catch (error) {
		return {
			success: false,
			code: "KINGDEE_VIEW_ERROR",
			message: error instanceof Error ? error.message : "Kingdee view error.",
			status: 502,
		};
	}
};
