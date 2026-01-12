import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import * as z from "zod";
import { LineSelect } from "@/components/select/line-select";
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
import type { WorkOrder } from "@/hooks/use-work-orders";

const runSchema = z.object({
	lineCode: z.string().min(1, "线体编码不能为空"),
	shiftCode: z.string().optional(),
	changeoverNo: z.string().optional(),
});

export type RunFormValues = z.infer<typeof runSchema>;

interface RunCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: RunFormValues) => Promise<void>;
	isSubmitting?: boolean;
	workOrder: WorkOrder | null;
}

const getDispatchedLineCode = (workOrder: WorkOrder | null) => {
	const meta = (workOrder as { meta?: unknown } | null)?.meta;
	if (!meta || typeof meta !== "object") return null;
	const dispatch = (meta as { dispatch?: unknown }).dispatch;
	if (!dispatch || typeof dispatch !== "object") return null;
	const lineCode = (dispatch as { lineCode?: unknown }).lineCode;
	return typeof lineCode === "string" && lineCode.trim() ? lineCode.trim() : null;
};

export function RunCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	workOrder,
}: RunCreateDialogProps) {
	const dispatchedLineCode = getDispatchedLineCode(workOrder);
	const defaultValues: RunFormValues = {
		lineCode: dispatchedLineCode ?? "",
		shiftCode: "Day",
		changeoverNo: "",
	};

	const form = useForm({
		defaultValues,
		validators: {
			onChange: runSchema,
		},
		onSubmit: async ({ value: values }) => {
			await onSubmit({
				...values,
				shiftCode: values.shiftCode?.trim() || undefined,
				changeoverNo: values.changeoverNo?.trim() || undefined,
			});
			form.reset();
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			lineCode: dispatchedLineCode ?? "",
			shiftCode: "Day",
			changeoverNo: "",
		});
	}, [dispatchedLineCode, form, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>创建生产批次 (Run)</DialogTitle>
					<DialogDescription>为工单 {workOrder?.woNo} 创建一个新的生产运行批次。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="lineCode" label="线体编码">
						{(field) => (
							<LineSelect
								value={field.state.value}
								onValueChange={field.handleChange}
								placeholder="选择线体"
								disabled={Boolean(dispatchedLineCode)}
							/>
						)}
					</Field>
					<Field form={form} name="shiftCode" label="班次编码">
						{(field) => (
							<Input
								placeholder="Day / Night"
								value={field.state.value ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<Field form={form} name="changeoverNo" label="换线单号 (可选)">
						{(field) => (
							<Input
								value={field.state.value ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在创建..." : "创建批次"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
