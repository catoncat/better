import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
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
	const form = useForm<PickStatusFormValues>({
		resolver: zodResolver(pickStatusSchema),
		defaultValues: {
			pickStatus: (workOrder?.pickStatus as "1" | "2" | "3" | "4") ?? "3",
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

	const handleFormSubmit = async (values: PickStatusFormValues) => {
		await onSubmit(values);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>修改物料状态</DialogTitle>
					<DialogDescription>更新工单 {workOrder?.woNo} 的物料领取状态。</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="pickStatus"
							render={({ field }) => (
								<FormItem>
									<FormLabel>物料状态</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="选择物料状态" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{PICK_STATUS_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "正在保存..." : "保存"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
