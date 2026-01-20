import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
import { LineSelect } from "@/components/select/line-select";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
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
import type { client } from "@/lib/eden";

type SolderPasteUsageCreateInput = Parameters<
	(typeof client.api)["solder-paste-usage-records"]["post"]
>[0];

const formSchema = z.object({
	lotId: z.string().min(1, "请输入锡膏批次"),
	lineCode: z.string().optional(),
	receivedAt: z.string().optional(),
	expiresAt: z.string().optional(),
	receivedQty: z.number().optional(),
	thawedAt: z.string().optional(),
	issuedAt: z.string().optional(),
	returnedAt: z.string().optional(),
	isReturned: z.boolean().optional(),
	usedBy: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<SolderPasteUsageCreateInput>;

export type SolderPasteUsageFormValues = z.infer<typeof formSchema>;

interface SolderPasteUsageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: SolderPasteUsageFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): SolderPasteUsageFormValues => ({
	lotId: "",
	lineCode: "",
	receivedAt: "",
	expiresAt: "",
	receivedQty: undefined,
	thawedAt: "",
	issuedAt: "",
	returnedAt: "",
	isReturned: undefined,
	usedBy: "",
	remark: "",
});

export function SolderPasteUsageDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: SolderPasteUsageDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: SolderPasteUsageCreateInput = {
				lotId: value.lotId.trim(),
				lineCode: value.lineCode?.trim() || undefined,
				receivedAt: value.receivedAt || undefined,
				expiresAt: value.expiresAt || undefined,
				receivedQty: value.receivedQty ?? undefined,
				thawedAt: value.thawedAt || undefined,
				issuedAt: value.issuedAt || undefined,
				returnedAt: value.returnedAt || undefined,
				isReturned: value.isReturned,
				usedBy: value.usedBy?.trim() || undefined,
				remark: value.remark?.trim() || undefined,
			};

			await onSubmit(normalized);
			form.reset(buildDefaultValues());
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset(buildDefaultValues());
		}
	}, [open, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[760px]">
				<DialogHeader>
					<DialogTitle>新增锡膏使用记录</DialogTitle>
					<DialogDescription>记录锡膏收料、解冻、领用与回收等关键时间。</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="lotId" label="锡膏批次">
							{(field) => (
								<Input
									placeholder="例如: SP-2025-001"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="lineCode" label="产线 (可选)">
							{(field) => (
								<LineSelect
									value={field.state.value || ""}
									onValueChange={(value) => field.handleChange(value)}
									placeholder="选择产线"
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="receivedAt" label="收料时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="expiresAt" label="有效期 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="receivedQty" label="收料数量(瓶) - 选填">
							{(field) => (
								<Input
									type="number"
									step="1"
									placeholder="例如: 12"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value ? Number(e.target.value) : undefined)
									}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="thawedAt" label="解冻时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="issuedAt" label="领用时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="returnedAt" label="回收时间 - 选填">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="isReturned" label="回收状态 - 选填">
							{(field) => (
								<Select
									value={
										field.state.value === undefined ? "unset" : field.state.value ? "true" : "false"
									}
									onValueChange={(value) => {
										if (value === "unset") {
											field.handleChange(undefined);
											return;
										}
										field.handleChange(value === "true");
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择回收状态" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unset">未填写</SelectItem>
										<SelectItem value="true">已回收</SelectItem>
										<SelectItem value="false">未回收</SelectItem>
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="usedBy" label="使用人 - 选填">
							{(field) => (
								<Input
									placeholder="例如: 王工"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="remark" label="备注 - 选填">
							{(field) => (
								<Input
									placeholder="补充说明"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在保存..." : "保存记录"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
