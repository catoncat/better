import { ChevronDown, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { QueryPreset } from "@/hooks/use-query-presets";
import { cn } from "@/lib/utils";
import { SavePresetDialog } from "./save-preset-dialog";

export interface SystemPreset<T> {
	id: string;
	name: string;
	filters: Partial<T>;
	icon?: React.ReactNode;
}

export interface QueryPresetBarProps<T> {
	systemPresets: SystemPreset<T>[];
	userPresets: QueryPreset<T>[];
	// The preset that current filters strictly match (null if no match)
	matchedPresetId?: string | null;
	// Deprecated: no longer used for highlight/save logic
	activePresetId?: string | null;
	// Callback when user clicks a preset
	onApplyPreset: (presetId: string, filters: Partial<T>) => void;
	// Callback to save/update preset
	onSavePreset: (name: string) => void;
	// Deprecated: simplified flow does not expose update UI
	onUpdatePreset?: (presetId: string, name: string) => void;
	onDeletePreset: (presetId: string) => void;
	// Deprecated: simplified flow does not expose rename UI
	onRenamePreset?: (presetId: string, newName: string) => void;
	maxVisiblePresets?: number;
}

export function QueryPresetBar<T>(props: QueryPresetBarProps<T>) {
	const {
		systemPresets,
		userPresets,
		matchedPresetId,
		onApplyPreset,
		onSavePreset,
		onDeletePreset,
		maxVisiblePresets = 6,
	} = props;

	// Strict match only: highlight/save depend solely on matchedPresetId
	const effectiveMatchedPresetId = matchedPresetId ?? null;
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);

	const allPresets = [...systemPresets, ...userPresets];

	// Determine which preset to highlight
	// If filters match a preset, highlight that one; otherwise none
	const highlightedPresetId = effectiveMatchedPresetId;

	// Save button: show when当前过滤未匹配任何预设（去重：有匹配则不显示）
	const showSaveButton = !effectiveMatchedPresetId;

	// When user clicks a preset
	const handlePresetClick = useCallback(
		(preset: SystemPreset<T> | QueryPreset<T>) => {
			onApplyPreset(preset.id, preset.filters);
		},
		[onApplyPreset],
	);

	const handleSave = (name: string) => {
		onSavePreset(name);
		setSaveDialogOpen(false);
	};

	// Rename is disabled in simplified flow

	// Calculate visible and overflow presets
	let visiblePresets: typeof allPresets;
	let overflowPresets: typeof allPresets;

	const activePresetIndex = highlightedPresetId
		? allPresets.findIndex((p) => p.id === highlightedPresetId)
		: -1;

	if (activePresetIndex >= maxVisiblePresets) {
		const activePreset = allPresets[activePresetIndex];
		const withoutActive = allPresets.filter((_, i) => i !== activePresetIndex);
		visiblePresets = [...withoutActive.slice(0, maxVisiblePresets - 1), activePreset];
		overflowPresets = withoutActive.slice(maxVisiblePresets - 1);
	} else {
		visiblePresets = allPresets.slice(0, maxVisiblePresets);
		overflowPresets = allPresets.slice(maxVisiblePresets);
	}

	const renderPresetButton = (preset: SystemPreset<T> | QueryPreset<T>, isUserPreset: boolean) => {
		const isActive = highlightedPresetId === preset.id;

		if (!isUserPreset) {
			return (
				<Button
					key={preset.id}
					variant={isActive ? "default" : "outline"}
					size="sm"
					className="shrink-0"
					onClick={() => handlePresetClick(preset)}
				>
					{(preset as SystemPreset<T>).icon}
					{preset.name}
				</Button>
			);
		}

		return (
			<div key={preset.id} className="flex items-center shrink-0">
				<Button
					variant={isActive ? "default" : "outline"}
					size="sm"
					className="shrink-0 rounded-r-none border-r-0"
					onClick={() => handlePresetClick(preset)}
				>
					{preset.name}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant={isActive ? "default" : "outline"}
							size="sm"
							className="shrink-0 rounded-l-none px-1.5"
						>
							<MoreHorizontal className="h-3.5 w-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							className="text-destructive focus:text-destructive"
							onClick={() => onDeletePreset(preset.id)}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							删除
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	};

	return (
		<div className="sticky top-0 z-10 bg-background py-2 -mx-4 px-4 md:relative md:z-auto md:py-0 md:mx-0 md:px-0 flex items-center gap-2 mb-4">
			<span className="hidden md:inline text-sm text-muted-foreground shrink-0">快速筛选:</span>
			<div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible">
				{visiblePresets.map((preset) => {
					const isUserPreset = userPresets.some((p) => p.id === preset.id);
					return renderPresetButton(preset, isUserPreset);
				})}

				{overflowPresets.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="shrink-0">
								更多
								<ChevronDown className="ml-1 h-3.5 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							{overflowPresets.map((preset) => {
								const isUserPreset = userPresets.some((p) => p.id === preset.id);
								const isActive = highlightedPresetId === preset.id;
								return (
									<DropdownMenuItem
										key={preset.id}
										className={cn(isActive && "bg-accent")}
										onClick={() => handlePresetClick(preset)}
									>
										<span className="flex-1">{preset.name}</span>
										{isUserPreset && (
											<Button
												variant="ghost"
												size="icon-sm"
												className="h-6 w-6 ml-2"
												onClick={(e) => {
													e.stopPropagation();
													onDeletePreset(preset.id);
												}}
											>
												<Trash2 className="h-3.5 w-3.5 text-destructive" />
											</Button>
										)}
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Save button - single entry point */}
			{showSaveButton && (
				<div className="flex items-center gap-1 shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSaveDialogOpen(true)}
						title="保存查询"
					>
						<Plus className="h-4 w-4 md:mr-1" />
						<span className="hidden md:inline">保存查询</span>
					</Button>
				</div>
			)}

			<SavePresetDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				onSave={handleSave}
			/>
		</div>
	);
}
