import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field-wrapper";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const datasetValues = ["base", "mgmt_demo", "loading_config", "data_collection"] as const;
export type DemoSeedDataset = (typeof datasetValues)[number];

const modeValues = ["append", "overwrite"] as const;
export type DemoSeedMode = (typeof modeValues)[number];

const datasetOptions: Array<{
	value: DemoSeedDataset;
	label: string;
	description: string;
	appendable: boolean;
}> = [
	{
		value: "base",
		label: "基础数据",
		description: "角色/用户/产线/工序/路由等基础配置",
		appendable: false,
	},
	{
		value: "mgmt_demo",
		label: "管理层演示",
		description: "多状态工单/批次/检验数据",
		appendable: true,
	},
	{
		value: "loading_config",
		label: "上料演示配置",
		description: "站位、物料、替代料与映射关系",
		appendable: true,
	},
	{
		value: "data_collection",
		label: "数据采集演示",
		description: "采集项规格、路由绑定与单元进度",
		appendable: true,
	},
];

const formSchema = z
	.object({
		mode: z.enum(modeValues),
		datasets: z.array(z.enum(datasetValues)).min(1, "至少选择一个数据集"),
		confirmReset: z.boolean().optional(),
	})
	.refine((values) => values.mode !== "overwrite" || values.confirmReset, {
		path: ["confirmReset"],
		message: "覆盖模式需要确认清空数据",
	});

export type DemoSeedPayload = {
	mode: DemoSeedMode;
	datasets: DemoSeedDataset[];
};

export type DemoSeedFormValues = z.infer<typeof formSchema>;

type DemoSeedDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isSubmitting?: boolean;
	onSubmit: (payload: DemoSeedPayload) => Promise<void>;
};

const defaultValues: DemoSeedFormValues = {
	mode: "append",
	datasets: ["mgmt_demo", "loading_config", "data_collection"],
	confirmReset: false,
};

export function DemoSeedDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting = false,
}: DemoSeedDialogProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				mode: value.mode,
				datasets: value.datasets,
			});
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset(defaultValues);
		}
	}, [open, form]);

	const currentMode = form.state.values.mode;
	const currentDatasets = form.state.values.datasets;

	useEffect(() => {
		if (currentMode === "append" && currentDatasets.includes("base")) {
			form.setFieldValue(
				"datasets",
				currentDatasets.filter((item) => item !== "base"),
			);
		}
	}, [currentMode, currentDatasets, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>生成演示数据</DialogTitle>
					<DialogDescription>选择需要的演示数据集，可追加到现有数据或覆盖重建。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<Field
						form={form}
						name="mode"
						label="生成模式"
						description="追加模式保留现有数据；覆盖模式会清空数据库并重建。"
					>
						{(field) => (
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value as DemoSeedMode)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="选择模式" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="append">追加（保留现有数据）</SelectItem>
									<SelectItem value="overwrite">覆盖（清空并重建）</SelectItem>
								</SelectContent>
							</Select>
						)}
					</Field>

					<Field
						form={form}
						name="datasets"
						label="演示数据集"
						description="覆盖模式会自动补齐基础数据依赖。"
					>
						{(field) => (
							<div className="space-y-3">
								{datasetOptions.map((option) => {
									const checked = field.state.value.includes(option.value);
									const disabled = form.state.values.mode === "append" && !option.appendable;
									const inputId = `demo-seed-${option.value}`;
									return (
										<div
											key={option.value}
											className="flex items-start gap-3 rounded-md border border-transparent p-3 hover:border-border"
										>
											<Checkbox
												id={inputId}
												checked={checked}
												onCheckedChange={(value) => {
													const next =
														value === true
															? [...field.state.value, option.value]
															: field.state.value.filter((item) => item !== option.value);
													field.handleChange(next);
												}}
												disabled={disabled}
											/>
											<div className="space-y-1">
												<Label htmlFor={inputId} className="text-sm font-medium">
													{option.label}
												</Label>
												<p className="text-xs text-muted-foreground">{option.description}</p>
												{disabled && (
													<p className="text-xs text-muted-foreground">追加模式不支持基础数据</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</Field>

					{form.state.values.mode === "overwrite" && (
						<Field
							form={form}
							name="confirmReset"
							label="覆盖确认"
							description="覆盖会清空数据库，请确认后再执行。"
						>
							{(field) => (
								<div className="flex items-center gap-3">
									<Checkbox
										id="demo-seed-confirm-reset"
										checked={field.state.value ?? false}
										onCheckedChange={(value) => field.handleChange(Boolean(value))}
									/>
									<Label htmlFor="demo-seed-confirm-reset" className="text-sm text-destructive">
										我已知晓覆盖会清空现有数据
									</Label>
								</div>
							)}
						</Field>
					)}

					<DialogFooter>
						<Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "执行中..." : "开始生成"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
