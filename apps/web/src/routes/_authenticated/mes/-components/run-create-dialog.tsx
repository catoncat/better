import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
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
import { useLines } from "@/hooks/use-lines";
import type { WorkOrder } from "@/hooks/use-work-orders";

const runSchema = z.object({
	lineCode: z.string().min(1, "线体编码不能为空"),
	planQty: z.number().int().min(1, "计划数量必须大于 0"),
	// NOTE: shiftCode 和 changeoverNo 暂时隐藏，待流程定义后再启用
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
	const effectivePickStatus = workOrder?.erpStatus ? workOrder?.erpPickStatus : workOrder?.pickStatus;
	const isMaterialReady = ["3", "4"].includes(effectivePickStatus ?? "");
	const dispatchedLineCode = getDispatchedLineCode(workOrder);
	const defaultPlanQty = workOrder?.plannedQty ?? 1;
	const routingProcessType = workOrder?.routing?.processType;
	const { data: linesData, isLoading: linesLoading } = useLines();
	const hasMatchingLines = useMemo(() => {
		if (!routingProcessType) return true;
		return (linesData?.items ?? []).some((line) => line.processType === routingProcessType);
	}, [linesData?.items, routingProcessType]);
	const defaultValues: RunFormValues = {
		lineCode: dispatchedLineCode ?? "",
		planQty: defaultPlanQty,
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
			planQty: workOrder?.plannedQty ?? 1,
			shiftCode: "Day",
			changeoverNo: "",
		});
	}, [dispatchedLineCode, form, open, workOrder?.plannedQty]);

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
					{workOrder && !isMaterialReady && (
						<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
							当前工单物料未完全领料，仍可创建批次，请注意物料准备。
						</div>
					)}
					<Field form={form} name="lineCode" label="线体编码">
						{(field) => (
							<LineSelect
								value={field.state.value}
								onValueChange={field.handleChange}
								placeholder="选择线体"
								processType={routingProcessType}
								disabled={Boolean(dispatchedLineCode)}
							/>
						)}
					</Field>
					{routingProcessType && !linesLoading && !hasMatchingLines && (
						<div className="text-xs text-muted-foreground">
							未找到匹配当前路由工艺的产线，请前往
							<Link
								to="/mes/lines"
								search={{ processType: routingProcessType }}
								className="mx-1 text-primary hover:underline"
							>
								产线管理
							</Link>
							创建。
						</div>
					)}
					<Field form={form} name="planQty" label="计划数量">
						{(field) => (
							<Input
								type="number"
								min={1}
								max={workOrder?.plannedQty ?? 10000}
								placeholder="本批次计划生产数量"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(Number(e.target.value))}
							/>
						)}
					</Field>
					{/* NOTE: shiftCode 和 changeoverNo 暂时隐藏，待流程定义后再启用 */}
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
