import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { useRouteSearch } from "@/hooks/use-routes";

const workOrderSchema = z.object({
	woNo: z.string().min(1, "工单号不能为空"),
	productCode: z.string().min(1, "产品编码不能为空"),
	plannedQty: z.coerce.number().min(1, "计划数量必须大于0"),
	routingCode: z.string().optional(),
	dueDate: z.date().optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderSchema>;
type WorkOrderSubmitValues = {
	woNo: string;
	productCode: string;
	plannedQty: number;
	routingCode?: string;
	dueDate?: string;
};

interface WorkOrderReceiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: WorkOrderSubmitValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function WorkOrderReceiveDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: WorkOrderReceiveDialogProps) {
	const form = useForm<WorkOrderFormValues>({
		resolver: zodResolver(workOrderSchema),
		defaultValues: {
			woNo: "",
			productCode: "",
			plannedQty: 0,
			routingCode: "PCBA-STD-V1",
			dueDate: undefined,
		},
	});

	const [routeSearch, setRouteSearch] = useState(form.getValues("routingCode") ?? "");
	const { data: routeOptions } = useRouteSearch(routeSearch);
	const routeComboboxOptions =
		routeOptions?.items.map((route) => ({
			value: route.code,
			label: `${route.code} · ${route.name}`,
		})) ?? [];

	const handleFormSubmit = async (values: WorkOrderFormValues) => {
		const routingCode = values.routingCode?.trim() || undefined;
		const payload: WorkOrderSubmitValues = {
			woNo: values.woNo,
			productCode: values.productCode,
			plannedQty: values.plannedQty,
			routingCode,
			dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
		};
		await onSubmit(payload);
		form.reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>接收外部工单</DialogTitle>
					<DialogDescription>手动输入外部系统(ERP)的工单信息进行接收。</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="woNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>工单号</FormLabel>
									<FormControl>
										<Input placeholder="WO-..." {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="productCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>产品编码</FormLabel>
									<FormControl>
										<Input placeholder="P-..." {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="plannedQty"
							render={({ field }) => (
								<FormItem>
									<FormLabel>计划数量</FormLabel>
									<FormControl>
										<Input type="number" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="routingCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>路由编码</FormLabel>
									<FormControl>
										<Combobox
											options={routeComboboxOptions}
											value={field.value || ""}
											onValueChange={(value) => field.onChange(value || undefined)}
											placeholder="搜索并选择路由"
											searchPlaceholder="输入路由编码或名称"
											emptyText="未找到路由"
											searchValue={routeSearch}
											onSearchValueChange={setRouteSearch}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="dueDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>到期日期</FormLabel>
									<FormControl>
										<DatePicker value={field.value} onChange={field.onChange} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "正在接收..." : "接收工单"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
