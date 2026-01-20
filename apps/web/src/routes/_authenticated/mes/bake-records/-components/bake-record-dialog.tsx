import { useForm } from "@tanstack/react-form";
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
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import type { client } from "@/lib/eden";

type BakeRecordCreateInput = Parameters<typeof client.api["bake-records"].post>[0];

const formSchema = z
	.object({
		runNo: z.string().optional(),
		materialCode: z.string().optional(),
		lotNo: z.string().optional(),
		itemCode: z.string().min(1, "请输入产品/物料 P/N"),
		bakeProcess: z.string().min(1, "请输入烘烤工序"),
		bakeQty: z.string().min(1, "请输入烘烤数量"),
		bakeTemperature: z.number().optional(),
		durationHours: z.string().optional(),
		inAt: z.string().min(1, "请选择放入时间"),
		inBy: z.string().min(1, "请输入放入负责人"),
		outAt: z.string().min(1, "请选择取出时间"),
		outBy: z.string().min(1, "请输入取出负责人"),
		confirmedBy: z.string().optional(),
	})
	satisfies z.ZodType<BakeRecordCreateInput>;

export type BakeRecordFormValues = z.infer<typeof formSchema>;

interface BakeRecordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: BakeRecordFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): BakeRecordFormValues => ({
	runNo: "",
	materialCode: "",
	lotNo: "",
	itemCode: "",
	bakeProcess: "",
	bakeQty: "",
	bakeTemperature: undefined,
	durationHours: "",
	inAt: "",
	inBy: "",
	outAt: "",
	outBy: "",
	confirmedBy: "",
});

export function BakeRecordDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: BakeRecordDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized = {
				runNo: value.runNo?.trim() || undefined,
				materialCode: value.materialCode?.trim() || undefined,
				lotNo: value.lotNo?.trim() || undefined,
				itemCode: value.itemCode.trim(),
				bakeProcess: value.bakeProcess.trim(),
				bakeQty: value.bakeQty.trim(),
				bakeTemperature: value.bakeTemperature ?? undefined,
				durationHours: value.durationHours?.trim() || undefined,
				inAt: value.inAt,
				inBy: value.inBy.trim(),
				outAt: value.outAt,
				outBy: value.outBy.trim(),
				confirmedBy: value.confirmedBy?.trim() || undefined,
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
					<DialogTitle>新增烘烤记录</DialogTitle>
					<DialogDescription>录入 SMT 产线烘烤过程时间与负责人信息。</DialogDescription>
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
						<Field form={form} name="materialCode" label="物料编码 (可选)">
							{(field) => (
								<Input
									placeholder="例如: 853513"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="lotNo" label="物料批次号 (可选)">
							{(field) => (
								<Input
									placeholder="例如: LOT-240815"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="itemCode" label="产品/物料 P/N">
							{(field) => (
								<Input
									placeholder="例如: 853513"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="bakeProcess" label="烘烤工序">
							{(field) => (
								<Input
									placeholder="例如: PCB/BGA"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="bakeQty" label="烘烤数量">
							{(field) => (
								<Input
									placeholder="例如: 100 或 20+20"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="bakeTemperature" label="烘烤温度 (℃) - 选填">
							{(field) => (
								<Input
									type="number"
									step="0.1"
									placeholder="例如: 120"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
						<Field form={form} name="durationHours" label="时长 (小时) - 选填">
							{(field) => (
								<Input
									placeholder="例如: 4-6"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="inAt" label="放入时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
								/>
							)}
						</Field>
						<Field form={form} name="inBy" label="放入负责人">
							{(field) => (
								<Input
									placeholder="例如: 珍"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="outAt" label="取出时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) =>
										field.handleChange(date ? date.toISOString() : "")
									}
								/>
							)}
						</Field>
						<Field form={form} name="outBy" label="取出负责人">
							{(field) => (
								<Input
									placeholder="例如: 萍"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<Field form={form} name="confirmedBy" label="确认人 - 选填">
						{(field) => (
							<Input
								placeholder="例如: 萍"
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
