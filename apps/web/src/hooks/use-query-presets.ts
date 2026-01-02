import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface QueryPreset<T> {
	id: string;
	name: string;
	filters: Partial<T>;
	createdAt: string;
}

interface StoredPresets<T> {
	version: 1;
	presets: QueryPreset<T>[];
}

interface UseQueryPresetsOptions {
	storageKey: string;
	sanitizeFilters?: (filters: Partial<unknown>) => Partial<unknown>;
	sortableArrayKeys?: string[];
}

interface QueryPresetsState<T> {
	presets: QueryPreset<T>[];
	activePresetId: string | null;
	savePreset: (name: string, filters: Partial<T>) => void;
	applyPreset: (presetId: string) => void;
	deletePreset: (presetId: string) => void;
	renamePreset: (presetId: string, newName: string) => void;
	updatePresetFilters: (presetId: string, filters: Partial<T>) => void;
	matchPreset: (
		filters: Partial<T>,
		allPresets: Array<{ id: string; filters: Partial<T> }>,
	) => string | null;
	clearActivePreset: () => void;
	findPresetByFilters: (filters: Partial<T>) => QueryPreset<T> | undefined;
}

function generateId(): string {
	return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStorageKey(key: string): string {
	return `query-presets:${key}`;
}

function loadFromStorage<T>(key: string): StoredPresets<T> {
	try {
		const stored = localStorage.getItem(getStorageKey(key));
		if (stored) {
			const parsed = JSON.parse(stored) as StoredPresets<T>;
			if (parsed.version === 1) {
				return parsed;
			}
		}
	} catch {
		// Ignore parse errors
	}
	return { version: 1, presets: [] };
}

function saveToStorage<T>(key: string, data: StoredPresets<T>): void {
	try {
		localStorage.setItem(getStorageKey(key), JSON.stringify(data));
	} catch {
		// Ignore storage errors
	}
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return a === b;
	if (typeof a !== "object") return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => deepEqual(item, b[i]));
	}

	if (Array.isArray(a) || Array.isArray(b)) return false;

	const aObj = a as Record<string, unknown>;
	const bObj = b as Record<string, unknown>;
	const aKeys = Object.keys(aObj);
	const bKeys = Object.keys(bObj);

	if (aKeys.length !== bKeys.length) return false;

	return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

function normalizeFilters<T>(
	filters: Partial<T>,
	sortableArrayKeys?: Set<string>,
): Partial<T> {
	const result: Partial<T> = {};
	for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
		// Skip empty values
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value) && value.length === 0) continue;

		if (Array.isArray(value)) {
			const filtered = value.filter((item) => item !== undefined && item !== null && item !== "");
			if (filtered.length === 0) continue;
			const isPrimitiveArray = filtered.every((item) =>
				["string", "number", "boolean"].includes(typeof item),
			);
			const shouldSort = Boolean(sortableArrayKeys?.has(key));
			const normalizedArray =
				isPrimitiveArray && shouldSort ? [...filtered].sort() : filtered;
			(result as Record<string, unknown>)[key] = normalizedArray;
			continue;
		}

		(result as Record<string, unknown>)[key] = value;
	}
	return result;
}

