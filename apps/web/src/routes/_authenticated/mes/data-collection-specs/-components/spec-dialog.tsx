import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
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
import {
	type DataCollectionSpec,
	useCreateDataCollectionSpec,
	useUpdateDataCollectionSpec,
} from "@/hooks/use-data-collection-specs";
import { useOperationList } from "@/hooks/use-operations";
import { DATA_TYPE_MAP, ITEM_TYPE_MAP, METHOD_MAP, TRIGGER_TYPE_MAP } from "./field-meta";

// Form schema
const formSchema = z.object({
	operationCode: z.string().min(1, "请选择工序"),
	name: z.string().min(1, "请输入采集项名称"),
	itemType: z.enum(["KEY", "OBSERVATION"]),
	dataType: z.enum(["NUMBER", "TEXT", "BOOLEAN", "JSON"]),
	method: z.enum(["AUTO", "MANUAL"]),
	triggerType: z.enum(["EVENT", "TIME", "EACH_UNIT", "EACH_CARRIER"]),
	isRequired: z.boolean(),
	isActive: z.boolean(),
	// Spec fields for NUMBER type
	specMin: z.number().optional(),
	specMax: z.number().optional(),
	specTarget: z.number().optional(),
	specLsl: z.number().optional(),
	specUsl: z.number().optional(),
	specUnit: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SpecDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	spec?: DataCollectionSpec | null;
}

export function SpecDialog({ open, onOpenChange, spec }: SpecDialogProps) {
	const createSpec = useCreateDataCollectionSpec();
	const updateSpec = useUpdateDataCollectionSpec();
	const { data: operationsData } = useOperationList({ pageSize: 100 });

	const isEdit = !!spec;

	// Parse spec from existing entity - wrapped in useCallback for stable reference
	const parseSpec = useCallback((specJson: unknown): Partial<FormValues> => {
		if (!specJson || typeof specJson !== "object") return {};
		const s = specJson as Record<string, unknown>;
		return {
			specMin: typeof s.min === "number" ? s.min : undefined,
			specMax: typeof s.max === "number" ? s.max : undefined,
			specTarget: typeof s.target === "number" ? s.target : undefined,
			specLsl: typeof s.lsl === "number" ? s.lsl : undefined,
			specUsl: typeof s.usl === "number" ? s.usl : undefined,
			specUnit: typeof s.unit === "string" ? s.unit : undefined,
		};
	}, []);

	const form = useForm({
		defaultValues: {
			operationCode: spec?.operationCode ?? "",
			name: spec?.name ?? "",
			itemType: (spec?.itemType ?? "KEY") as "KEY" | "OBSERVATION",
			dataType: (spec?.dataType ?? "NUMBER") as "NUMBER" | "TEXT" | "BOOLEAN" | "JSON",
			method: (spec?.method ?? "MANUAL") as "AUTO" | "MANUAL",
			triggerType: (spec?.triggerType ?? "EACH_UNIT") as
				| "EVENT"
				| "TIME"
				| "EACH_UNIT"
				| "EACH_CARRIER",
			isRequired: spec?.isRequired ?? false,
			isActive: spec?.isActive ?? true,
			...parseSpec(spec?.spec),
		} as FormValues,
		onSubmit: async ({ value }) => {
			// Build spec object
			const specObj: Record<string, unknown> = {};
			if (value.dataType === "NUMBER") {
				if (value.specMin !== undefined) specObj.min = value.specMin;
				if (value.specMax !== undefined) specObj.max = value.specMax;
				if (value.specTarget !== undefined) specObj.target = value.specTarget;
				if (value.specLsl !== undefined) specObj.lsl = value.specLsl;
				if (value.specUsl !== undefined) specObj.usl = value.specUsl;
				if (value.specUnit) specObj.unit = value.specUnit;
			}

			const specPayload =
				value.dataType === "NUMBER" && Object.keys(specObj).length > 0 ? specObj : null;

			const payload = {
				operationCode: value.operationCode.trim(),
				name: value.name.trim(),
				itemType: value.itemType,
				dataType: value.dataType,
				method: value.method,
				triggerType: value.triggerType,
				isRequired: value.isRequired,
				isActive: value.isActive,
				spec: specPayload,
			};

			if (isEdit && spec) {
				await updateSpec.mutateAsync({
					specId: spec.id,
					...payload,
				});
			} else {
				await createSpec.mutateAsync(payload);
			}
			onOpenChange(false);
		},
		validators: {
			onChange: formSchema,
		},
	});

	// Reset form when dialog opens/closes or spec changes
	useEffect(() => {
		if (open) {
			form.reset({
				operationCode: spec?.operationCode ?? "",
				name: spec?.name ?? "",
				itemType: (spec?.itemType ?? "KEY") as "KEY" | "OBSERVATION",
				dataType: (spec?.dataType ?? "NUMBER") as "NUMBER" | "TEXT" | "BOOLEAN" | "JSON",
				method: (spec?.method ?? "MANUAL") as "AUTO" | "MANUAL",
				triggerType: (spec?.triggerType ?? "EACH_UNIT") as
					| "EVENT"
					| "TIME"
					| "EACH_UNIT"
					| "EACH_CARRIER",
				isRequired: spec?.isRequired ?? false,
				isActive: spec?.isActive ?? true,
				...parseSpec(spec?.spec),
			} as FormValues);
		}
	}, [open, spec, form, parseSpec]);

	const isPending = createSpec.isPending || updateSpec.isPending;
	const currentDataType = form.getFieldValue("dataType");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑采集项" : "新建采集项"}</DialogTitle>
					<DialogDescription>配置生产过程中需要采集的数据规格。</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-4"
				>
					{/* Basic Info */}
					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="operationCode" label="工序" required>
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={isEdit}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择工序" />
									</SelectTrigger>
									<SelectContent>
										{operationsData?.items.map((op) => (
											<SelectItem key={op.code} value={op.code}>
												{op.code} - {op.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="name" label="采集项名称" required>
							{(field) => (
								<Input
									placeholder="例：焊接温度"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					{/* Type Settings */}
					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="itemType" label="采集项类型">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as "KEY" | "OBSERVATION")}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(ITEM_TYPE_MAP).map(([key, config]) => (
											<SelectItem key={key} value={key}>
												{config.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="dataType" label="数据类型">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "NUMBER" | "TEXT" | "BOOLEAN" | "JSON")
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(DATA_TYPE_MAP).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					{/* Method & Trigger */}
					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="method" label="采集方式">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as "AUTO" | "MANUAL")}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(METHOD_MAP).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="triggerType" label="触发方式">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "EVENT" | "TIME" | "EACH_UNIT" | "EACH_CARRIER")
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(TRIGGER_TYPE_MAP).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					{/* Spec fields - only show for NUMBER type */}
					{currentDataType === "NUMBER" && (
						<div className="space-y-3 rounded-lg border p-4">
							<h4 className="font-medium text-sm">数值规格</h4>
							<div className="grid grid-cols-3 gap-3">
								<Field form={form} name="specMin" label="最小值">
									{(field) => (
										<Input
											type="number"
											placeholder="最小值"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(v ? Number(v) : undefined);
											}}
										/>
									)}
								</Field>
								<Field form={form} name="specTarget" label="目标值">
									{(field) => (
										<Input
											type="number"
											placeholder="目标值"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(v ? Number(v) : undefined);
											}}
										/>
									)}
								</Field>
								<Field form={form} name="specMax" label="最大值">
									{(field) => (
										<Input
											type="number"
											placeholder="最大值"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(v ? Number(v) : undefined);
											}}
										/>
									)}
								</Field>
							</div>
							<div className="grid grid-cols-3 gap-3">
								<Field form={form} name="specLsl" label="规格下限 (LSL)">
									{(field) => (
										<Input
											type="number"
											placeholder="LSL"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(v ? Number(v) : undefined);
											}}
										/>
									)}
								</Field>
								<Field form={form} name="specUnit" label="单位">
									{(field) => (
										<Input
											placeholder="例：°C, mm"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value || undefined)}
										/>
									)}
								</Field>
								<Field form={form} name="specUsl" label="规格上限 (USL)">
									{(field) => (
										<Input
											type="number"
											placeholder="USL"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(v ? Number(v) : undefined);
											}}
										/>
									)}
								</Field>
							</div>
						</div>
					)}

					{/* Switches */}
					<div className="flex items-center gap-6">
						<Field form={form} name="isRequired" label="必填项">
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
									{isEdit ? "保存更改" : "创建采集项"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
