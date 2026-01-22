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

type DailyQcCreateInput = Parameters<(typeof client.api)["daily-qc-records"]["post"]>[0];

const formSchema = z.object({
	lineCode: z.string().optional(),
	customer: z.string().optional(),
	station: z.string().optional(),
	assemblyNumber: z.string().optional(),
	jobNo: z.string().optional(),
	jobQty: z.number().optional(),
	shiftCode: z.string().optional(),
	timeWindow: z.string().optional(),
	defectSummary: z.string().optional(),
	yellowCardNo: z.string().optional(),
	totalParts: z.number().optional(),
	inspectedQty: z.number().optional(),
	defectBoardQty: z.number().optional(),
	defectBoardRate: z.number().optional(),
	defectQty: z.number().optional(),
	defectRate: z.number().optional(),
	correctiveAction: z.string().optional(),
	inspectedBy: z.string().min(1, "请输入检验人"),
	inspectedAt: z.string().min(1, "请选择检验时间"),
	reviewedBy: z.string().optional(),
	reviewedAt: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<DailyQcCreateInput>;

export type DailyQcFormValues = z.infer<typeof formSchema>;

interface DailyQcDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: DailyQcFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): DailyQcFormValues => ({
	lineCode: "",
	customer: "",
	station: "",
	assemblyNumber: "",
	jobNo: "",
	jobQty: undefined,
	shiftCode: "",
	timeWindow: "",
	defectSummary: "",
	yellowCardNo: "",
	totalParts: undefined,
	inspectedQty: undefined,
	defectBoardQty: undefined,
	defectBoardRate: undefined,
	defectQty: undefined,
	defectRate: undefined,
	correctiveAction: "",
	inspectedBy: "",
	inspectedAt: "",
	reviewedBy: "",
	reviewedAt: "",
	remark: "",
});

export function DailyQcDialog({ open, onOpenChange, onSubmit, isSubmitting }: DailyQcDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: DailyQcCreateInput = {
				lineCode: value.lineCode?.trim() || undefined,
				customer: value.customer?.trim() || undefined,
				station: value.station?.trim() || undefined,
				assemblyNumber: value.assemblyNumber?.trim() || undefined,
				jobNo: value.jobNo?.trim() || undefined,
				jobQty: value.jobQty ?? undefined,
				shiftCode: value.shiftCode?.trim() || undefined,
				timeWindow: value.timeWindow?.trim() || undefined,
				defectSummary: value.defectSummary?.trim() || undefined,
				yellowCardNo: value.yellowCardNo?.trim() || undefined,
				totalParts: value.totalParts ?? undefined,
				inspectedQty: value.inspectedQty ?? undefined,
				defectBoardQty: value.defectBoardQty ?? undefined,
				defectBoardRate: value.defectBoardRate ?? undefined,
				defectQty: value.defectQty ?? undefined,
				defectRate: value.defectRate ?? undefined,
				correctiveAction: value.correctiveAction?.trim() || undefined,
				inspectedBy: value.inspectedBy.trim(),
				inspectedAt: value.inspectedAt,
				reviewedBy: value.reviewedBy?.trim() || undefined,
				reviewedAt: value.reviewedAt || undefined,
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
					<DialogTitle>新增日常QC记录</DialogTitle>
					<DialogDescription>记录每日 QC 检验统计与异常信息。</DialogDescription>
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
						<Field form={form} name="jobNo" label="任务/工单号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: WO-2026-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
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
						<Field form={form} name="station" label="工序/站位 - 选填">
							{(field) => (
								<Input
									placeholder="例如: AOI"
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
						<Field form={form} name="jobQty" label="生产数量 - 选填">
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
						<Field form={form} name="shiftCode" label="班次 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 白班"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="timeWindow" label="时间段 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 08:00-12:00"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="yellowCardNo" label="黄卡编号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: Y-001"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="totalParts" label="生产数量 - 选填">
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
						<Field form={form} name="inspectedQty" label="检验数量 - 选填">
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
						<Field form={form} name="defectBoardQty" label="不良板数 - 选填">
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
						<Field form={form} name="defectBoardRate" label="不良板率 - 选填">
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
						<Field form={form} name="defectQty" label="不良点数 - 选填">
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
						<Field form={form} name="defectRate" label="不良率 - 选填">
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
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="inspectedBy" label="检验人">
							{(field) => (
								<Input
									placeholder="例如: QC"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="inspectedAt" label="检验时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="reviewedBy" label="复核人 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 主管"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="reviewedAt" label="复核时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="defectSummary" label="不良汇总 - 选填">
							{(field) => (
								<Textarea
									rows={2}
									placeholder="可填写不良统计或 JSON"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="correctiveAction" label="改善措施 - 选填">
							{(field) => (
								<Textarea
									rows={2}
									placeholder="改善说明"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

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
