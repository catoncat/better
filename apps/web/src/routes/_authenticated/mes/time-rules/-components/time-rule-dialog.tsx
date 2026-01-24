import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	useCreateTimeRule,
	useUpdateTimeRule,
	type TimeRuleDefinition,
} from "@/hooks/use-time-rules";

const timeRuleSchema = z.object({
	code: z.string().min(1, "必须填写代码").max(50),
	name: z.string().min(1, "必须填写名称").max(100),
	description: z.string().optional().nullable(),
	ruleType: z.enum(["SOLDER_PASTE_EXPOSURE", "WASH_TIME_LIMIT"]),
	durationMinutes: z.number().min(1, "时限必须大于 0"),
	warningMinutes: z.number().min(1, "预警阈值必须大于 0").optional().nullable(),
	startEvent: z.string().min(1, "必须填写启动事件"),
	endEvent: z.string().min(1, "必须填写结束事件"),
	scope: z.enum(["GLOBAL", "LINE", "ROUTING", "PRODUCT"]),
	scopeValue: z.string().optional().nullable(),
	requiresWashStep: z.boolean().default(false),
	isWaivable: z.boolean().default(true),
	isActive: z.boolean().default(true),
	priority: z.number().default(10),
});

type TimeRuleFormValues = z.infer<typeof timeRuleSchema>;

interface TimeRuleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule?: TimeRuleDefinition | null;
}

export function TimeRuleDialog({ open, onOpenChange, rule }: TimeRuleDialogProps) {
	const isEdit = Boolean(rule);
	const createMutation = useCreateTimeRule();
	const updateMutation = useUpdateTimeRule();

	const form = useForm<TimeRuleFormValues, typeof zodValidator>({
		defaultValues: {
			code: rule?.code ?? "",
			name: rule?.name ?? "",
			description: rule?.description ?? "",
			ruleType: rule?.ruleType ?? "SOLDER_PASTE_EXPOSURE",
			durationMinutes: rule?.durationMinutes ?? 60,
			warningMinutes: rule?.warningMinutes ?? 10,
			startEvent: rule?.startEvent ?? "",
			endEvent: rule?.endEvent ?? "",
			scope: rule?.scope ?? "GLOBAL",
			scopeValue: rule?.scopeValue ?? "",
			requiresWashStep: rule?.requiresWashStep ?? false,
			isWaivable: rule?.isWaivable ?? true,
			isActive: rule?.isActive ?? true,
			priority: rule?.priority ?? 10,
		} as TimeRuleFormValues,
		validatorAdapter: zodValidator(),
		validators: {
			onChange: timeRuleSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				const payload = {
					...value,
					description: value.description || null,
					warningMinutes: value.warningMinutes || null,
					scopeValue: value.scopeValue || null,
				};

				if (isEdit && rule) {
					await updateMutation.mutateAsync({
						ruleId: rule.id,
						...payload,
					} as any);
				} else {
					await createMutation.mutateAsync(payload as any);
				}
				onOpenChange(false);
			} catch {
				// Error handled by mutation toast
			}
		},
	});

	// Reset form when dialog opens/closes or rule changes
	useEffect(() => {
		if (open) {
			form.reset({
				code: rule?.code ?? "",
				name: rule?.name ?? "",
				description: rule?.description ?? "",
				ruleType: rule?.ruleType ?? "SOLDER_PASTE_EXPOSURE",
				durationMinutes: rule?.durationMinutes ?? 60,
				warningMinutes: rule?.warningMinutes ?? 10,
				startEvent: rule?.startEvent ?? "",
				endEvent: rule?.endEvent ?? "",
				scope: rule?.scope ?? "GLOBAL",
				scopeValue: rule?.scopeValue ?? "",
				requiresWashStep: rule?.requiresWashStep ?? false,
				isWaivable: rule?.isWaivable ?? true,
				isActive: rule?.isActive ?? true,
				priority: rule?.priority ?? 10,
			} as TimeRuleFormValues);
		}
	}, [open, rule, form]);

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑时间规则" : "新建时间规则"}</DialogTitle>
					<DialogDescription>
						配置生产过程中的时间监控规则，超时将产生预警或门禁失败。
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="code" label="规则代码" required>
							{(field) => (
								<Input
									placeholder="例如: SOLDER_PASTE_EXPOSURE"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isEdit}
								/>
							)}
						</Field>
						<Field form={form} name="name" label="规则名称" required>
							{(field) => (
								<Input
									placeholder="例如: 锡膏暴露时间"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<Field form={form} name="description" label="描述">
						{(field) => (
							<Textarea
								placeholder="规则的详细说明..."
								value={field.state.value ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								rows={2}
							/>
						)}
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="ruleType" label="规则类型" required>
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "SOLDER_PASTE_EXPOSURE" | "WASH_TIME_LIMIT")
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择类型" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="SOLDER_PASTE_EXPOSURE">锡膏暴露 (SOLDER_PASTE_EXPOSURE)</SelectItem>
										<SelectItem value="WASH_TIME_LIMIT">水洗时限 (WASH_TIME_LIMIT)</SelectItem>
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="scope" label="监控范围" required>
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "GLOBAL" | "LINE" | "ROUTING" | "PRODUCT")
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择范围" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="GLOBAL">全局 (GLOBAL)</SelectItem>
										<SelectItem value="LINE">产线 (LINE)</SelectItem>
										<SelectItem value="ROUTING">路由 (ROUTING)</SelectItem>
										<SelectItem value="PRODUCT">产品 (PRODUCT)</SelectItem>
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="scopeValue" label="范围关联值">
							{(field) => (
								<Input
									placeholder="产线/路由/产品代码"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<div className="grid grid-cols-2 gap-4">
							<Field form={form} name="durationMinutes" label="时限 (分)" required>
								{(field) => (
									<Input
										type="number"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									/>
								)}
							</Field>
							<Field form={form} name="warningMinutes" label="预警 (分)">
								{(field) => (
									<Input
										type="number"
										placeholder="留空不预警"
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => {
											const v = e.target.value;
											field.handleChange(v ? Number(v) : null);
										}}
									/>
								)}
							</Field>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="startEvent" label="启动事件" required>
							{(field) => (
								<Input
									placeholder="例如: SOLDER_PASTE_USAGE_CREATE"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="endEvent" label="结束事件" required>
							{(field) => (
								<Input
									placeholder="例如: TRACK_OUT:PRINTING"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="flex items-center gap-6">
						<Field form={form} name="isWaivable" label="支持豁免">
							{(field) => (
								<div className="flex items-center gap-2">
									<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									<span className="text-sm text-muted-foreground">
										{field.state.value ? "是" : "否"}
									</span>
								</div>
							)}
						</Field>

						<Field form={form} name="requiresWashStep" label="仅水洗有效">
							{(field) => (
								<div className="flex items-center gap-2">
									<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									<span className="text-sm text-muted-foreground">
										{field.state.value ? "是" : "否"}
									</span>
								</div>
							)}
						</Field>

						<Field form={form} name="isActive" label="启用状态">
							{(field) => (
								<div className="flex items-center gap-2">
									<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									<span className="text-sm text-muted-foreground">
										{field.state.value ? "启用" : "停用"}
									</span>
								</div>
							)}
						</Field>
					</div>

					<DialogFooter>
						<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, _isSubmitting]) => (
								<Button type="submit" disabled={!canSubmit || isPending}>
									{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{isEdit ? "保存更改" : "创建时间规则"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}