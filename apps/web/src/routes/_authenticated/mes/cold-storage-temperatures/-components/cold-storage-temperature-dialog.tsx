import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
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
import type { client } from "@/lib/eden";

type ColdStorageTemperatureCreateInput = Parameters<
	(typeof client.api)["cold-storage-temperature-records"]["post"]
>[0];

const formSchema = z.object({
	measuredAt: z.string().min(1, "请选择测量时间"),
	temperature: z.number(),
	measuredBy: z.string().min(1, "请输入测量人员"),
	reviewedBy: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<ColdStorageTemperatureCreateInput>;

export type ColdStorageTemperatureFormValues = z.infer<typeof formSchema>;

interface ColdStorageTemperatureDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ColdStorageTemperatureFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): ColdStorageTemperatureFormValues => ({
	measuredAt: "",
	temperature: 0,
	measuredBy: "",
	reviewedBy: "",
	remark: "",
});

export function ColdStorageTemperatureDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: ColdStorageTemperatureDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: ColdStorageTemperatureCreateInput = {
				measuredAt: value.measuredAt,
				temperature: value.temperature,
				measuredBy: value.measuredBy.trim(),
				reviewedBy: value.reviewedBy?.trim() || undefined,
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
			<DialogContent className="sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle>新增冷藏温度记录</DialogTitle>
					<DialogDescription>记录冷藏柜的温度与测量人员。</DialogDescription>
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
						<Field form={form} name="measuredAt" label="测量时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="temperature" label="温度 (℃)">
							{(field) => (
								<Input
									type="number"
									step="0.1"
									placeholder="例如: 4.5"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(Number(e.target.value))}
								/>
							)}
						</Field>
						<Field form={form} name="measuredBy" label="测量人员">
							{(field) => (
								<Input
									placeholder="例如: 张工"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="reviewedBy" label="复核人员 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 王工"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="remark" label="备注 - 选填">
							{(field) => (
								<Input
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
