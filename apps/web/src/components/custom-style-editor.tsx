/**
 * 自定义风格编辑器
 *
 * 允许用户自定义主题颜色并保存到本地存储
 */

import { Paintbrush, RotateCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useStyle } from "@/components/style-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STYLE_THEMES } from "@/config/style-themes";

interface CustomThemeData {
	id: string;
	name: string;
	description: string;
	preview: string;
	light: Record<string, string>;
	dark: Record<string, string>;
}

// 颜色变量分组
const COLOR_GROUPS = [
	{
		name: "基础颜色",
		colors: [
			{ key: "background", label: "背景" },
			{ key: "foreground", label: "前景" },
			{ key: "primary", label: "主色" },
			{ key: "primaryForeground", label: "主色前景" },
		],
	},
	{
		name: "卡片与弹窗",
		colors: [
			{ key: "card", label: "卡片背景" },
			{ key: "cardForeground", label: "卡片前景" },
			{ key: "popover", label: "弹窗背景" },
			{ key: "popoverForeground", label: "弹窗前景" },
		],
	},
	{
		name: "辅助颜色",
		colors: [
			{ key: "secondary", label: "次要色" },
			{ key: "secondaryForeground", label: "次要前景" },
			{ key: "muted", label: "柔和色" },
			{ key: "mutedForeground", label: "柔和前景" },
			{ key: "accent", label: "强调色" },
			{ key: "accentForeground", label: "强调前景" },
		],
	},
	{
		name: "状态颜色",
		colors: [
			{ key: "destructive", label: "危险色" },
			{ key: "destructiveForeground", label: "危险前景" },
		],
	},
	{
		name: "边框与输入",
		colors: [
			{ key: "border", label: "边框" },
			{ key: "input", label: "输入框" },
			{ key: "ring", label: "聚焦环" },
		],
	},
	{
		name: "侧边栏",
		colors: [
			{ key: "sidebar", label: "侧栏背景" },
			{ key: "sidebarForeground", label: "侧栏前景" },
			{ key: "sidebarPrimary", label: "侧栏主色" },
			{ key: "sidebarPrimaryForeground", label: "侧栏主色前景" },
			{ key: "sidebarAccent", label: "侧栏强调" },
			{ key: "sidebarAccentForeground", label: "侧栏强调前景" },
			{ key: "sidebarBorder", label: "侧栏边框" },
			{ key: "sidebarRing", label: "侧栏聚焦环" },
		],
	},
];

// 将 OKLCH 转换为 HEX（近似转换，用于颜色选择器显示）
function oklchToHex(oklch: string): string {
	// 简单正则匹配 oklch(L C H)
	const match = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
	if (!match) return "#888888";

	const L = Number.parseFloat(match[1]);
	const C = Number.parseFloat(match[2]);
	const H = Number.parseFloat(match[3]);

	// 简化的 OKLCH 到 sRGB 转换
	// 这是一个近似转换，不完全精确
	const hRad = (H * Math.PI) / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);

	// OKLab to linear sRGB (simplified)
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;

	// Linear RGB
	let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

	// Gamma correction
	const gammaCorrect = (c: number) => {
		if (c <= 0.0031308) return 12.92 * c;
		return 1.055 * c ** (1 / 2.4) - 0.055;
	};

	r = Math.max(0, Math.min(1, gammaCorrect(r)));
	g = Math.max(0, Math.min(1, gammaCorrect(g)));
	bl = Math.max(0, Math.min(1, gammaCorrect(bl)));

	const toHex = (c: number) =>
		Math.round(c * 255)
			.toString(16)
			.padStart(2, "0");

	return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// 将 HEX 转换为 OKLCH
