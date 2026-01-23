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
import {
	MAINTENANCE_ENTITY_TYPE_LABELS,
	MAINTENANCE_TYPE_LABELS,
} from "./maintenance-field-meta";

const formSchema = z.object({
	lineId: z.string().optional(),
	entityType: z.enum(["FIXTURE", "STENCIL", "SQUEEGEE", "EQUIPMENT"]),
	entityId: z.string().min(1, "请输入实体编号"),
	entityDisplay: z.string().optional(),
	maintenanceType: z.enum(["REPAIR", "CALIBRATION", "CLEANING", "REPLACEMENT", "INSPECTION"]),
	description: z.string().min(1, "请输入问题描述"),
	reportedAt: z.string().optional(),
	assignedTo: z.string().optional(),
	remark: z.string().optional(),
});

export type MaintenanceFormValues = z.infer<typeof formSchema>;

interface MaintenanceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: MaintenanceFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

const buildDefaultValues = (): MaintenanceFormValues => ({
	lineId: "",
	entityType: "EQUIPMENT",
	entityId: "",
	entityDisplay: "",
	maintenanceType: "REPAIR",
	description: "",
	reportedAt: new Date().toISOString(),
	assignedTo: "",
	remark: "",
});

export function MaintenanceDialog({
	open,
	onOpenChange,
	onSubmit,
	isSubmitting,
}: MaintenanceDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized: MaintenanceFormValues = {
				lineId: value.lineId?.trim() || undefined,
				entityType: value.entityType,
				entityId: value.entityId.trim(),
				entityDisplay: value.entityDisplay?.trim() || undefined,
				maintenanceType: value.maintenanceType,
				description: value.description.trim(),
				reportedAt: value.reportedAt || undefined,
				assignedTo: value.assignedTo?.trim() || undefined,
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
			<DialogContent className="sm:max-w-[640px]">
				<DialogHeader>
					<DialogTitle>新增维修记录</DialogTitle>
					<DialogDescription>记录夹具、钢网、刮刀或设备的维修信息。</DialogDescription>
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
						<Field form={form} name="entityType" label="实体类型">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(value as MaintenanceFormValues["entityType"])
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择实体类型" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(MAINTENANCE_ENTITY_TYPE_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="entityId" label="实体编号">
							{(field) => (
								<Input
									placeholder="例如: FX-001, ST-002"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="entityDisplay" label="实体名称 (可选)">
							{(field) => (
								<Input
									placeholder="例如: 1号夹具"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="lineId" label="产线 (可选)">
							{(field) => (
								<LineSelect
									value={field.state.value || ""}
									onValueChange={(value) => field.handleChange(value)}
									placeholder="选择产线"
								/>
							)}
						</Field>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="maintenanceType" label="维修类型">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(value as MaintenanceFormValues["maintenanceType"])
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择维修类型" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
						<Field form={form} name="reportedAt" label="报修时间">
							{(field) => (
								<DateTimePicker
									value={field.state.value ? new Date(field.state.value) : undefined}
									onChange={(date) => field.handleChange(date ? date.toISOString() : "")}
								/>
							)}
						</Field>
					</div>

					<Field form={form} name="description" label="问题描述">
						{(field) => (
							<Textarea
								rows={3}
								placeholder="详细描述问题情况..."
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<div className="grid gap-4 md:grid-cols-2">
						<Field form={form} name="assignedTo" label="指派给 (可选)">
							{(field) => (
								<Input
									placeholder="例如: 维修员小王"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field form={form} name="remark" label="备注 (可选)">
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
