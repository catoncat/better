import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
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
import { Textarea } from "@/components/ui/textarea";
import type { OqcDetail } from "@/hooks/use-oqc";
import { INSPECTION_STATUS_MAP } from "@/lib/constants";
import type { client } from "@/lib/eden";

const formSchema = z
	.object({
		decision: z.enum(["PASS", "FAIL"]),
		failedQty: z.number().optional(),
		remark: z.string().optional(),
	})
	.superRefine((values, ctx) => {
		if (values.decision === "FAIL" && (!values.failedQty || values.failedQty <= 0)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["failedQty"],
				message: "请输入失败数量",
			});
		}
	}) satisfies z.ZodType<Parameters<ReturnType<typeof client.api.oqc>["complete"]["post"]>[0]>;

export type OqcCompleteFormValues = z.infer<typeof formSchema>;

interface OqcCompleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	oqc: OqcDetail | null;
	onSubmit: (values: OqcCompleteFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function OqcCompleteDialog({
	open,
	onOpenChange,
	oqc,
	onSubmit,
	isSubmitting,
}: OqcCompleteDialogProps) {
	const form = useForm({
		defaultValues: {
			decision: "PASS",
			failedQty: 1,
			remark: "",
		} satisfies OqcCompleteFormValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized = {
				...value,
				remark: value.remark?.trim() || undefined,
			};

			if (normalized.decision === "PASS") {
				normalized.failedQty = 0;
			}

			await onSubmit(normalized);
			form.reset();
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				decision: "PASS",
				failedQty: 1,
				remark: "",
			});
		}
	}, [open, form]);

	const decision = form.useStore((state) => state.values.decision);
	const failedQty = form.useStore((state) => state.values.failedQty);
	const sampleQty = oqc?.sampleQty ?? undefined;
	const statusLabel = oqc ? INSPECTION_STATUS_MAP[oqc.status] ?? oqc.status : "-";

	const remainingQty =
		sampleQty !== undefined && failedQty !== undefined
			? Math.max(sampleQty - failedQty, 0)
			: undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>完成 OQC 检验</DialogTitle>
					<DialogDescription>提交最终检验结论并更新批次状态。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col flex-1 min-h-0"
				>
					<DialogBody className="space-y-4">
						<div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
							<div>
								<p className="text-sm text-muted-foreground">当前状态</p>
								<p className="font-medium">{statusLabel}</p>
							</div>
							<div className="text-right">
								<p className="text-sm text-muted-foreground">抽样数量</p>
								<p className="font-medium">{sampleQty ?? "-"}</p>
							</div>
						</div>

						<Field
							form={form}
							name="decision"
							label="检验结论"
							validators={{ onChange: formSchema.shape.decision }}
						>
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(value as OqcCompleteFormValues["decision"])
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="选择检验结论" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="PASS">通过</SelectItem>
										<SelectItem value="FAIL">失败</SelectItem>
									</SelectContent>
								</Select>
							)}
						</Field>

						{decision === "FAIL" && (
							<Field
								form={form}
								name="failedQty"
								label="失败数量"
								validators={{ onChange: formSchema.shape.failedQty }}
							>
								{(field) => (
									<Input
										type="number"
										min={1}
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const nextValue = Number(event.target.value);
											field.handleChange(Number.isNaN(nextValue) ? undefined : nextValue);
										}}
										className="w-full"
										placeholder="输入失败数量"
									/>
								)}
							</Field>
						)}

						{decision === "FAIL" && remainingQty !== undefined && (
							<div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
								预计通过数量：{remainingQty}
							</div>
						)}

						<Field form={form} name="remark" label="备注">
							{(field) => (
								<Textarea
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									className="w-full min-h-[80px]"
									placeholder="可选"
								/>
							)}
						</Field>
					</DialogBody>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在提交..." : "确认完成"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
