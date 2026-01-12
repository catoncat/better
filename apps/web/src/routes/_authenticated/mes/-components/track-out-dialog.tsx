import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type DataSpecItem, useTrackOut, useUnitDataSpecs } from "@/hooks/use-station-execution";

interface TrackOutDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stationCode: string;
	sn: string;
	runNo: string;
	onSuccess?: () => void;
}

// Build dynamic form values type
type FormValues = {
	result: "PASS" | "FAIL";
	data: Record<string, number | string | boolean | undefined>;
};

const resultSchema = z.enum(["PASS", "FAIL"]);

export function TrackOutDialog({
	open,
	onOpenChange,
	stationCode,
	sn,
	runNo,
	onSuccess,
}: TrackOutDialogProps) {
	const { data: specsData, isLoading: isLoadingSpecs } = useUnitDataSpecs(
		open ? stationCode : "",
		open ? sn : "",
	);
	const { mutateAsync: trackOut, isPending: isSubmitting } = useTrackOut();

	const specs = specsData?.specs ?? [];
	const hasSpecs = specs.length > 0;

	// Build initial values for data fields
	const initialData = useMemo(() => {
		const result: Record<string, number | string | boolean | undefined> = {};
		for (const spec of specs) {
			if (spec.dataType === "NUMBER") {
				result[spec.name] = spec.spec?.target;
			} else if (spec.dataType === "BOOLEAN") {
				result[spec.name] = true;
			} else {
				result[spec.name] = undefined;
			}
		}
		return result;
	}, [specs]);

	const form = useForm({
		defaultValues: {
			result: "PASS" as "PASS" | "FAIL",
			data: initialData,
		},
		onSubmit: async ({ value }) => {
			// Build data array from form values
			const dataArray: Array<{
				specName: string;
				valueNumber?: number;
				valueText?: string;
				valueBoolean?: boolean;
			}> = [];

			for (const spec of specs) {
				const val = value.data[spec.name];
				if (val === undefined || val === "") continue;

				const item: (typeof dataArray)[number] = { specName: spec.name };

				if (spec.dataType === "NUMBER" && typeof val === "number") {
					item.valueNumber = val;
				} else if (spec.dataType === "BOOLEAN" && typeof val === "boolean") {
					item.valueBoolean = val;
				} else if (spec.dataType === "TEXT" && typeof val === "string") {
					item.valueText = val;
				} else if (spec.dataType === "JSON" && typeof val === "string") {
					item.valueText = val; // Store JSON as text for now
				}

				dataArray.push(item);
			}

			await trackOut({
				stationCode,
				sn,
				runNo,
				result: value.result,
				data: dataArray.length > 0 ? dataArray : undefined,
			});

			onOpenChange(false);
			onSuccess?.();
		},
	});

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			form.reset({
				result: "PASS",
				data: initialData,
			});
		}
	}, [open, form, initialData]);

	// Validate required fields
	const validateRequired = () => {
		for (const spec of specs) {
			if (spec.isRequired) {
				const val = form.getFieldValue(`data.${spec.name}` as never);
				if (val === undefined || val === "" || val === null) {
					return false;
				}
			}
		}
		return true;
	};

	const canSubmit = validateRequired() && !isSubmitting;

	// Helper to render spec hint
	const renderHint = (spec: DataSpecItem) => {
		if (spec.dataType !== "NUMBER" || !spec.spec) return null;

		const parts: string[] = [];
		if (spec.spec.min !== undefined || spec.spec.max !== undefined) {
			const min = spec.spec.min ?? "-∞";
			const max = spec.spec.max ?? "∞";
			parts.push(`范围: ${min} ~ ${max}`);
		}
		if (spec.spec.target !== undefined) {
			parts.push(`目标: ${spec.spec.target}`);
		}
		if (spec.spec.unit) {
			parts.push(`单位: ${spec.spec.unit}`);
		}

		if (parts.length === 0) return null;

		return <span className="text-xs text-muted-foreground ml-2">({parts.join(", ")})</span>;
	};

	// Render label for spec field
	const renderLabel = (spec: DataSpecItem) => (
		<>
			{spec.name}
			{spec.isRequired && <span className="text-destructive ml-1">*</span>}
			{renderHint(spec)}
		</>
	);

	// Render a single spec input field inline
	const renderSpecField = (spec: DataSpecItem) => {
		const fieldName = `data.${spec.name}`;

		if (spec.dataType === "NUMBER") {
			return (
				<div key={spec.id} className="space-y-1">
					<Label className="text-sm">{renderLabel(spec)}</Label>
					<form.Field name={fieldName as "data"}>
						{(field) => (
							<Input
								type="number"
								step="any"
								placeholder={spec.spec?.target?.toString() ?? "输入数值"}
								value={(field.state.value as unknown as number | undefined) ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const v = e.target.value;
									field.handleChange((v ? Number(v) : undefined) as never);
								}}
							/>
						)}
					</form.Field>
				</div>
			);
		}

		if (spec.dataType === "BOOLEAN") {
			return (
				<div key={spec.id} className="flex items-center justify-between">
					<Label className="text-sm">{renderLabel(spec)}</Label>
					<form.Field name={fieldName as "data"}>
						{(field) => (
							<div className="flex items-center gap-2">
								<Switch
									checked={(field.state.value as unknown as boolean | undefined) ?? false}
									onCheckedChange={(v) => field.handleChange(v as never)}
								/>
								<span className="text-sm text-muted-foreground">
									{(field.state.value as unknown as boolean | undefined) ? "是" : "否"}
								</span>
							</div>
						)}
					</form.Field>
				</div>
			);
		}

		// TEXT or JSON
		return (
			<div key={spec.id} className="space-y-1">
				<Label className="text-sm">{renderLabel(spec)}</Label>
				<form.Field name={fieldName as "data"}>
					{(field) => (
						<Input
							placeholder={spec.dataType === "JSON" ? "输入 JSON 数据" : "输入文本"}
							value={(field.state.value as unknown as string | undefined) ?? ""}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange((e.target.value || undefined) as never)}
						/>
					)}
				</form.Field>
			</div>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>出站确认</DialogTitle>
					<DialogDescription>
						SN: <span className="font-mono">{sn}</span> · 批次: {runNo}
						{specsData && (
							<>
								{" "}
								· 工序: {specsData.operationCode} - {specsData.operationName}
							</>
						)}
					</DialogDescription>
				</DialogHeader>

				{isLoadingSpecs ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						<span className="ml-2 text-muted-foreground">加载采集项...</span>
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4 py-4"
					>
						{/* Result selection */}
						<Field form={form} name="result" label="检验结果">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) => {
										if (resultSchema.safeParse(v).success) {
											field.handleChange(v as "PASS" | "FAIL");
										}
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="PASS">合格 (PASS)</SelectItem>
										<SelectItem value="FAIL">不合格 (FAIL)</SelectItem>
									</SelectContent>
								</Select>
							)}
						</Field>

						{/* Dynamic data collection fields */}
						{hasSpecs && (
							<div className="space-y-4 rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<h4 className="font-medium text-sm">数据采集</h4>
									<Badge variant="outline">{specs.length} 项</Badge>
								</div>

								<div className="space-y-3">{specs.map((spec) => renderSpecField(spec))}</div>
							</div>
						)}

						<DialogFooter>
							<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
								取消
							</Button>
							<Button type="submit" disabled={!canSubmit}>
								{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								确认出站
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