export function useQueryPresets<T>(
	options: Omit<UseQueryPresetsOptions, "sanitizeFilters"> & {
		sanitizeFilters?: (filters: Partial<T>) => Partial<T>;
	},
): QueryPresetsState<T> {
	const { storageKey, sanitizeFilters, sortableArrayKeys } = options;
	const sortableArrayKeySet = useMemo(
		() => new Set(sortableArrayKeys ?? []),
		[sortableArrayKeys],
	);

	const [presets, setPresets] = useState<QueryPreset<T>[]>([]);
	const [activePresetId, setActivePresetId] = useState<string | null>(null);

	const sanitize = useCallback(
		(filters: Partial<T>): Partial<T> => (sanitizeFilters ? sanitizeFilters(filters) : filters),
		[sanitizeFilters],
	);

	// Load from storage on mount
	useEffect(() => {
		const stored = loadFromStorage<T>(storageKey);
		setPresets(stored.presets);
	}, [storageKey]);

	// Apply optional sanitization (migrate legacy keys) when loaded or sanitizer changes.
	useEffect(() => {
		if (!sanitizeFilters) return;
		setPresets((prev) => prev.map((preset) => ({ ...preset, filters: sanitize(preset.filters) })));
	}, [sanitizeFilters, sanitize]);

	// Save to storage when presets change
	useEffect(() => {
		saveToStorage(storageKey, { version: 1, presets });
	}, [storageKey, presets]);

	// Find preset by filters
	const findPresetByFilters = useCallback(
		(filters: Partial<T>): QueryPreset<T> | undefined => {
			const normalizedFilters = normalizeFilters(sanitize(filters), sortableArrayKeySet);
			return presets.find((p) =>
				deepEqual(
					normalizeFilters(sanitize(p.filters), sortableArrayKeySet),
					normalizedFilters,
				),
			);
		},
		[presets, sanitize, sortableArrayKeySet],
	);

	const savePreset = useCallback(
		(name: string, filters: Partial<T>) => {
			const trimmedName = name.trim();
			if (!trimmedName) {
				toast.error("请输入预设名称");
				return;
			}

			const normalizedFilters = normalizeFilters(sanitize(filters), sortableArrayKeySet);

			// Check if the same filters already exist
			const existingWithSameFilters = presets.find((p) =>
				deepEqual(
					normalizeFilters(sanitize(p.filters), sortableArrayKeySet),
					normalizedFilters,
				),
			);

			if (existingWithSameFilters) {
				// Same filters exist - update the name if different
				if (existingWithSameFilters.name === trimmedName) {
					toast.info("该查询已保存");
				} else {
					setPresets((prev) =>
						prev.map((p) =>
							p.id === existingWithSameFilters.id ? { ...p, name: trimmedName } : p,
						),
					);
					toast.success(`已将「${existingWithSameFilters.name}」重命名为「${trimmedName}」`);
				}
				return;
			}

			// Check if same name exists (different filters)
			const existingWithSameName = presets.find((p) => p.name === trimmedName);
			if (existingWithSameName) {
				// Update the existing preset with new filters
				setPresets((prev) =>
					prev.map((p) =>
						p.id === existingWithSameName.id
							? { ...p, filters: normalizedFilters, createdAt: new Date().toISOString() }
							: p,
					),
				);
				toast.success(`已更新查询「${trimmedName}」`);
				return;
			}

			// Create new preset
			const newPreset: QueryPreset<T> = {
				id: generateId(),
				name: trimmedName,
				filters: normalizedFilters,
				createdAt: new Date().toISOString(),
			};

			setPresets((prev) => [...prev, newPreset]);
			toast.success("查询已保存");
		},
		[presets, sanitize, sortableArrayKeySet],
	);

	const applyPreset = useCallback((presetId: string) => {
		setActivePresetId(presetId);
	}, []);

	const clearActivePreset = useCallback(() => {
		setActivePresetId(null);
	}, []);

	const deletePreset = useCallback(
		(presetId: string) => {
			setPresets((prev) => {
				const preset = prev.find((p) => p.id === presetId);
				const filtered = prev.filter((p) => p.id !== presetId);
				if (preset) {
					toast.success(`已删除查询「${preset.name}」`);
				}
				return filtered;
			});
			if (activePresetId === presetId) {
				setActivePresetId(null);
			}
		},
		[activePresetId],
	);

	const renamePreset = useCallback((presetId: string, newName: string) => {
		const trimmedName = newName.trim();
		if (!trimmedName) {
			toast.error("请输入预设名称");
			return;
		}

		setPresets((prev) => {
			// Check if name already exists (excluding current preset)
			const existingWithName = prev.find((p) => p.name === trimmedName && p.id !== presetId);
			if (existingWithName) {
				toast.error("已存在同名预设");
				return prev;
			}

			return prev.map((p) => (p.id === presetId ? { ...p, name: trimmedName } : p));
		});
	}, []);

	const updatePresetFilters = useCallback(
		(presetId: string, filters: Partial<T>) => {
			const normalizedFilters = normalizeFilters(sanitize(filters), sortableArrayKeySet);

			setPresets((prev) => {
				const preset = prev.find((p) => p.id === presetId);
				if (!preset) return prev;

				return prev.map((p) =>
					p.id === presetId
						? { ...p, filters: normalizedFilters, createdAt: new Date().toISOString() }
						: p,
				);
			});

			const preset = presets.find((p) => p.id === presetId);
			if (preset) {
				toast.success(`已更新查询「${preset.name}」`);
			}
		},
		[presets, sanitize, sortableArrayKeySet],
	);

	const matchPreset = useCallback(
		(
			filters: Partial<T>,
			allPresets: Array<{ id: string; filters: Partial<T> }>,
		): string | null => {
			const normalizedFilters = normalizeFilters(sanitize(filters), sortableArrayKeySet);

			for (const preset of allPresets) {
				const normalizedPreset = normalizeFilters(sanitize(preset.filters), sortableArrayKeySet);
				if (deepEqual(normalizedFilters, normalizedPreset)) {
					return preset.id;
				}
			}

			return null;
		},
		[sanitize, sortableArrayKeySet],
	);

	return {
		presets,
		activePresetId,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		updatePresetFilters,
		matchPreset,
		clearActivePreset,
		findPresetByFilters,
	};
}
