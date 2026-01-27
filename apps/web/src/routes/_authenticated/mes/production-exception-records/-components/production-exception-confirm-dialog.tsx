import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import type { ProductionExceptionRecord } from "@/hooks/use-production-exception-records";
import type { client } from "@/lib/eden";

type ProductionExceptionConfirmInput = Parameters<
	ReturnType<(typeof client.api)["production-exception-records"]>["confirm"]["post"]
>[0];

const formSchema = z.object({
	confirmedBy: z.string().min(1, "请输入确认人"),
	correctiveAction: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<ProductionExceptionConfirmInput>;

export type ProductionExceptionConfirmFormValues = z.infer<typeof formSchema>;

interface ProductionExceptionConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	record?: ProductionExceptionRecord | null;
	onSubmit: (values: ProductionExceptionConfirmFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (
	record?: ProductionExceptionRecord | null,
): ProductionExceptionConfirmFormValues => ({
	confirmedBy: record?.confirmedBy || "",
	correctiveAction: record?.correctiveAction || "",
	remark: record?.remark || "",
});

export function ProductionExceptionConfirmDialog({
	open,
	onOpenChange,
	record,
	onSubmit,
	isSubmitting,
}: ProductionExceptionConfirmDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(record),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: ProductionExceptionConfirmInput = {
				confirmedBy: value.confirmedBy.trim(),
				correctiveAction: value.correctiveAction?.trim() || undefined,
				remark: value.remark?.trim() || undefined,
			};
			await onSubmit(normalized);
			form.reset(buildDefaultValues(record));
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset(buildDefaultValues(record));
		}
	}, [open, record, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>确认生产异常闭环</DialogTitle>
					<DialogDescription>
						{record?.jobNo || record?.lineNo
							? `记录：${record.jobNo || record.lineNo}`
							: "填写确认人与处理措施"}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="confirmedBy" label="确认人 *">
						{(field) => (
							<Input
								className="w-full"
								placeholder="例如: QC 主管"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<Field form={form} name="correctiveAction" label="纠正措施 - 选填">
						{(field) => (
							<Textarea
								className="w-full"
								rows={3}
								placeholder="补充处理措施"
								value={field.state.value || ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<Field form={form} name="remark" label="备注 - 选填">
						{(field) => (
							<Textarea
								className="w-full"
								rows={2}
								placeholder="备注说明"
								value={field.state.value || ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在提交..." : "确认闭环"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
