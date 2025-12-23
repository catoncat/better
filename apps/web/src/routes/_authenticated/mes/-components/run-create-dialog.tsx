import { zodResolver } from "@hookform/resolvers/zod";
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

export function RunCreateDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
	workOrder,
}: RunCreateDialogProps) {
	const form = useForm<RunFormValues>({
		resolver: zodResolver(runSchema),
		defaultValues: {
			lineCode: "",
			shiftCode: "Day",
			changeoverNo: "",
		},
	});

	const handleFormSubmit = async (values: RunFormValues) => {
		await onSubmit(values);
		form.reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>创建生产批次 (Run)</DialogTitle>
					<DialogDescription>为工单 {workOrder?.woNo} 创建一个新的生产运行批次。</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="lineCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>线体编码</FormLabel>
									<FormControl>
										<Input placeholder="LINE-01" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="shiftCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>班次编码</FormLabel>
									<FormControl>
										<Input placeholder="Day / Night" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="changeoverNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>换线单号 (可选)</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "正在创建..." : "创建批次"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
