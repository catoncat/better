import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useRouteSearch } from "@/hooks/use-routes";

const PICK_STATUS_OPTIONS = [
	{ value: "1", label: "未领料" },
	{ value: "2", label: "部分领料" },
	{ value: "3", label: "全部领料" },
	{ value: "4", label: "超额领料" },
];

const workOrderSchema = z.object({
	woNo: z.string().min(1, "工单号不能为空"),
	productCode: z.string().min(1, "产品编码不能为空"),
	plannedQty: z.number().min(1, "计划数量必须大于0"),
	routingCode: z.string(),
	pickStatus: z.enum(["1", "2", "3", "4"]),
	dueDate: z.date().optional(),
});

type WorkOrderSubmitValues = {
	woNo: string;
	productCode: string;
	plannedQty: number;
	routingCode?: string;
	pickStatus?: string;
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
	const form = useForm({
		defaultValues: {
			woNo: "",
			productCode: "",
			plannedQty: 0,
			routingCode: "",
			pickStatus: "3" as "1" | "2" | "3" | "4",
		} as {
			woNo: string;
			productCode: string;
			plannedQty: number;
			routingCode: string;
			pickStatus: "1" | "2" | "3" | "4";
			dueDate?: Date;
		},
		validators: {
			onSubmit: workOrderSchema,
		},
		onSubmit: async ({ value }) => {
			const routingCode = value.routingCode?.trim() || undefined;
			const payload: WorkOrderSubmitValues = {
				woNo: value.woNo,
				productCode: value.productCode,
				plannedQty: value.plannedQty,
				routingCode,
				pickStatus: value.pickStatus,
				dueDate: value.dueDate ? value.dueDate.toISOString() : undefined,
			};
			await onSubmit(payload);
			form.reset();
			onOpenChange(false);
		},
	});

	const [routeSearch, setRouteSearch] = useState(form.getFieldValue("routingCode") ?? "");
	const { data: routeOptions } = useRouteSearch(routeSearch);
	const routeComboboxOptions =
		routeOptions?.items.map((route) => ({
			value: route.code,
			label: `${route.code} · ${route.name}`,
		})) ?? [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>接收外部工单</DialogTitle>
					<DialogDescription>手动输入外部系统(ERP)的工单信息进行接收。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="woNo" label="工单号">
						{(field) => (
							<Input
								placeholder="WO-"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<Field form={form} name="productCode" label="产品编码">
						{(field) => (
							<Input
								placeholder="P-"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<Field form={form} name="plannedQty" label="计划数量">
						{(field) => (
							<Input
								type="number"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(Number(e.target.value))}
							/>
						)}
					</Field>
					<Field form={form} name="routingCode" label="路由编码">
						{(field) => (
							<Combobox
								options={routeComboboxOptions}
								value={field.state.value || ""}
								onValueChange={(value) => field.handleChange(value || "")}
								placeholder="搜索并选择路由"
								searchPlaceholder="输入路由编码或名称"
								emptyText="未找到路由"
								searchValue={routeSearch}
								onSearchValueChange={setRouteSearch}
							/>
						)}
					</Field>
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
					<Field form={form} name="dueDate" label="到期日期">
						{(field) => <DatePicker value={field.state.value} onChange={field.handleChange} />}
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在接收..." : "接收工单"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
