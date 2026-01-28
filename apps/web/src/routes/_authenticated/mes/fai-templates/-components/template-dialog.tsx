import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	type FaiTemplateDetail,
	useCreateFaiTemplate,
	useUpdateFaiTemplate,
} from "@/hooks/use-fai-templates";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

const itemSchema = z.object({
	seq: z.number().int().min(1, "序号需大于 0"),
	itemName: z.string().min(1, "请输入检验项名称"),
	itemSpec: z.string().optional(),
	required: z.boolean(),
});

const baseFormSchema = z.object({
	code: z.string().min(1, "请输入模板编码"),
	name: z.string().min(1, "请输入模板名称"),
	productCode: z.string().min(1, "请输入产品型号"),
	processType: z.enum(["SMT", "DIP"]),
	version: z.string().optional(),
	isActive: z.boolean(),
	items: z.array(itemSchema).min(1, "至少添加 1 个检验项"),
});

type FormValues = z.infer<typeof baseFormSchema>;

const buildFormValues = (template?: FaiTemplateDetail | null): FormValues => {
	const templateItems = template?.items ?? [];

	return {
		code: template?.code ?? "",
		name: template?.name ?? "",
		productCode: template?.productCode ?? "",
		processType: (template?.processType ?? "SMT") as "SMT" | "DIP",
		version: template?.version ?? "",
		isActive: template?.isActive ?? true,
		items:
			templateItems.length > 0
				? templateItems.map((item) => ({
						seq: item.seq,
						itemName: item.itemName,
						itemSpec: item.itemSpec ?? "",
						required: item.required ?? true,
					}))
				: [{ seq: 1, itemName: "", itemSpec: "", required: true }],
	};
};

interface TemplateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template?: FaiTemplateDetail | null;
	isLoading?: boolean;
}

export function TemplateDialog({ open, onOpenChange, template, isLoading }: TemplateDialogProps) {
	const createTemplate = useCreateFaiTemplate();
	const updateTemplate = useUpdateFaiTemplate();

	const validationSchema = useMemo(
		() =>
			baseFormSchema.superRefine((values, ctx) => {
				const seqSet = new Set<number>();
				let hasDuplicate = false;
				let hasEmptyName = false;
				for (const item of values.items) {
					if (seqSet.has(item.seq)) {
						hasDuplicate = true;
					}
					seqSet.add(item.seq);
					if (!item.itemName.trim()) {
						hasEmptyName = true;
					}
				}
				if (hasDuplicate) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["items"],
						message: "检验项序号不能重复",
					});
				}
				if (hasEmptyName) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["items"],
						message: "检验项名称不能为空",
					});
				}
			}),
		[],
	);

	const form = useForm({
		defaultValues: buildFormValues(template),
		validators: {
			onChange: validationSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = {
				code: value.code.trim(),
				name: value.name.trim(),
				productCode: value.productCode.trim(),
				processType: value.processType,
				version: value.version?.trim() || undefined,
				isActive: value.isActive,
				items: value.items.map((item) => ({
					seq: item.seq,
					itemName: item.itemName.trim(),
					itemSpec: item.itemSpec?.trim() || undefined,
					required: item.required,
				})),
			};

			if (template) {
				await updateTemplate.mutateAsync({ templateId: template.id, ...payload });
			} else {
				await createTemplate.mutateAsync(payload);
			}
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset(buildFormValues(template));
		}
	}, [open, template, form]);

	const isEdit = Boolean(template);
	const isPending = createTemplate.isPending || updateTemplate.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑 FAI 模板" : "新建 FAI 模板"}</DialogTitle>
					<DialogDescription>配置产品型号对应的首件检验项目。</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-10">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4 py-2"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<Field form={form} name="code" label="模板编码" required>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：FAI-SMT-001"
										className="w-full"
									/>
								)}
							</Field>
							<Field form={form} name="name" label="模板名称" required>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：主板首件检验"
										className="w-full"
									/>
								)}
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field form={form} name="productCode" label="产品型号" required>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：P1234-A"
										className="w-full"
									/>
								)}
							</Field>
							<Field form={form} name="processType" label="工艺类型" required>
								{(field) => (
									<Select
										value={field.state.value}
										onValueChange={(value) => field.handleChange(value as "SMT" | "DIP")}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="选择工艺类型" />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field form={form} name="version" label="版本">
								{(field) => (
									<Input
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：V1.0"
										className="w-full"
									/>
								)}
							</Field>
							<Field form={form} name="isActive" label="是否启用">
								{(field) => (
									<div className="flex items-center gap-3">
										<Switch
											checked={field.state.value}
											onCheckedChange={(value) => field.handleChange(Boolean(value))}
										/>
										<span className="text-sm text-muted-foreground">
											{field.state.value ? "启用" : "停用"}
										</span>
									</div>
								)}
							</Field>
						</div>

						<Field
							form={form}
							name="items"
							label="检验项"
							description="序号用于排序，必须唯一。"
							required
						>
							{(field) => {
								const items = field.state.value;
								const updateItem = (index: number, patch: Partial<FormValues["items"][number]>) => {
									const next = [...items];
									next[index] = { ...next[index], ...patch };
									field.handleChange(next);
								};

								return (
									<div className="space-y-3">
										{items.map((item, index) => (
											<div
												key={`${item.seq}-${index}`}
												className="rounded-md border border-border p-3 space-y-3"
											>
												<div className="grid gap-3 md:grid-cols-[120px_1fr_1fr]">
													<div className="space-y-1">
														<Label className="text-xs text-muted-foreground">序号</Label>
														<Input
															type="number"
															value={item.seq}
															onChange={(e) =>
																updateItem(index, {
																	seq: Number(e.target.value) || 0,
																})
															}
															className="w-full"
														/>
													</div>
													<div className="space-y-1">
														<Label className="text-xs text-muted-foreground">检验项名称</Label>
														<Input
															value={item.itemName}
															onChange={(e) => updateItem(index, { itemName: e.target.value })}
															className="w-full"
														/>
													</div>
													<div className="space-y-1">
														<Label className="text-xs text-muted-foreground">规格/标准</Label>
														<Input
															value={item.itemSpec ?? ""}
															onChange={(e) => updateItem(index, { itemSpec: e.target.value })}
															className="w-full"
														/>
													</div>
												</div>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2 text-sm">
														<Checkbox
															id={`fai-template-required-${index}`}
															checked={item.required}
															onCheckedChange={(value) =>
																updateItem(index, { required: Boolean(value) })
															}
														/>
														<Label htmlFor={`fai-template-required-${index}`} className="text-sm">
															必填
														</Label>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														disabled={items.length <= 1}
														onClick={() => {
															if (items.length <= 1) return;
															field.handleChange(items.filter((_, i) => i !== index));
														}}
													>
														<Trash2 className="mr-1 h-4 w-4" />
														删除
													</Button>
												</div>
											</div>
										))}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												const maxSeq = Math.max(0, ...items.map((entry) => entry.seq || 0));
												field.handleChange([
													...items,
													{ seq: maxSeq + 1, itemName: "", itemSpec: "", required: true },
												]);
											}}
										>
											<Plus className="mr-2 h-4 w-4" />
											新增检验项
										</Button>
									</div>
								);
							}}
						</Field>

						<DialogFooter>
							<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
								取消
							</Button>
							<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
								{([canSubmit]) => (
									<Button type="submit" disabled={!canSubmit || isPending}>
										{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										{isEdit ? "保存" : "创建"}
									</Button>
								)}
							</form.Subscribe>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
