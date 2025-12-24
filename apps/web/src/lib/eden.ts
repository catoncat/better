import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";
import { ApiError } from "./api-error";

export const client = treaty<App>(
	import.meta.env.VITE_SERVER_URL || window.location.origin,
	{
		fetch: {
			credentials: "include",
		},
	},
);

export const api = client;

/**
 * Unwraps the standard API envelope ({ ok: true, data: ... }).
 * Throws structured ApiError for both network/protocol errors and business logic errors.
 */
export function unwrap<T>(response: {
	data: { ok: boolean; data: T; error?: any } | T | null;
	error: { value?: unknown; status?: number } | null;
}): T {
	// 1. Network / Framework level error (HTTP 4xx/5xx)
	if (response.error) {
		const val = response.error.value as any;
		const status = response.error.status;

		// Try to parse Standard Error Envelope from backend
		if (val && typeof val === "object" && "ok" in val && val.ok === false && val.error) {
			const err = val.error;
			throw new ApiError(
				err.code || "UNKNOWN_ERROR",
				err.message || "An error occurred",
				err.details,
				status,
			);
		}

		// Fallback for non-envelope errors (e.g. raw 500, or simple text)
		let message = "Network response was not ok";
		if (typeof val === "string") message = val;
		if (typeof val === "object" && val?.message) message = val.message;

		throw new ApiError("NETWORK_ERROR", message, val, status);
	}

	if (!response.data) {
		throw new ApiError("NO_DATA", "No data received from server");
	}

	// 2. Business logic check (Success HTTP status, but check envelope)
	// Check for standard envelope { ok: true, data: ... }
	if (
		typeof response.data === "object" &&
		response.data !== null &&
		"ok" in response.data &&
		"data" in response.data
	) {
		const envelope = response.data as { ok: boolean; data: T; error?: any };
		
		if (!envelope.ok) {
			// This path technically shouldn't happen if backend follows standard (error should be 4xx/5xx)
			// But handles 200 OK + ok: false cases
			const err = envelope.error || {};
			throw new ApiError(
				err.code || "BUSINESS_ERROR",
				err.message || "Operation failed",
				err.details,
				200,
			);
		}
		return envelope.data;
	}

	// Fallback for legacy/non-enveloped endpoints
	return response.data as T;
}