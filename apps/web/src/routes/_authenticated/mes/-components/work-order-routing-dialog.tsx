import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import * as z from "zod";
import { RouteSelect } from "@/components/select/route-select";
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

const routingSchema = z.object({
	routingCode: z.string().min(1, "请选择路由"),
});

export type WorkOrderRoutingFormValues = z.infer<typeof routingSchema>;

interface WorkOrderRoutingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: WorkOrderRoutingFormValues) => Promise<void>;
	isSubmitting?: boolean;
	workOrder: WorkOrder | null;
}

export function WorkOrderRoutingDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	workOrder,
}: WorkOrderRoutingDialogProps) {
	const form = useForm({
		defaultValues: {
			routingCode: workOrder?.routing?.code ?? "",
		},
		validators: {
			onSubmit: routingSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
			onOpenChange(false);
		},
	});

	useEffect(() => {
		form.reset({
			routingCode: workOrder?.routing?.code ?? "",
		});
	}, [workOrder, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>关联路由</DialogTitle>
					<DialogDescription>为工单 {workOrder?.woNo} 选择工艺路线。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="routingCode" label="路由工艺">
						{(field) => (
							<RouteSelect
								value={field.state.value}
								onValueChange={field.handleChange}
								placeholder="选择路由"
							/>
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
