import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_STYLE_ID, STYLE_THEMES, type StyleTheme } from "@/config/style-themes";

const STORAGE_KEY = "app-style";
const CUSTOM_THEMES_STORAGE_KEY = "custom-style-themes";

// 自定义主题数据结构
interface CustomThemeData {
	id: string;
	name: string;
	description: string;
	preview: string;
	light: Record<string, string>;
	dark: Record<string, string>;
}

interface StyleContextValue {
	style: string;
	setStyle: (style: string) => void;
	styles: StyleTheme[];
	currentStyle: StyleTheme;
	// 自定义主题管理
	customThemes: CustomThemeData[];
	addCustomTheme: (theme: CustomThemeData) => void;
	removeCustomTheme: (id: string) => void;
}

const StyleContext = createContext<StyleContextValue | undefined>(undefined);

// 将自定义主题转换为 StyleTheme 格式
function customToStyleTheme(custom: CustomThemeData): StyleTheme {
	return {
		id: custom.id,
		name: custom.name,
		description: custom.description,
		preview: custom.preview,
		light: {
			background: custom.light.background || "oklch(1 0 0)",
			foreground: custom.light.foreground || "oklch(0 0 0)",
			card: custom.light.card || "oklch(1 0 0)",
			cardForeground: custom.light.cardForeground || "oklch(0 0 0)",
			popover: custom.light.popover || "oklch(1 0 0)",
			popoverForeground: custom.light.popoverForeground || "oklch(0 0 0)",
			primary: custom.light.primary || "oklch(0.5 0.15 250)",
			primaryForeground: custom.light.primaryForeground || "oklch(1 0 0)",
			secondary: custom.light.secondary || "oklch(0.96 0 0)",
			secondaryForeground: custom.light.secondaryForeground || "oklch(0 0 0)",
			muted: custom.light.muted || "oklch(0.96 0 0)",
			mutedForeground: custom.light.mutedForeground || "oklch(0.45 0 0)",
			accent: custom.light.accent || "oklch(0.96 0 0)",
			accentForeground: custom.light.accentForeground || "oklch(0 0 0)",
			destructive: custom.light.destructive || "oklch(0.55 0.2 25)",
			destructiveForeground: custom.light.destructiveForeground || "oklch(1 0 0)",
			border: custom.light.border || "oklch(0.9 0 0)",
			input: custom.light.input || "oklch(0.9 0 0)",
			ring: custom.light.ring || "oklch(0.5 0.15 250)",
			sidebar: custom.light.sidebar || "oklch(0.98 0 0)",
			sidebarForeground: custom.light.sidebarForeground || "oklch(0 0 0)",
			sidebarPrimary: custom.light.sidebarPrimary || "oklch(0.5 0.15 250)",
			sidebarPrimaryForeground: custom.light.sidebarPrimaryForeground || "oklch(1 0 0)",
			sidebarAccent: custom.light.sidebarAccent || "oklch(0.96 0 0)",
			sidebarAccentForeground: custom.light.sidebarAccentForeground || "oklch(0 0 0)",
			sidebarBorder: custom.light.sidebarBorder || "oklch(0.9 0 0)",
			sidebarRing: custom.light.sidebarRing || "oklch(0.5 0.15 250)",
			radius: custom.light.radius || "0.5rem",
		},
		dark: {
			background: custom.dark.background || "oklch(0.15 0 0)",
			foreground: custom.dark.foreground || "oklch(0.98 0 0)",
			card: custom.dark.card || "oklch(0.18 0 0)",
			cardForeground: custom.dark.cardForeground || "oklch(0.98 0 0)",
			popover: custom.dark.popover || "oklch(0.18 0 0)",
			popoverForeground: custom.dark.popoverForeground || "oklch(0.98 0 0)",
			primary: custom.dark.primary || "oklch(0.65 0.15 250)",
			primaryForeground: custom.dark.primaryForeground || "oklch(0.15 0 0)",
			secondary: custom.dark.secondary || "oklch(0.22 0 0)",
			secondaryForeground: custom.dark.secondaryForeground || "oklch(0.98 0 0)",
			muted: custom.dark.muted || "oklch(0.22 0 0)",
			mutedForeground: custom.dark.mutedForeground || "oklch(0.65 0 0)",
			accent: custom.dark.accent || "oklch(0.22 0 0)",
			accentForeground: custom.dark.accentForeground || "oklch(0.98 0 0)",
			destructive: custom.dark.destructive || "oklch(0.6 0.18 25)",
			destructiveForeground: custom.dark.destructiveForeground || "oklch(0.98 0 0)",
			border: custom.dark.border || "oklch(0.28 0 0)",
			input: custom.dark.input || "oklch(0.28 0 0)",
			ring: custom.dark.ring || "oklch(0.65 0.15 250)",
			sidebar: custom.dark.sidebar || "oklch(0.12 0 0)",
			sidebarForeground: custom.dark.sidebarForeground || "oklch(0.98 0 0)",
			sidebarPrimary: custom.dark.sidebarPrimary || "oklch(0.65 0.15 250)",
			sidebarPrimaryForeground: custom.dark.sidebarPrimaryForeground || "oklch(0.15 0 0)",
			sidebarAccent: custom.dark.sidebarAccent || "oklch(0.2 0 0)",
			sidebarAccentForeground: custom.dark.sidebarAccentForeground || "oklch(0.98 0 0)",
			sidebarBorder: custom.dark.sidebarBorder || "oklch(0.25 0 0)",
			sidebarRing: custom.dark.sidebarRing || "oklch(0.65 0.15 250)",
			radius: custom.dark.radius || "0.5rem",
		},
	};
}

