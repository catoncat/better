import { createHash } from "node:crypto";
import type { Prisma } from "@better-app/db";
import type { ServiceResult } from "../../../types/service-result";
import { getTimezoneOffsetMinutes } from "../../../utils/datetime";

// ==========================================
// JSON Serialization
// ==========================================

export const safeJsonStringify = (value: unknown): string =>
	JSON.stringify(value, (_key, val) => (val === undefined ? null : val));

export const hashPayload = (value: unknown): string =>
	createHash("sha256").update(safeJsonStringify(value)).digest("hex");

export const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(safeJsonStringify(value)) as Prisma.InputJsonValue;

// ==========================================
// Error Handling
// ==========================================

export const serializeError = (error: unknown): Record<string, unknown> => {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	if (error && typeof error === "object") return error as Record<string, unknown>;
	return { message: String(error ?? "Unknown error") };
};

export const getServiceErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean; message?: string };
		if (value.success === false && typeof value.message === "string") return value.message;
	}
	return fallback;
};

export const toServiceError = (
	error: unknown,
	fallbackCode: string,
	fallbackMessage: string,
): ServiceResult<never> => {
	if (error && typeof error === "object" && "success" in error) {
		const value = error as { success?: boolean };
		if (value.success === false) {
			return error as ServiceResult<never>;
		}
	}
	return { success: false, code: fallbackCode, message: fallbackMessage };
};

// ==========================================
// Date/Time Utilities
// ==========================================

export const parseDate = (value?: string | null): Date | null => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

export const toIso = (value: string): string => {
	if (!value) return "";
	const normalized = value.replace(" ", "T");
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString();
};

export const getLatestTimestamp = (values: Array<string | null | undefined>): Date | null => {
	let latest: Date | null = null;
	for (const value of values) {
		const parsed = parseDate(value);
		if (!parsed) continue;
		if (!latest || parsed > latest) latest = parsed;
	}
	return latest;
};

export const formatKingdeeDate = (value: string): string => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.valueOf())) return value;
	const offsetMinutes = getTimezoneOffsetMinutes();
	const local = new Date(parsed.getTime() + offsetMinutes * 60_000);
	const pad = (num: number) => String(num).padStart(2, "0");
	return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(
		local.getUTCHours(),
	)}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
};

export const buildSinceFilter = (field: string, since?: string | null): string => {
	if (!since) return "";
	return `${field} >= '${formatKingdeeDate(since)}'`;
};

/**
 * Build a date range filter for Kingdee queries.
 * Used to limit sync to recent data (e.g., last 3 months).
 */
export const buildDateRangeFilter = (
	field: string,
	since?: string | null,
	monthsBack?: number,
): string => {
	const conditions: string[] = [];

	// Add since filter if provided
	if (since) {
		conditions.push(`${field} >= '${formatKingdeeDate(since)}'`);
	}

	// Add months-back filter if provided
	if (monthsBack && monthsBack > 0) {
		const minDate = new Date();
		minDate.setMonth(minDate.getMonth() - monthsBack);
		const minDateStr = formatKingdeeDate(minDate.toISOString());
		// Only add if no since or since is older than minDate
		if (!since || new Date(since) < minDate) {
			// Replace or add the minimum date constraint
			if (conditions.length > 0) {
				// since exists but is older, use minDate instead
				conditions[0] = `${field} >= '${minDateStr}'`;
			} else {
				conditions.push(`${field} >= '${minDateStr}'`);
			}
		}
	}

	return conditions.join(" AND ");
};

// ==========================================
// Cell Parsing (for Kingdee row data)
// ==========================================

export const getCell = (row: unknown[], index: number): string => {
	if (!Array.isArray(row)) return "";
	const val = row[index];
	if (val === null || val === undefined) return "";
	return String(val);
};

export const toNumber = (value: string): number => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export const toBool = (value: string): boolean => {
	const normalized = value.trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
};

// ==========================================
// Cursor Computation (B3 Fix)
// ==========================================

/**
 * Computes the next sync timestamp.
 * B3 Fix: When no items are returned, do not advance cursor to current time.
 */
export const computeNextSyncAt = (
	items: Array<{ updatedAt?: string }>,
	currentSince: string | null,
): Date | null => {
	const latest = getLatestTimestamp(items.map((i) => i.updatedAt));

	if (latest) {
		// Has data: use the latest updatedAt
		return latest;
	}

	if (currentSince) {
		// No data: keep the original since (do not advance)
		return new Date(currentSince);
	}

	// First sync with no data: do not update cursor
	return null;
};
