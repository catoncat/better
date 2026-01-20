import { useForm } from "@tanstack/react-form";
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
import type { WorkOrder } from "@/hooks/use-work-orders";
import { PROCESS_TYPE_MAP } from "@/lib/constants";

const releaseSchema = z.object({
	lineCode: z.string().min(1, "请选择线体"),
});

export type WorkOrderReleaseFormValues = z.infer<typeof releaseSchema>;

interface WorkOrderReleaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: WorkOrderReleaseFormValues) => Promise<void>;
	isSubmitting?: boolean;
	workOrder: WorkOrder | null;
}

export function WorkOrderReleaseDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	workOrder,
}: WorkOrderReleaseDialogProps) {
	const routingProcessType = workOrder?.routing?.processType;
	const routingProcessLabel = routingProcessType
		? PROCESS_TYPE_MAP[routingProcessType] ?? routingProcessType
		: "未设置";

	const form = useForm({
		defaultValues: {
			lineCode: "",
		},
		validators: {
			onSubmit: releaseSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
			form.reset();
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle>发布工单</DialogTitle>
					<DialogDescription>为工单 {workOrder?.woNo} 选择目标线体后发布。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="lineCode" label="目标线体">
						{(field) => (
							<LineSelect
								value={field.state.value}
								onValueChange={field.handleChange}
								placeholder="选择线体"
							/>
						)}
					</Field>
					<div className="text-xs text-muted-foreground">
						路由工艺：{routingProcessLabel}
					</div>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在发布..." : "发布工单"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
