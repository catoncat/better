import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";
import * as z from "zod";
import { UserSelect } from "@/components/select/user-select";
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
import { Textarea } from "@/components/ui/textarea";
import type { Instrument } from "@/hooks/use-instruments";
import type { client } from "@/lib/eden";

type InstrumentCreateInput = Parameters<typeof client.api.instruments.post>[0];

export const formSchema = z.object({
	instrumentNo: z.string().min(1, "请输入仪器编号"),
	description: z.string().min(1, "请输入仪器名称"),
	model: z.string().min(1, "请输入型号规格"),
	calibrationType: z.enum(["internal", "external"]).default("external"),
	intervalDays: z.coerce.number().min(1, "请输入计量周期"),
	department: z.string().optional(),
	ownerId: z.string().optional(),
	lastCalibrationDate: z.string().optional(),
	manufacturer: z.string().optional(),
	serialNo: z.string().optional(),
	remarks: z.string().optional(),
}) satisfies z.ZodType<InstrumentCreateInput>;

export type InstrumentFormValues = z.infer<typeof formSchema>;

function normalizeOptionalString(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

interface InstrumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	instrument?: Instrument | null;
	onSubmit: (values: InstrumentFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function InstrumentDialog({
	open,
	onOpenChange,
	instrument,
	onSubmit,
	isSubmitting,
}: InstrumentDialogProps) {
	const resolver = zodResolver(formSchema) as Resolver<InstrumentFormValues>;
	const form = useForm<InstrumentFormValues>({
		resolver,
		defaultValues: {
			instrumentNo: "",
			description: "",
			model: "",
			calibrationType: "external",
			intervalDays: 365,
			department: "",
			ownerId: "",
			lastCalibrationDate: "",
			manufacturer: "",
			serialNo: "",
			remarks: "",
		},
	});

	useEffect(() => {
		if (!open) return;

		if (instrument) {
			form.reset({
				instrumentNo: instrument.instrumentNo ?? "",
				description: instrument.description ?? "",
				model: instrument.model ?? "",
				calibrationType: instrument.calibrationType ?? "external",
				intervalDays: instrument.intervalDays ?? 365,
				department: instrument.department ?? "",
				ownerId: instrument.ownerId ?? "",
				lastCalibrationDate: instrument.lastCalibrationDate
					? new Date(instrument.lastCalibrationDate).toISOString()
					: "",
				manufacturer: instrument.manufacturer ?? "",
				serialNo: instrument.serialNo ?? "",
				remarks: instrument.remarks ?? "",
			});
		} else {
			form.reset({
				instrumentNo: "",
				description: "",
				model: "",
				calibrationType: "external",
				intervalDays: 365,
				department: "",
				ownerId: "",
				lastCalibrationDate: "",
				manufacturer: "",
				serialNo: "",
				remarks: "",
			});
		}
	}, [open, instrument, form]);

	const handleSubmit = async (values: InstrumentFormValues) => {
		const calibrationType = values.calibrationType ?? "external";
		const intervalDays = Number(values.intervalDays);
		await onSubmit({
			instrumentNo: values.instrumentNo.trim(),
			description: values.description.trim(),
			model: values.model.trim(),
			calibrationType,
			intervalDays,
			department: normalizeOptionalString(values.department),
			ownerId: values.ownerId?.trim() || undefined,
			lastCalibrationDate: values.lastCalibrationDate || undefined,
			manufacturer: normalizeOptionalString(values.manufacturer),
			serialNo: normalizeOptionalString(values.serialNo),
			remarks: normalizeOptionalString(values.remarks),
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>{instrument ? "编辑仪器" : "新增仪器"}</DialogTitle>
					<DialogDescription>
						{instrument ? "修改仪器基础信息与计量周期" : "填写仪器基础信息与计量周期"}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
						<DialogBody className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="instrumentNo"
									render={({ field }) => (
										<FormItem>
											<FormLabel>仪器编号</FormLabel>
											<FormControl>
												<Input placeholder="如：INS-001" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>仪器名称</FormLabel>
											<FormControl>
												<Input placeholder="如：万用表" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="model"
									render={({ field }) => (
										<FormItem>
											<FormLabel>型号规格</FormLabel>
											<FormControl>
												<Input placeholder="如：UT61E" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="manufacturer"
									render={({ field }) => (
										<FormItem>
											<FormLabel>制造商</FormLabel>
											<FormControl>
												<Input placeholder="选填" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
									name="intervalDays"
									render={({ field }) => (
										<FormItem>
											<FormLabel>计量周期（天）</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													placeholder="如：365"
													{...field}
													value={
														typeof field.value === "number" || typeof field.value === "string"
															? field.value
															: ""
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="lastCalibrationDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>上次计量日期</FormLabel>
											<FormControl>
												<DatePicker
													value={field.value ? new Date(field.value) : undefined}
													onChange={(date) => field.onChange(date ? date.toISOString() : "")}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="serialNo"
									render={({ field }) => (
										<FormItem>
											<FormLabel>序列号</FormLabel>
											<FormControl>
												<Input placeholder="选填" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="department"
									render={({ field }) => (
										<FormItem>
											<FormLabel>使用部门</FormLabel>
											<FormControl>
												<Input placeholder="如：质量部" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="ownerId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>责任人</FormLabel>
											<FormControl>
												<UserSelect
													value={field.value || undefined}
													onValueChange={field.onChange}
													placeholder="选择责任人"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="remarks"
								render={({ field }) => (
									<FormItem>
										<FormLabel>备注</FormLabel>
										<FormControl>
											<Textarea rows={3} placeholder="选填" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</DialogBody>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								取消
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "提交中..." : "确定"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
