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

type OvenProgramCreateInput = Parameters<(typeof client.api)["oven-program-records"]["post"]>[0];

const formSchema = z.object({
	lineCode: z.string().optional(),
	equipmentId: z.string().optional(),
	recordDate: z.string().min(1, "请选择使用时间"),
	productName: z.string().min(1, "请输入产品名称"),
	programName: z.string().min(1, "请输入炉温程式"),
	usedBy: z.string().min(1, "请输入使用人"),
	confirmedBy: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<OvenProgramCreateInput>;

export type OvenProgramFormValues = z.infer<typeof formSchema>;

interface OvenProgramDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: OvenProgramFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): OvenProgramFormValues => ({
	lineCode: "",
	equipmentId: "",
	recordDate: "",
	productName: "",
	programName: "",
	usedBy: "",
	confirmedBy: "",
	remark: "",
});

export function OvenProgramDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: OvenProgramDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: OvenProgramCreateInput = {
				lineCode: value.lineCode?.trim() || undefined,
				equipmentId: value.equipmentId?.trim() || undefined,
				recordDate: value.recordDate,
				productName: value.productName.trim(),
				programName: value.programName.trim(),
				usedBy: value.usedBy.trim(),
				confirmedBy: value.confirmedBy?.trim() || undefined,
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
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>新增炉温程式记录</DialogTitle>
					<DialogDescription>记录炉温程式使用信息与责任人。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="programName" label="炉温程式">
							{(field) => (
								<Input
									placeholder="例如: OVEN-PROG-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="productName" label="产品名称">
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
						<Field form={form} name="recordDate" label="使用时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
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
						<Field form={form} name="equipmentId" label="设备编号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: OVEN-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="usedBy" label="使用人">
							{(field) => (
								<Input
									placeholder="例如: 王工"
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
