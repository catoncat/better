import { useForm, useStore } from "@tanstack/react-form";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MRB_DECISION_MAP, REWORK_TYPE_MAP } from "@/lib/constants";
import type { client } from "@/lib/eden";

type MrbDecisionInput = Parameters<ReturnType<typeof client.api.runs>["mrb-decision"]["post"]>[0];

const formSchema = z
	.object({
		decision: z.enum(["RELEASE", "REWORK", "SCRAP"]),
		reworkType: z.enum(["REUSE_PREP", "FULL_PREP"]).optional(),
		faiWaiver: z.boolean().optional(),
		faiWaiverReason: z.string().optional(),
		reason: z.string().min(4, "处置原因至少 4 个字"),
	})
	.superRefine((values, ctx) => {
		if (values.decision === "REWORK" && !values.reworkType) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["reworkType"],
				message: "请选择返修类型",
			});
		}

		if (values.faiWaiver && values.reworkType !== "REUSE_PREP") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["faiWaiver"],
				message: "仅复用就绪返修可豁免 FAI",
			});
		}

		if (values.faiWaiver && !values.faiWaiverReason?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["faiWaiverReason"],
				message: "请输入 FAI 豁免原因",
			});
		}
	}) satisfies z.ZodType<MrbDecisionInput>;

export type MrbDecisionFormValues = z.infer<typeof formSchema>;

const buildDefaultValues = (): MrbDecisionFormValues => ({
	decision: "RELEASE",
	reworkType: undefined,
	faiWaiver: false,
	faiWaiverReason: "",
	reason: "",
});

interface MrbDecisionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	runNo: string;
	onSubmit: (values: MrbDecisionFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function MrbDecisionDialog({
	open,
	onOpenChange,
	runNo,
	onSubmit,
	isSubmitting,
}: MrbDecisionDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const next = {
				...value,
				reason: value.reason.trim(),
				faiWaiverReason: value.faiWaiverReason?.trim() || undefined,
			};

			if (next.decision !== "REWORK") {
				next.reworkType = undefined;
				next.faiWaiver = undefined;
				next.faiWaiverReason = undefined;
			}

			if (next.decision === "REWORK" && next.reworkType !== "REUSE_PREP") {
				next.faiWaiver = undefined;
				next.faiWaiverReason = undefined;
			}

			if (!next.faiWaiver) {
				next.faiWaiverReason = undefined;
			}

			await onSubmit(next);
			form.reset();
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset(buildDefaultValues());
		}
	}, [open, form]);

	const decision = useStore(form.store, (state) => state.values.decision);
	const reworkType = useStore(form.store, (state) => state.values.reworkType);
	const faiWaiver = useStore(form.store, (state) => state.values.faiWaiver);
	const showRework = decision === "REWORK";
	const showFaiWaiver = showRework && reworkType === "REUSE_PREP";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>MRB 评审决策</DialogTitle>
					<DialogDescription>为批次 {runNo} 提交处置决策。</DialogDescription>
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
						<Field
							form={form}
							name="decision"
							label="处置决策"
							validators={{ onChange: formSchema.shape.decision }}
						>
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										field.handleChange(value as MrbDecisionFormValues["decision"]);
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="选择处置决策" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(MRB_DECISION_MAP).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						{showRework && (
							<Field
								form={form}
								name="reworkType"
								label="返修类型"
								validators={{ onChange: formSchema.shape.reworkType }}
							>
								{(field) => (
									<Select
										value={field.state.value ?? ""}
										onValueChange={(value) => {
											field.handleChange(value as MrbDecisionFormValues["reworkType"]);
											if (value !== "REUSE_PREP") {
												form.setFieldValue("faiWaiver", false);
												form.setFieldValue("faiWaiverReason", "");
											}
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="选择返修类型" />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(REWORK_TYPE_MAP).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</Field>
						)}

						{showFaiWaiver && (
							<Field form={form} name="faiWaiver" label="FAI 豁免">
								{(field) => (
									<div className="flex items-center justify-between rounded-md border border-border p-3">
										<span className="text-sm text-muted-foreground">允许跳过 FAI 检验</span>
										<Switch
											checked={Boolean(field.state.value)}
											onCheckedChange={(checked) => field.handleChange(checked)}
										/>
									</div>
								)}
							</Field>
						)}

						{showFaiWaiver && faiWaiver && (
							<Field
								form={form}
								name="faiWaiverReason"
								label="FAI 豁免原因"
								validators={{ onChange: formSchema.shape.faiWaiverReason }}
							>
								{(field) => (
									<Textarea
										value={field.state.value ?? ""}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder="说明豁免原因"
										className="w-full min-h-[80px]"
									/>
								)}
							</Field>
						)}

						<Field
							form={form}
							name="reason"
							label="处置原因"
							validators={{ onChange: formSchema.shape.reason }}
						>
							{(field) => (
								<Textarea
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder="描述处置决策原因"
									className="w-full min-h-[100px]"
								/>
							)}
						</Field>
					</DialogBody>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在提交..." : "提交决策"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
