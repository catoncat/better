import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import type { WorkOrder } from "@/hooks/use-work-orders";

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
	const form = useForm<WorkOrderReleaseFormValues>({
		resolver: zodResolver(releaseSchema),
		defaultValues: {
			lineCode: "",
		},
	});

	const handleFormSubmit = async (values: WorkOrderReleaseFormValues) => {
		await onSubmit(values);
		form.reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle>发布工单</DialogTitle>
					<DialogDescription>为工单 {workOrder?.woNo} 选择目标线体后发布。</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="lineCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>目标线体</FormLabel>
									<FormControl>
										<LineSelect
											value={field.value}
											onValueChange={field.onChange}
											placeholder="选择线体"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "正在发布..." : "发布工单"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
