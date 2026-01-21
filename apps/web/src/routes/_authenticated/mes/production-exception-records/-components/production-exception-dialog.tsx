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
import { Textarea } from "@/components/ui/textarea";
import type { client } from "@/lib/eden";

type ProductionExceptionCreateInput = Parameters<
	(typeof client.api)["production-exception-records"]["post"]
>[0];

const formSchema = z.object({
	lineCode: z.string().optional(),
	jobNo: z.string().optional(),
	assemblyNumber: z.string().optional(),
	revision: z.string().optional(),
	shipDate: z.string().optional(),
	customer: z.string().optional(),
	qty: z.number().optional(),
	lineNo: z.string().optional(),
	downtimeMinutes: z.number().optional(),
	downtimeRange: z.string().optional(),
	impact: z.string().optional(),
	description: z.string().min(1, "请输入异常描述"),
	issuedBy: z.string().min(1, "请输入报告人"),
	issuedAt: z.string().min(1, "请选择发生时间"),
	correctiveAction: z.string().optional(),
	confirmedBy: z.string().optional(),
	confirmedAt: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<ProductionExceptionCreateInput>;

export type ProductionExceptionFormValues = z.infer<typeof formSchema>;

interface ProductionExceptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ProductionExceptionFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): ProductionExceptionFormValues => ({
	lineCode: "",
	jobNo: "",
	assemblyNumber: "",
	revision: "",
	shipDate: "",
	customer: "",
	qty: undefined,
	lineNo: "",
	downtimeMinutes: undefined,
	downtimeRange: "",
	impact: "",
	description: "",
	issuedBy: "",
	issuedAt: "",
	correctiveAction: "",
	confirmedBy: "",
	confirmedAt: "",
	remark: "",
});

export function ProductionExceptionDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: ProductionExceptionDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: ProductionExceptionCreateInput = {
				lineCode: value.lineCode?.trim() || undefined,
				jobNo: value.jobNo?.trim() || undefined,
				assemblyNumber: value.assemblyNumber?.trim() || undefined,
				revision: value.revision?.trim() || undefined,
				shipDate: value.shipDate || undefined,
				customer: value.customer?.trim() || undefined,
				qty: value.qty ?? undefined,
				lineNo: value.lineNo?.trim() || undefined,
				downtimeMinutes: value.downtimeMinutes ?? undefined,
				downtimeRange: value.downtimeRange?.trim() || undefined,
				impact: value.impact?.trim() || undefined,
				description: value.description.trim(),
				issuedBy: value.issuedBy.trim(),
				issuedAt: value.issuedAt,
				correctiveAction: value.correctiveAction?.trim() || undefined,
				confirmedBy: value.confirmedBy?.trim() || undefined,
				confirmedAt: value.confirmedAt || undefined,
				remark: value.remark?.trim() || undefined,
			};

			await onSubmit(normalized);
			form.reset(buildDefaultValues());
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset(buildDefaultValues());
		}
	}, [open, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[900px]">
				<DialogHeader>
					<DialogTitle>新增生产异常记录</DialogTitle>
					<DialogDescription>记录生产异常的影响、停机与处理措施。</DialogDescription>
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
						<Field form={form} name="jobNo" label="工单号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: WO-2026-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="assemblyNumber" label="装配号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: ASSY-01"
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
						<Field form={form} name="customer" label="客户 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 客户A"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="revision" label="版本 - 选填">
							{(field) => (
								<Input
									placeholder="例如: Rev A"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="shipDate" label="出货日期 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="qty" label="数量 - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(
											e.target.value ? Number(e.target.value) : undefined,
										)
									}
								/>
							)}
						</Field>
						<Field form={form} name="lineNo" label="线别 - 选填">
							{(field) => (
								<Input
									placeholder="例如: L1"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="downtimeMinutes" label="停机分钟 - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(
											e.target.value ? Number(e.target.value) : undefined,
										)
									}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="downtimeRange" label="停机区间 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 10:00-10:30"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="impact" label="影响 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 延误出货"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="issuedAt" label="发生时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="issuedBy" label="报告人">
							{(field) => (
								<Input
									placeholder="例如: 主管"
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

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="description" label="异常描述">
							{(field) => (
								<Textarea
									rows={3}
									placeholder="描述异常现象"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="correctiveAction" label="纠正措施 - 选填">
							{(field) => (
								<Textarea
									rows={3}
									placeholder="处理措施说明"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="confirmedAt" label="确认时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
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