function hexToOklch(hex: string): string {
	// 解析 HEX
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return "oklch(0.5 0 0)";

	// sRGB to linear
	const linearize = (c: number) => {
		c = c / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};

	const r = linearize(Number.parseInt(result[1], 16));
	const g = linearize(Number.parseInt(result[2], 16));
	const b = linearize(Number.parseInt(result[3], 16));

	// Linear RGB to OKLab
	const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

	const l = Math.cbrt(l_);
	const m = Math.cbrt(m_);
	const s = Math.cbrt(s_);

	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

	const C = Math.sqrt(a * a + bOk * bOk);
	let H = (Math.atan2(bOk, a) * 180) / Math.PI;
	if (H < 0) H += 360;

	return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)})`;
}

interface ColorInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
	const hexValue = oklchToHex(value);

	return (
		<div className="flex items-center gap-2">
			<Label className="w-24 text-xs text-muted-foreground shrink-0">{label}</Label>
			<div className="flex items-center gap-1.5 flex-1">
				<input
					type="color"
					value={hexValue}
					onChange={(e) => onChange(hexToOklch(e.target.value))}
					className="h-7 w-10 cursor-pointer rounded border border-input p-0.5"
				/>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="h-7 text-xs font-mono flex-1"
					placeholder="oklch(L C H)"
				/>
			</div>
		</div>
	);
}

export function CustomStyleEditor() {
	const { style, setStyle, addCustomTheme, removeCustomTheme, customThemes } = useStyle();
	const [open, setOpen] = useState(false);
	const [baseTheme, setBaseTheme] = useState<string>("warm");
	const [themeName, setThemeName] = useState("我的主题");
	const [themeDescription, setThemeDescription] = useState("自定义主题");
	const [lightColors, setLightColors] = useState<Record<string, string>>({});
	const [darkColors, setDarkColors] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<"light" | "dark">("light");
	const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

	// 当选择基础主题时，加载其颜色
	const loadBaseTheme = useCallback((themeId: string) => {
		const theme = STYLE_THEMES.find((t) => t.id === themeId);
		if (theme) {
			setLightColors({ ...theme.light });
			setDarkColors({ ...theme.dark });
		}
	}, []);

	// 初始化时加载基础主题
	useEffect(() => {
		if (open && !editingCustomId) {
			loadBaseTheme(baseTheme);
		}
	}, [open, baseTheme, editingCustomId, loadBaseTheme]);

	const handleBaseThemeChange = (themeId: string) => {
		setBaseTheme(themeId);
		loadBaseTheme(themeId);
	};

	const updateLightColor = (key: string, value: string) => {
		setLightColors((prev) => ({ ...prev, [key]: value }));
	};

	const updateDarkColor = (key: string, value: string) => {
		setDarkColors((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		if (!themeName.trim()) {
			toast.error("请输入主题名称");
			return;
		}

		const customId = editingCustomId || `custom-${Date.now()}`;
		const newTheme: CustomThemeData = {
			id: customId,
			name: themeName,
			description: themeDescription,
			preview: oklchToHex(lightColors.primary || "oklch(0.5 0.15 250)"),
			light: lightColors,
			dark: darkColors,
		};

		addCustomTheme(newTheme);
		setStyle(customId);
		toast.success(editingCustomId ? "主题已更新" : "主题已保存");
		setOpen(false);
		setEditingCustomId(null);
	};

	const handleEditCustomTheme = (themeId: string) => {
		const theme = customThemes.find((t) => t.id === themeId);
		if (theme) {
			setEditingCustomId(themeId);
			setThemeName(theme.name);
			setThemeDescription(theme.description);
			setLightColors({ ...theme.light });
			setDarkColors({ ...theme.dark });
			setOpen(true);
		}
	};

	const handleDeleteCustomTheme = (themeId: string) => {
		removeCustomTheme(themeId);
		if (style === themeId) {
			setStyle("warm");
		}
		toast.success("自定义主题已删除");
	};

	const handleReset = () => {
		loadBaseTheme(baseTheme);
		toast.info("已重置为基础主题");
	};

	const handleNewTheme = () => {
		setEditingCustomId(null);
		setThemeName("我的主题");
		setThemeDescription("自定义主题");
		setBaseTheme("warm");
		loadBaseTheme("warm");
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-start gap-2"
					onClick={handleNewTheme}
				>
					<Paintbrush className="h-4 w-4" />
					自定义风格
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[85vh]">
				<DialogHeader>
					<DialogTitle>{editingCustomId ? "编辑自定义风格" : "创建自定义风格"}</DialogTitle>
					<DialogDescription>自定义应用的颜色主题，保存后可在风格切换中选择。</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* 基本信息 */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="theme-name">主题名称</Label>
							<Input
								id="theme-name"
								value={themeName}
								onChange={(e) => setThemeName(e.target.value)}
								placeholder="我的主题"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="base-theme">基础主题</Label>
							<Select value={baseTheme} onValueChange={handleBaseThemeChange}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STYLE_THEMES.map((theme) => (
										<SelectItem key={theme.id} value={theme.id}>
											<div className="flex items-center gap-2">
												<span
													className="h-3 w-3 rounded-full border"
													style={{ backgroundColor: theme.preview }}
												/>
												{theme.name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="theme-desc">描述</Label>
						<Input
							id="theme-desc"
							value={themeDescription}
							onChange={(e) => setThemeDescription(e.target.value)}
							placeholder="主题描述"
						/>
					</div>

					{/* 颜色编辑器 */}
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "light" | "dark")}>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="light">浅色模式</TabsTrigger>
							<TabsTrigger value="dark">深色模式</TabsTrigger>
						</TabsList>

						<TabsContent value="light" className="mt-4">
							<ScrollArea className="h-[300px] pr-4">
								<div className="space-y-4">
									{COLOR_GROUPS.map((group) => (
										<div key={group.name} className="space-y-2">
											<h4 className="text-sm font-medium text-muted-foreground">{group.name}</h4>
											<div className="space-y-1.5">
												{group.colors.map((color) => (
													<ColorInput
														key={color.key}
														label={color.label}
														value={lightColors[color.key] || ""}
														onChange={(value) => updateLightColor(color.key, value)}
													/>
												))}
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent value="dark" className="mt-4">
							<ScrollArea className="h-[300px] pr-4">
								<div className="space-y-4">
									{COLOR_GROUPS.map((group) => (
										<div key={group.name} className="space-y-2">
											<h4 className="text-sm font-medium text-muted-foreground">{group.name}</h4>
											<div className="space-y-1.5">
												{group.colors.map((color) => (
													<ColorInput
														key={color.key}
														label={color.label}
														value={darkColors[color.key] || ""}
														onChange={(value) => updateDarkColor(color.key, value)}
													/>
												))}
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</TabsContent>
					</Tabs>

					{/* 已保存的自定义主题 */}
					{customThemes.length > 0 && (
						<div className="space-y-2">
							<Label>已保存的自定义主题</Label>
							<div className="flex flex-wrap gap-2">
								{customThemes.map((theme) => (
									<div
										key={theme.id}
										className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
									>
										<span
											className="h-3 w-3 rounded-full border"
											style={{ backgroundColor: theme.preview }}
										/>
										<span>{theme.name}</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-5 w-5 p-0"
											onClick={() => handleEditCustomTheme(theme.id)}
										>
											<Paintbrush className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-5 w-5 p-0 text-destructive hover:text-destructive"
											onClick={() => handleDeleteCustomTheme(theme.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleReset}>
						<RotateCcw className="mr-2 h-4 w-4" />
						重置
					</Button>
					<Button onClick={handleSave}>
						<Save className="mr-2 h-4 w-4" />
						{editingCustomId ? "更新主题" : "保存主题"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
