import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { InstrumentSelect } from "@/components/select/instrument-select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	type CalibrationAllSuccess,
	type CalibrationCreateInput,
	useCreateCalibrationRecordForAnyInstrument,
	useUpdateCalibrationRecord,
} from "@/hooks/use-calibrations";

type CalibrationFormInput = CalibrationCreateInput & {
	instrumentId: string;
	updateInstrumentDates: boolean;
};

const formSchema = z.object({
	instrumentId: z.string().min(1, "请选择仪器"),
	calibrationType: z.enum(["internal", "external"]),
	performedAt: z.string().min(1, "请选择校准日期"),
	result: z.enum(["pass", "fail", "pending"]).nullable().optional(),
	nextCalibrationDate: z.string().nullable().optional(),
	certificateNo: z.string().nullable().optional(),
	providerName: z.string().nullable().optional(),
	certificateUrl: z.string().nullable().optional(),
	remarks: z.string().nullable().optional(),
	updateInstrumentDates: z.boolean(),
}) satisfies z.ZodType<CalibrationFormInput>;

type CalibrationFormValues = z.infer<typeof formSchema>;

export function CalibrationFormDialog({
	open,
	onOpenChange,
	defaultInstrumentId,
	onSubmitSuccess,
	record,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultInstrumentId?: string;
	onSubmitSuccess: (instrumentId?: string) => void;
	record?: CalibrationAllSuccess["items"][number] | null;
}) {
	const createMutation = useCreateCalibrationRecordForAnyInstrument();
	const updateMutation = useUpdateCalibrationRecord(record?.instrumentId ?? "");

	const resolver: Resolver<CalibrationFormValues> = zodResolver(formSchema);
	const form = useForm<CalibrationFormValues>({
		resolver,
		defaultValues: {
			instrumentId: defaultInstrumentId ?? "",
			calibrationType: "internal",
			performedAt: "",
			result: null,
			nextCalibrationDate: null,
			certificateNo: null,
			providerName: null,
			certificateUrl: null,
			remarks: null,
			updateInstrumentDates: true,
		},
	});

	useEffect(() => {
		if (!open) return;

		if (record) {
			form.reset({
				instrumentId: record.instrumentId,
				calibrationType: record.calibrationType as CalibrationFormValues["calibrationType"],
				performedAt: record.performedAt ? new Date(record.performedAt).toISOString() : "",
				result: (record.result as CalibrationFormValues["result"]) ?? null,
				nextCalibrationDate: record.nextCalibrationDate
					? new Date(record.nextCalibrationDate).toISOString()
					: null,
				certificateNo: record.certificateNo ?? null,
				providerName: record.providerName ?? null,
				certificateUrl: record.certificateUrl ?? null,
				remarks: record.remarks ?? null,
				updateInstrumentDates: true,
			});
			return;
		}

		form.reset({
			instrumentId: defaultInstrumentId ?? "",
			calibrationType: "internal",
			performedAt: "",
			result: null,
			nextCalibrationDate: null,
			certificateNo: null,
			providerName: null,
			certificateUrl: null,
			remarks: null,
			updateInstrumentDates: true,
		});
	}, [open, record, defaultInstrumentId, form]);

	useEffect(() => {
		if (!open || record) return;
		if (defaultInstrumentId !== undefined) {
			form.setValue("instrumentId", defaultInstrumentId);
		}
	}, [open, record, defaultInstrumentId, form]);

	const onSubmit = async (values: CalibrationFormValues) => {
		const normalizeNullableString = (val?: string | null) => {
			if (val === undefined || val === null) return null;
			const trimmed = val.trim();
			return trimmed === "" ? null : trimmed;
		};

		const instrumentId = values.instrumentId.trim();
		const payload: CalibrationCreateInput = {
			calibrationType: values.calibrationType,
			performedAt: values.performedAt,
			result: values.result ?? null,
			nextCalibrationDate: values.nextCalibrationDate || null,
			certificateNo: normalizeNullableString(values.certificateNo),
			providerName: normalizeNullableString(values.providerName),
			certificateUrl: normalizeNullableString(values.certificateUrl),
			remarks: normalizeNullableString(values.remarks),
			updateInstrumentDates: values.updateInstrumentDates,
		};

		try {
			if (record) {
				await updateMutation.mutateAsync({
					recordId: record.id,
					data: payload,
				});
				toast.success("记录已更新");
				onSubmitSuccess(instrumentId);
				onOpenChange(false);
				return;
			}

			await createMutation.mutateAsync({
				instrumentId,
				data: payload,
			});

			form.reset({
				instrumentId,
				calibrationType: "internal",
				performedAt: "",
				result: null,
				nextCalibrationDate: null,
				certificateNo: null,
				providerName: null,
				certificateUrl: null,
				remarks: null,
				updateInstrumentDates: true,
			});
			onSubmitSuccess(instrumentId);
		} catch (err) {
			const message = err instanceof Error ? err.message : record ? "更新记录失败" : "创建记录失败";
			toast.error(message);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) form.reset();
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>{record ? "编辑校准记录" : "新增校准记录"}</DialogTitle>
					<DialogDescription>填写校准结果，可选择回写仪器计量日期。</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
						<DialogBody className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="instrumentId"
									render={({ field }) => (
										<FormItem className="min-w-0">
											<FormLabel>仪器</FormLabel>
											<FormControl>
												<InstrumentSelect
													value={field.value || undefined}
													onValueChange={field.onChange}
													placeholder="搜索编号/名称/型号"
													disabled={Boolean(record)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="calibrationType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>计量方式</FormLabel>
											<FormControl>
												<Select onValueChange={field.onChange} value={field.value}>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="选择方式" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="internal">内校</SelectItem>
														<SelectItem value="external">外校</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="performedAt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>校准日期</FormLabel>
											<FormControl>
												<DatePicker
													value={field.value ? new Date(field.value) : undefined}
													onChange={(date) => {
														field.onChange(date ? date.toISOString() : undefined);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="result"
									render={({ field }) => (
										<FormItem>
											<FormLabel>结果</FormLabel>
											<FormControl>
												<Select
													onValueChange={(val) => field.onChange(val === "none" ? null : val)}
													value={field.value ?? "none"}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="待确认" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">待确认</SelectItem>
														<SelectItem value="pass">合格</SelectItem>
														<SelectItem value="fail">不合格</SelectItem>
														<SelectItem value="pending">待确认</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="nextCalibrationDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>下次校准日期（为空则按仪器周期自动计算）</FormLabel>
											<FormControl>
												<DatePicker
													value={field.value ? new Date(field.value) : undefined}
													onChange={(date) => {
														field.onChange(date ? date.toISOString() : undefined);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="certificateNo"
									render={({ field }) => (
										<FormItem>
											<FormLabel>证书编号</FormLabel>
											<FormControl>
												<Input placeholder="选填" {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="providerName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>校准机构/执行人</FormLabel>
											<FormControl>
												<Input placeholder="选填" {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="certificateUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>证书链接</FormLabel>
											<FormControl>
												<Input placeholder="https://..." {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="remarks"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>备注</FormLabel>
											<FormControl>
												<Textarea
													rows={3}
													placeholder="选填"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="items-center justify-between rounded-md border p-3 hidden">
								<div>
									<p className="text-sm font-medium">保存后回写仪器计量日期</p>
								</div>
								<FormField
									control={form.control}
									name="updateInstrumentDates"
									render={({ field }) => (
										<FormItem className="flex items-center space-x-2">
											<FormControl>
												<Switch disabled checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						</DialogBody>
						<DialogFooter>
							<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
								取消
							</Button>
							<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
								{createMutation.isPending || updateMutation.isPending
									? "提交中..."
									: record
										? "保存"
										: "提交"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
