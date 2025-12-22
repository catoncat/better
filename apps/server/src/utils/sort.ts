export type SortDirection = "asc" | "desc";

const isSortDirection = (value: string): value is SortDirection =>
	value === "asc" || value === "desc";

const buildNestedOrderBy = (path: string, direction: SortDirection) => {
	const segments = path.split(".").filter(Boolean);
	if (segments.length === 0) return null;

	let current: unknown = direction;
	for (let i = segments.length - 1; i >= 0; i -= 1) {
		const segment = segments[i];
		if (!segment) continue;
		current = { [segment]: current };
	}
	return current as Record<string, unknown>;
};

/**
 * Parse sort query string into Prisma orderBy array.
 *
 * Format: sort=field.asc,relation.field.desc
 * - Supports dot-notation for to-one relations.
 * - Ignores unknown/invalid fields when allowlist is provided.
 */
export function parseSortOrderBy<T extends Record<string, unknown>>(
	sort: string | undefined,
	options: {
		allowedFields?: readonly string[];
		fallback: T | T[];
	},
): T[] {
	const allowed = options.allowedFields ? new Set(options.allowedFields) : null;
	const orderBy: T[] = [];

	if (sort) {
		for (const raw of sort.split(",")) {
			const part = raw.trim();
			if (!part) continue;

			const lastDot = part.lastIndexOf(".");
			if (lastDot <= 0) continue;

			const fieldPath = part.slice(0, lastDot);
			const dirRaw = part.slice(lastDot + 1).toLowerCase();
			if (!isSortDirection(dirRaw)) continue;
			if (allowed && !allowed.has(fieldPath)) continue;

			const nested = buildNestedOrderBy(fieldPath, dirRaw);
			if (nested) orderBy.push(nested as T);
		}
	}

	if (orderBy.length > 0) return orderBy;
	return Array.isArray(options.fallback) ? options.fallback : [options.fallback];
}
