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

type StencilCleaningCreateInput = Parameters<
	(typeof client.api)["stencil-cleaning-records"]["post"]
>[0];

const formSchema = z.object({
	stencilId: z.string().min(1, "请输入钢网编号"),
	lineCode: z.string().optional(),
	cleanedAt: z.string().min(1, "请选择清洗时间"),
	cleanedBy: z.string().min(1, "请输入清洗人"),
	confirmedBy: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<StencilCleaningCreateInput>;

export type StencilCleaningFormValues = z.infer<typeof formSchema>;

interface StencilCleaningDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: StencilCleaningFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): StencilCleaningFormValues => ({
	stencilId: "",
	lineCode: "",
	cleanedAt: "",
	cleanedBy: "",
	confirmedBy: "",
	remark: "",
});

export function StencilCleaningDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: StencilCleaningDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: StencilCleaningCreateInput = {
				stencilId: value.stencilId.trim(),
				lineCode: value.lineCode?.trim() || undefined,
				cleanedAt: value.cleanedAt,
				cleanedBy: value.cleanedBy.trim(),
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
			<DialogContent className="sm:max-w-[640px]">
				<DialogHeader>
					<DialogTitle>新增钢网清洗记录</DialogTitle>
					<DialogDescription>记录钢网清洗时间与责任人。</DialogDescription>
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

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="cleanedAt" label="清洗时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
								/>
							)}
						</Field>
						<Field form={form} name="cleanedBy" label="清洗人">
							{(field) => (
								<Input
									placeholder="例如: 李工"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
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
