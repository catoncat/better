import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
import { LineSelect } from "@/components/select/line-select";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
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
import { Textarea } from "@/components/ui/textarea";
import type { client } from "@/lib/eden";

type StencilUsageCreateInput = Parameters<(typeof client.api)["stencil-usage-records"]["post"]>[0];

const formSchema = z.object({
	stencilId: z.string().min(1, "请输入钢网编号"),
	runNo: z.string().optional(),
	lineCode: z.string().optional(),
	recordDate: z.string().min(1, "请选择记录时间"),
	stencilThickness: z.number().optional(),
	productModel: z.string().optional(),
	printCount: z.number().optional(),
	totalPrintCount: z.number().optional(),
	replacedAt: z.string().optional(),
	checkDeform: z.boolean().optional(),
	checkHoleDamage: z.boolean().optional(),
	checkSealIntact: z.boolean().optional(),
	tensionValues: z.string().optional(),
	usedBy: z.string().optional(),
	confirmedBy: z.string().optional(),
	remark: z.string().optional(),
	lifeLimit: z.number().optional(),
}) satisfies z.ZodType<StencilUsageCreateInput>;

export type StencilUsageFormValues = z.infer<typeof formSchema>;

interface StencilUsageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: StencilUsageFormValues) => Promise<void>;
	isSubmitting?: boolean;
	defaultRunNo?: string;
	defaultLineCode?: string;
}

const buildDefaultValues = (defaults?: {
	runNo?: string;
	lineCode?: string;
}): StencilUsageFormValues => ({
	stencilId: "",
	runNo: defaults?.runNo ?? "",
	lineCode: defaults?.lineCode ?? "",
	recordDate: "",
	stencilThickness: undefined,
	productModel: "",
	printCount: undefined,
	totalPrintCount: undefined,
	replacedAt: "",
	checkDeform: undefined,
	checkHoleDamage: undefined,
	checkSealIntact: undefined,
	tensionValues: "",
	usedBy: "",
	confirmedBy: "",
	remark: "",
	lifeLimit: undefined,
});

const booleanOptions = [
	{ label: "未填写", value: "unset" },
	{ label: "通过", value: "true" },
	{ label: "异常", value: "false" },
];

export function StencilUsageDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	defaultRunNo,
	defaultLineCode,
}: StencilUsageDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues({ runNo: defaultRunNo, lineCode: defaultLineCode }),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: StencilUsageCreateInput = {
				stencilId: value.stencilId.trim(),
				runNo: value.runNo?.trim() || undefined,
				lineCode: value.lineCode?.trim() || undefined,
				recordDate: value.recordDate,
				stencilThickness: value.stencilThickness ?? undefined,
				productModel: value.productModel?.trim() || undefined,
				printCount: value.printCount ?? undefined,
				totalPrintCount: value.totalPrintCount ?? undefined,
				replacedAt: value.replacedAt || undefined,
				checkDeform: value.checkDeform,
				checkHoleDamage: value.checkHoleDamage,
				checkSealIntact: value.checkSealIntact,
				tensionValues: value.tensionValues?.trim() || undefined,
				usedBy: value.usedBy?.trim() || undefined,
				confirmedBy: value.confirmedBy?.trim() || undefined,
				remark: value.remark?.trim() || undefined,
				lifeLimit: value.lifeLimit ?? undefined,
			};

			await onSubmit(normalized);
			form.reset(buildDefaultValues({ runNo: defaultRunNo, lineCode: defaultLineCode }));
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset(buildDefaultValues({ runNo: defaultRunNo, lineCode: defaultLineCode }));
		}
	}, [defaultLineCode, defaultRunNo, form, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[840px]">
				<DialogHeader>
					<DialogTitle>新增钢网使用记录</DialogTitle>
					<DialogDescription>记录钢网使用次数、检查结果与责任人。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="stencilId" label="钢网编号">
							{(field) => (
								<Input
									placeholder="例如: ST-001"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="runNo" label="关联批次号 (可选)">
							{(field) => (
								<Input
									placeholder="例如: RUN-2025-001"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="lineCode" label="产线 (可选)">
							{(field) => (
								<LineSelect
									value={field.state.value || ""}
									onValueChange={(value) => field.handleChange(value)}
									placeholder="选择产线"
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="recordDate" label="记录时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="stencilThickness" label="钢网厚度(mm) - 选填">
							{(field) => (
								<Input
									type="number"
									step="0.01"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
						<Field form={form} name="productModel" label="产品型号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: PCB-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="printCount" label="本次印刷(次) - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
						<Field form={form} name="totalPrintCount" label="累计印刷(次) - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
						<Field form={form} name="lifeLimit" label="寿命上限(次) - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="replacedAt" label="更换时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="usedBy" label="使用人 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 张工"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="confirmedBy" label="确认人 - 选填">
							{(field) => (
								<Input
									placeholder="例如: QC"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="checkDeform" label="变形检查 - 选填">
							{(field) => (
								<Select
									value={
										field.state.value === undefined ? "unset" : field.state.value ? "true" : "false"
									}
									onValueChange={(value) => {
										if (value === "unset") {
											field.handleChange(undefined);
											return;
										}
										field.handleChange(value === "true");
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择结果" />
									</SelectTrigger>
									<SelectContent>
										{booleanOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="checkHoleDamage" label="破损检查 - 选填">
							{(field) => (
								<Select
									value={
										field.state.value === undefined ? "unset" : field.state.value ? "true" : "false"
									}
									onValueChange={(value) => {
										if (value === "unset") {
											field.handleChange(undefined);
											return;
										}
										field.handleChange(value === "true");
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择结果" />
									</SelectTrigger>
									<SelectContent>
										{booleanOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="checkSealIntact" label="密封检查 - 选填">
							{(field) => (
								<Select
									value={
										field.state.value === undefined ? "unset" : field.state.value ? "true" : "false"
									}
									onValueChange={(value) => {
										if (value === "unset") {
											field.handleChange(undefined);
											return;
										}
										field.handleChange(value === "true");
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择结果" />
									</SelectTrigger>
									<SelectContent>
										{booleanOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="tensionValues" label="张力值 - 选填">
							{(field) => (
								<Textarea
									rows={2}
									placeholder="可填写 JSON 或文本说明"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="remark" label="备注 - 选填">
							{(field) => (
								<Textarea
									rows={2}
									placeholder="补充说明"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在保存..." : "保存记录"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
