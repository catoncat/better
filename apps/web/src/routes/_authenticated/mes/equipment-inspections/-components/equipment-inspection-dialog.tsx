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
import { Textarea } from "@/components/ui/textarea";
import type { client } from "@/lib/eden";

type EquipmentInspectionCreateInput = Parameters<
	(typeof client.api)["equipment-inspection-records"]["post"]
>[0];

const formSchema = z.object({
	lineCode: z.string().optional(),
	equipmentType: z.enum(["SPI", "AOI"]).optional(),
	inspectedAt: z.string().min(1, "请选择点检时间"),
	machineName: z.string().min(1, "请输入设备名称"),
	sampleModel: z.string().optional(),
	version: z.string().optional(),
	programName: z.string().optional(),
	result: z.enum(["PASS", "FAIL"]).optional(),
	inspector: z.string().min(1, "请输入点检人"),
	remark: z.string().optional(),
}) satisfies z.ZodType<EquipmentInspectionCreateInput>;

export type EquipmentInspectionFormValues = z.infer<typeof formSchema>;

interface EquipmentInspectionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: EquipmentInspectionFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): EquipmentInspectionFormValues => ({
	lineCode: "",
	equipmentType: undefined,
	inspectedAt: "",
	machineName: "",
	sampleModel: "",
	version: "",
	programName: "",
	result: undefined,
	inspector: "",
	remark: "",
});

const equipmentTypeOptions = [
	{ label: "SPI", value: "SPI" },
	{ label: "AOI", value: "AOI" },
];

const resultOptions = [
	{ label: "合格", value: "PASS" },
	{ label: "不合格", value: "FAIL" },
];

export function EquipmentInspectionDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: EquipmentInspectionDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: EquipmentInspectionCreateInput = {
				lineCode: value.lineCode?.trim() || undefined,
				equipmentType: value.equipmentType,
				inspectedAt: value.inspectedAt,
				machineName: value.machineName.trim(),
				sampleModel: value.sampleModel?.trim() || undefined,
				version: value.version?.trim() || undefined,
				programName: value.programName?.trim() || undefined,
				result: value.result,
				inspector: value.inspector.trim(),
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
					<DialogTitle>新增设备点检记录</DialogTitle>
					<DialogDescription>记录 AOI/SPI 设备每日点检情况。</DialogDescription>
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
						<Field form={form} name="machineName" label="设备名称">
							{(field) => (
								<Input
									placeholder="例如: AOI-01"
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
						<Field form={form} name="inspectedAt" label="点检时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
						<Field form={form} name="equipmentType" label="设备类型 - 选填">
							{(field) => (
								<Select
									value={field.state.value ?? "unset"}
									onValueChange={(value) =>
										field.handleChange(value === "unset" ? undefined : (value as "SPI" | "AOI"))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择类型" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unset">未填写</SelectItem>
										{equipmentTypeOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="result" label="点检结果 - 选填">
							{(field) => (
								<Select
									value={field.state.value ?? "unset"}
									onValueChange={(value) =>
										field.handleChange(value === "unset" ? undefined : (value as "PASS" | "FAIL"))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择结果" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unset">未填写</SelectItem>
										{resultOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Field form={form} name="sampleModel" label="样板型号 - 选填">
							{(field) => (
								<Input
									placeholder="例如: SAMPLE-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="version" label="版本 - 选填">
							{(field) => (
								<Input
									placeholder="例如: V1"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="programName" label="程序名称 - 选填">
							{(field) => (
								<Input
									placeholder="例如: AOI-PROG-01"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="inspector" label="点检人">
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
								<Textarea
									rows={2}
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