function applyStyleTheme(theme: StyleTheme, isDark: boolean) {
	const tokens = isDark ? theme.dark : theme.light;
	const root = document.documentElement;

	// 应用所有 CSS 变量
	root.style.setProperty("--background", tokens.background);
	root.style.setProperty("--foreground", tokens.foreground);
	root.style.setProperty("--card", tokens.card);
	root.style.setProperty("--card-foreground", tokens.cardForeground);
	root.style.setProperty("--popover", tokens.popover);
	root.style.setProperty("--popover-foreground", tokens.popoverForeground);
	root.style.setProperty("--primary", tokens.primary);
	root.style.setProperty("--primary-foreground", tokens.primaryForeground);
	root.style.setProperty("--secondary", tokens.secondary);
	root.style.setProperty("--secondary-foreground", tokens.secondaryForeground);
	root.style.setProperty("--muted", tokens.muted);
	root.style.setProperty("--muted-foreground", tokens.mutedForeground);
	root.style.setProperty("--accent", tokens.accent);
	root.style.setProperty("--accent-foreground", tokens.accentForeground);
	root.style.setProperty("--destructive", tokens.destructive);
	root.style.setProperty("--destructive-foreground", tokens.destructiveForeground);
	root.style.setProperty("--border", tokens.border);
	root.style.setProperty("--input", tokens.input);
	root.style.setProperty("--ring", tokens.ring);
	root.style.setProperty("--sidebar", tokens.sidebar);
	root.style.setProperty("--sidebar-foreground", tokens.sidebarForeground);
	root.style.setProperty("--sidebar-primary", tokens.sidebarPrimary);
	root.style.setProperty("--sidebar-primary-foreground", tokens.sidebarPrimaryForeground);
	root.style.setProperty("--sidebar-accent", tokens.sidebarAccent);
	root.style.setProperty("--sidebar-accent-foreground", tokens.sidebarAccentForeground);
	root.style.setProperty("--sidebar-border", tokens.sidebarBorder);
	root.style.setProperty("--sidebar-ring", tokens.sidebarRing);
	root.style.setProperty("--radius", tokens.radius);
}

// 从本地存储加载自定义主题
function loadCustomThemes(): CustomThemeData[] {
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

// 保存自定义主题到本地存储
function saveCustomThemes(themes: CustomThemeData[]) {
	localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
}

export function StyleProvider({ children }: { children: React.ReactNode }) {
	const [style, setStyleState] = useState<string>(() => {
		if (typeof window === "undefined") return DEFAULT_STYLE_ID;
		return localStorage.getItem(STORAGE_KEY) || DEFAULT_STYLE_ID;
	});

	const [customThemes, setCustomThemes] = useState<CustomThemeData[]>(() => loadCustomThemes());

	// 合并预设主题和自定义主题
	const allStyles = useMemo<StyleTheme[]>(
		() => [...STYLE_THEMES, ...customThemes.map((ct) => customToStyleTheme(ct))],
		[customThemes],
	);

	const currentStyle = allStyles.find((t) => t.id === style) || STYLE_THEMES[0];

	const setStyle = useCallback((newStyle: string) => {
		setStyleState(newStyle);
		localStorage.setItem(STORAGE_KEY, newStyle);
	}, []);

	const addCustomTheme = useCallback((theme: CustomThemeData) => {
		setCustomThemes((prev) => {
			// 如果已存在则更新，否则添加
			const existing = prev.findIndex((t) => t.id === theme.id);
			let updated: CustomThemeData[];
			if (existing >= 0) {
				updated = [...prev];
				updated[existing] = theme;
			} else {
				updated = [...prev, theme];
			}
			saveCustomThemes(updated);
			return updated;
		});
	}, []);

	const removeCustomTheme = useCallback((id: string) => {
		setCustomThemes((prev) => {
			const updated = prev.filter((t) => t.id !== id);
			saveCustomThemes(updated);
			return updated;
		});
	}, []);

	// 监听主题变化并应用样式
	useEffect(() => {
		const theme = allStyles.find((t) => t.id === style) || STYLE_THEMES[0];

		// 检测当前是否为深色模式
		const isDark = document.documentElement.classList.contains("dark");
		applyStyleTheme(theme, isDark);

		// 监听 dark class 变化
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.attributeName === "class") {
					const isDarkNow = document.documentElement.classList.contains("dark");
					applyStyleTheme(theme, isDarkNow);
				}
			}
		});

		observer.observe(document.documentElement, { attributes: true });

		return () => observer.disconnect();
	}, [style, allStyles]);

	return (
		<StyleContext.Provider
			value={{
				style,
				setStyle,
				styles: allStyles,
				currentStyle,
				customThemes,
				addCustomTheme,
				removeCustomTheme,
			}}
		>
			{children}
		</StyleContext.Provider>
	);
}

export function useStyle() {
	const context = useContext(StyleContext);
	if (!context) {
		throw new Error("useStyle must be used within a StyleProvider");
	}
	return context;
}
