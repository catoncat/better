import { useForm } from "@tanstack/react-form";
import { Loader2, Scan } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useReplaceLoading, useVerifyLoading } from "@/hooks/use-loading";

const scanSchema = z
	.object({
		slotCode: z.string().min(1, "请输入站位码"),
		materialLotBarcode: z.string().min(1, "请输入物料条码"),
		isReplaceMode: z.boolean(),
		replaceReason: z.string(),
	})
	.superRefine((values, ctx) => {
		if (values.isReplaceMode && !values.replaceReason.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["replaceReason"],
				message: "请输入换料原因",
			});
		}
	});

interface ScanPanelProps {
	runNo: string;
}

export function ScanPanel({ runNo }: ScanPanelProps) {
	const verifyLoading = useVerifyLoading();
	const replaceLoading = useReplaceLoading();

	const form = useForm({
		defaultValues: {
			slotCode: "",
			materialLotBarcode: "",
			isReplaceMode: false,
			replaceReason: "",
		},
		validators: {
			onChange: scanSchema,
		},
		onSubmit: async ({ value: values }) => {
			if (values.isReplaceMode) {
				await replaceLoading.mutateAsync({
					runNo,
					slotCode: values.slotCode,
					newMaterialLotBarcode: values.materialLotBarcode,
					reason: values.replaceReason || "Manual Replacement",
				});
			} else {
				await verifyLoading.mutateAsync({
					runNo,
					slotCode: values.slotCode,
					materialLotBarcode: values.materialLotBarcode,
				});
			}
			// Reset barcode but keep slot code for convenience
			form.reset({
				...values,
				materialLotBarcode: "",
			});
		},
	});

	const isPending = verifyLoading.isPending || replaceLoading.isPending;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Scan className="h-5 w-5" />
					扫码作业
				</CardTitle>
				<CardDescription>扫描站位码和物料条码进行验证</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<Field form={form} name="isReplaceMode" label="换料模式">
						{(field) => (
							<div className="flex items-center justify-end rounded-lg border p-3 shadow-sm">
								<Switch
									id={field.name}
									checked={field.state.value}
									onCheckedChange={field.handleChange}
								/>
							</div>
						)}
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="slotCode" label="站位码 (Slot)">
							{(field) => (
								<Input
									placeholder="扫描站位..."
									autoFocus
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>

						<Field form={form} name="materialLotBarcode" label="物料条码 (Reel/Lot)">
							{(field) => (
								<Input
									placeholder="物料编码|批次号"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<form.Subscribe selector={(state) => [state.values.isReplaceMode]}>
						{([isReplaceMode]) =>
							isReplaceMode && (
								<Field form={form} name="replaceReason" label="换料原因">
									{(field) => (
										<Input
											placeholder="耗尽/损坏..."
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									)}
								</Field>
							)
						}
					</form.Subscribe>

					<form.Subscribe selector={(state) => [state.canSubmit, state.values.isReplaceMode]}>
						{([canSubmit, isReplaceMode]) => (
							<Button type="submit" className="w-full" disabled={!canSubmit || isPending}>
								{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{isReplaceMode ? "确认换料" : "验证上料"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
