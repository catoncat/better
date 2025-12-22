import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type ViewMode = "table" | "card" | "auto";
export type CardColumns = 1 | 2 | 3 | 4;

interface ViewPreferences {
	viewMode: ViewMode;
	cardColumns: CardColumns;
	effectiveViewMode: "table" | "card";
	setViewMode: (mode: ViewMode) => void;
	setCardColumns: (columns: CardColumns) => void;
}

interface ViewPreferencesContextValue {
	prefs: Record<string, { viewMode: ViewMode; cardColumns: CardColumns }>;
	setPrefs: React.Dispatch<
		React.SetStateAction<Record<string, { viewMode: ViewMode; cardColumns: CardColumns }>>
	>;
}

interface UseViewPreferencesOptions {
	storageKey?: string;
	defaultViewMode?: ViewMode;
	defaultCardColumns?: CardColumns;
}

const STORAGE_KEY = "data-list-view-preferences";
const DEFAULT_VIEW_MODE: ViewMode = "auto";
const DEFAULT_CARD_COLUMNS: CardColumns = 3;

function getStoredPreferences(): Record<string, { viewMode: ViewMode; cardColumns: CardColumns }> {
	if (typeof window === "undefined") {
		return {};
	}
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				// Backward compatibility: previously stored as flat object { viewMode, cardColumns }
				if ("viewMode" in parsed || "cardColumns" in parsed) {
					return {
						default: {
							viewMode: (parsed as { viewMode?: ViewMode }).viewMode || DEFAULT_VIEW_MODE,
							cardColumns:
								(parsed as { cardColumns?: CardColumns }).cardColumns || DEFAULT_CARD_COLUMNS,
						},
					};
				}
				return parsed as Record<string, { viewMode: ViewMode; cardColumns: CardColumns }>;
			}
		}
	} catch {
		// Ignore parse errors
	}
	return {};
}

function savePreferences(prefs: Record<string, { viewMode: ViewMode; cardColumns: CardColumns }>) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// Ignore storage errors
	}
}

const ViewPreferencesContext = createContext<ViewPreferencesContextValue | null>(null);

export function ViewPreferencesProvider({ children }: { children: ReactNode }) {
	const [prefs, setPrefs] = useState<
		Record<string, { viewMode: ViewMode; cardColumns: CardColumns }>
	>(() => getStoredPreferences());

	useEffect(() => {
		setPrefs(getStoredPreferences());
	}, []);

	useEffect(() => {
		savePreferences(prefs);
	}, [prefs]);

	return (
		<ViewPreferencesContext.Provider value={{ prefs, setPrefs }}>
			{children}
		</ViewPreferencesContext.Provider>
	);
}

export function useViewPreferences(options?: UseViewPreferencesOptions): ViewPreferences {
	const context = useContext(ViewPreferencesContext);
	if (!context) {
		throw new Error("useViewPreferences must be used within ViewPreferencesProvider");
	}

	const {
		storageKey = "default",
		defaultViewMode = DEFAULT_VIEW_MODE,
		defaultCardColumns = DEFAULT_CARD_COLUMNS,
	} = options ?? {};

	const { prefs, setPrefs } = context;
	const currentPref = prefs[storageKey] ?? {
		viewMode: defaultViewMode,
		cardColumns: defaultCardColumns,
	};

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			setPrefs((prev) => {
				const prevPref = prev[storageKey] ?? {
					viewMode: defaultViewMode,
					cardColumns: defaultCardColumns,
				};
				const nextPref = { ...prevPref, viewMode: mode };
				if (
					prevPref.viewMode === nextPref.viewMode &&
					prevPref.cardColumns === nextPref.cardColumns
				) {
					return prev;
				}
				return { ...prev, [storageKey]: nextPref };
			});
		},
		[setPrefs, storageKey, defaultViewMode, defaultCardColumns],
	);

	const setCardColumns = useCallback(
		(columns: CardColumns) => {
			setPrefs((prev) => {
				const prevPref = prev[storageKey] ?? {
					viewMode: defaultViewMode,
					cardColumns: defaultCardColumns,
				};
				const nextPref = { ...prevPref, cardColumns: columns };
				if (
					prevPref.viewMode === nextPref.viewMode &&
					prevPref.cardColumns === nextPref.cardColumns
				) {
					return prev;
				}
				return { ...prev, [storageKey]: nextPref };
			});
		},
		[setPrefs, storageKey, defaultViewMode, defaultCardColumns],
	);

	const effectiveViewMode = currentPref.viewMode === "auto" ? "table" : currentPref.viewMode;

	useEffect(() => {
		setPrefs((prev) => {
			if (prev[storageKey]) return prev;
			return {
				...prev,
				[storageKey]: { viewMode: defaultViewMode, cardColumns: defaultCardColumns },
			};
		});
	}, [storageKey, defaultViewMode, defaultCardColumns, setPrefs]);

	return {
		viewMode: currentPref.viewMode,
		cardColumns: currentPref.cardColumns,
		effectiveViewMode,
		setViewMode,
		setCardColumns,
	};
}
