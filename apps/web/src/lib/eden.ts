import { treaty } from "@elysiajs/eden";
import type { Elysia } from "elysia";
import type { App as ServerApp } from "../../../server/src/index";
import { ApiError } from "./api-error";

type EdenApp = Elysia & { "~Routes": ServerApp["~Routes"] };

export const client = treaty<EdenApp>(import.meta.env.VITE_SERVER_URL || window.location.origin, {
	fetch: {
		credentials: "include",
	},
});

export const api = client;

type ApiErrorPayload = {
	code?: string;
	message?: string;
	details?: unknown;
};

type ApiEnvelope<T> = { ok: boolean; data: T; error?: ApiErrorPayload };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Unwraps the standard API envelope ({ ok: true, data: ... }).
 * Throws structured ApiError for both network/protocol errors and business logic errors.
 */
export function unwrap<T>(response: {
	data: ApiEnvelope<T> | T | null;
	error: { value?: unknown; status?: number } | null;
}): T {
	// 1. Network / Framework level error (HTTP 4xx/5xx)
	if (response.error) {
		const val = response.error.value;
		const status = response.error.status;

		// Try to parse Standard Error Envelope from backend
		if (isRecord(val) && val.ok === false && "error" in val) {
			const err = isRecord(val.error) ? val.error : {};
			throw new ApiError(
				typeof err.code === "string" ? err.code : "UNKNOWN_ERROR",
				typeof err.message === "string" ? err.message : "An error occurred",
				"details" in err ? err.details : undefined,
				status,
			);
		}

		// Fallback for non-envelope errors (e.g. raw 500, or simple text)
		let message = "Network response was not ok";
		if (typeof val === "string") message = val;
		if (isRecord(val) && typeof val.message === "string") message = val.message;

		throw new ApiError("NETWORK_ERROR", message, val, status);
	}

	if (!response.data) {
		throw new ApiError("NO_DATA", "No data received from server");
	}

	// 2. Business logic check (Success HTTP status, but check envelope)
	// Check for standard envelope { ok: true, data: ... }
	const data = response.data as unknown;
	if (isRecord(data) && "ok" in data && "data" in data) {
		const envelope = data as ApiEnvelope<T>;

		if (!envelope.ok) {
			// This path technically shouldn't happen if backend follows standard (error should be 4xx/5xx)
			// But handles 200 OK + ok: false cases
			const err = envelope.error ?? {};
			throw new ApiError(
				typeof err.code === "string" ? err.code : "BUSINESS_ERROR",
				typeof err.message === "string" ? err.message : "Operation failed",
				err.details,
				200,
			);
		}
		return envelope.data;
	}

	// Fallback for legacy/non-enveloped endpoints
	return response.data as T;
}
