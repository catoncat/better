import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import * as z from "zod";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { WorkOrder } from "@/hooks/use-work-orders";

const pickStatusSchema = z.object({
	pickStatus: z.enum(["1", "2", "3", "4"]),
});

export type PickStatusFormValues = z.infer<typeof pickStatusSchema>;

const PICK_STATUS_OPTIONS = [
	{ value: "1", label: "未领料" },
	{ value: "2", label: "部分领料" },
	{ value: "3", label: "全部领料" },
	{ value: "4", label: "超额领料" },
];

interface PickStatusDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: PickStatusFormValues) => Promise<void>;
	isSubmitting?: boolean;
	workOrder: WorkOrder | null;
}

export function PickStatusDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	workOrder,
}: PickStatusDialogProps) {
	const form = useForm({
		defaultValues: {
			pickStatus: (workOrder?.pickStatus as "1" | "2" | "3" | "4") ?? "3",
		},
		validators: {
			onSubmit: pickStatusSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
			onOpenChange(false);
		},
	});

	// Reset form when workOrder changes
	useEffect(() => {
		if (workOrder) {
			form.reset({
				pickStatus: (workOrder.pickStatus as "1" | "2" | "3" | "4") ?? "3",
			});
		}
	}, [workOrder, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>修改物料状态</DialogTitle>
					<DialogDescription>更新工单 {workOrder?.woNo} 的物料领取状态。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="pickStatus" label="物料状态">
						{(field) => (
							<Select
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v as "1" | "2" | "3" | "4")}
							>
								<SelectTrigger>
									<SelectValue placeholder="选择物料状态" />
								</SelectTrigger>
								<SelectContent>
									{PICK_STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在保存..." : "保存"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
