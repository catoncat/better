export type AuditDiffOp = {
	op: "add" | "remove" | "replace";
	path: string;
	before?: unknown;
	after?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (!value || typeof value !== "object") return false;
	if (Array.isArray(value)) return false;
	if (value instanceof Date) return false;
	return Object.getPrototypeOf(value) === Object.prototype;
};

const escapeJsonPointer = (value: string) => value.replace(/~/g, "~0").replace(/\//g, "~1");

const toJsonSafe = (value: unknown): unknown => {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "bigint") return value.toString();
	if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
	if (isPlainObject(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			result[key] = toJsonSafe(item);
		}
		return result;
	}
	return value;
};

const valuesEqual = (before: unknown, after: unknown) => {
	if (before === after) return true;
	if (typeof before !== typeof after) return false;
	if (Array.isArray(before) && Array.isArray(after)) {
		return JSON.stringify(before) === JSON.stringify(after);
	}
	if (isPlainObject(before) && isPlainObject(after)) {
		return JSON.stringify(before) === JSON.stringify(after);
	}
	return Object.is(before, after);
};

const diffObjects = (
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	path: string,
	ops: AuditDiffOp[],
) => {
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	for (const key of keys) {
		const beforeValue = before[key];
		const afterValue = after[key];
		const nextPath = `${path}/${escapeJsonPointer(key)}`;

		const beforeIsObject = isPlainObject(beforeValue);
		const afterIsObject = isPlainObject(afterValue);

		if (beforeValue === undefined && afterValue !== undefined) {
			ops.push({
				op: "add",
				path: nextPath,
				before: null,
				after: toJsonSafe(afterValue),
			});
			continue;
		}

		if (beforeValue !== undefined && afterValue === undefined) {
			ops.push({
				op: "remove",
				path: nextPath,
				before: toJsonSafe(beforeValue),
				after: null,
			});
			continue;
		}

		if (beforeIsObject && afterIsObject) {
			diffObjects(beforeValue, afterValue, nextPath, ops);
			continue;
		}

		if (valuesEqual(beforeValue, afterValue)) {
			continue;
		}

		ops.push({
			op: "replace",
			path: nextPath,
			before: toJsonSafe(beforeValue),
			after: toJsonSafe(afterValue),
		});
	}
};

export const buildAuditDiff = (before?: unknown, after?: unknown): AuditDiffOp[] => {
	const safeBefore = toJsonSafe(before) ?? null;
	const safeAfter = toJsonSafe(after) ?? null;
	const beforeIsObject = isPlainObject(safeBefore);
	const afterIsObject = isPlainObject(safeAfter);

	const ops: AuditDiffOp[] = [];
	if (beforeIsObject || afterIsObject) {
		const beforeObj = beforeIsObject ? safeBefore : {};
		const afterObj = afterIsObject ? safeAfter : {};
		diffObjects(beforeObj as Record<string, unknown>, afterObj as Record<string, unknown>, "", ops);
		return ops;
	}

	if (valuesEqual(safeBefore, safeAfter)) return ops;

	ops.push({
		op: safeBefore === null ? "add" : safeAfter === null ? "remove" : "replace",
		path: "",
		before: safeBefore,
		after: safeAfter,
	});

	return ops;
};
