import { useForm, useStore } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { OqcDetail } from "@/hooks/use-oqc";
import { INSPECTION_RESULT_MAP, INSPECTION_STATUS_MAP } from "@/lib/constants";
import type { client } from "@/lib/eden";

const formSchema = z.object({
	unitSn: z.string().min(1, "请输入检验序列号"),
	itemName: z.string().min(1, "请输入检验项名称"),
	itemSpec: z.string().optional(),
	actualValue: z.string().optional(),
	result: z.enum(["PASS", "FAIL", "NA"]),
	defectCode: z.string().optional(),
	remark: z.string().optional(),
}) satisfies z.ZodType<Parameters<ReturnType<typeof client.api.oqc>["items"]["post"]>[0]>;

export type OqcRecordFormValues = z.infer<typeof formSchema>;

const buildDefaultValues = (): OqcRecordFormValues => ({
	unitSn: "",
	itemName: "",
	itemSpec: "",
	actualValue: "",
	result: "PASS",
	defectCode: "",
	remark: "",
});

interface OqcRecordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	oqc: OqcDetail | null;
	onSubmit: (values: OqcRecordFormValues) => Promise<void>;
	isSubmitting?: boolean;
	readOnly?: boolean;
}

export function OqcRecordDialog({
	open,
	onOpenChange,
	oqc,
	onSubmit,
	isSubmitting,
	readOnly,
}: OqcRecordDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized = {
				...value,
				unitSn: value.unitSn.trim(),
				itemName: value.itemName.trim(),
				itemSpec: value.itemSpec?.trim() || undefined,
				actualValue: value.actualValue?.trim() || undefined,
				defectCode: value.defectCode?.trim() || undefined,
				remark: value.remark?.trim() || undefined,
			};

			await onSubmit(normalized);
			form.reset();
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset();
		}
	}, [open, form]);

	const result = useStore(form.store, (state) => state.values.result);
	const canRecord = !readOnly && oqc?.status === "INSPECTING";
	const statusLabel = oqc ? (INSPECTION_STATUS_MAP[oqc.status] ?? oqc.status) : "-";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>OQC 检验记录</DialogTitle>
					<DialogDescription>
						{oqc?.run?.runNo ? `批次 ${oqc.run.runNo} 的出货检验记录。` : "检验记录详情"}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col flex-1 min-h-0"
				>
					<DialogBody className="space-y-6">
						<div className="grid gap-4 md:grid-cols-4">
							<div>
								<p className="text-sm text-muted-foreground">状态</p>
								<Badge variant={oqc?.status === "FAIL" ? "destructive" : "secondary"}>
									{statusLabel}
								</Badge>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">抽样数量</p>
								<p className="font-medium">{oqc?.sampleQty ?? "-"}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">通过数量</p>
								<p className="font-medium">{oqc?.passedQty ?? 0}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">失败数量</p>
								<p className="font-medium">{oqc?.failedQty ?? 0}</p>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<p className="font-medium">检验项列表</p>
								<span className="text-sm text-muted-foreground">
									共 {oqc?.items?.length ?? 0} 项
								</span>
							</div>
							{oqc && oqc.items.length > 0 ? (
								<div className="rounded-md border border-border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>序列号</TableHead>
												<TableHead>检验项</TableHead>
												<TableHead>结果</TableHead>
												<TableHead>缺陷代码</TableHead>
												<TableHead>备注</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{oqc.items.map((item) => (
												<TableRow key={item.id}>
													<TableCell className="font-mono text-xs">{item.unitSn ?? "-"}</TableCell>
													<TableCell>{item.itemName}</TableCell>
													<TableCell>
														<Badge
															variant={
																item.result === "FAIL"
																	? "destructive"
																	: item.result === "PASS"
																		? "secondary"
																		: "outline"
															}
														>
															{INSPECTION_RESULT_MAP[item.result] ?? item.result}
														</Badge>
													</TableCell>
													<TableCell>{item.defectCode ?? "-"}</TableCell>
													<TableCell className="max-w-[180px] truncate">
														{item.remark ?? "-"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							) : (
								<div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
									暂无检验项记录
								</div>
							)}
						</div>

						{canRecord && (
							<div className="space-y-4">
								<p className="font-medium">新增检验项</p>
								<div className="grid gap-4 md:grid-cols-2">
									<Field
										form={form}
										name="unitSn"
										label="序列号"
										validators={{ onChange: formSchema.shape.unitSn }}
									>
										{(field) => (
											<Input
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												className="w-full"
												placeholder="输入序列号"
											/>
										)}
									</Field>

									<Field
										form={form}
										name="itemName"
										label="检验项"
										validators={{ onChange: formSchema.shape.itemName }}
									>
										{(field) => (
											<Input
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												className="w-full"
												placeholder="例如: 外观检查"
											/>
										)}
									</Field>

									<Field form={form} name="result" label="结果">
										{(field) => (
											<Select
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange(value as OqcRecordFormValues["result"])
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="选择结果" />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(INSPECTION_RESULT_MAP).map(([value, label]) => (
														<SelectItem key={value} value={value}>
															{label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</Field>

									<Field form={form} name="itemSpec" label="检验标准">
										{(field) => (
											<Input
												value={field.state.value ?? ""}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												className="w-full"
												placeholder="可选"
											/>
										)}
									</Field>

									<Field form={form} name="actualValue" label="实际值">
										{(field) => (
											<Input
												value={field.state.value ?? ""}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												className="w-full"
												placeholder="可选"
											/>
										)}
									</Field>

									<Field form={form} name="defectCode" label="缺陷代码">
										{(field) => (
											<Input
												value={field.state.value ?? ""}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												className="w-full"
												placeholder={result === "FAIL" ? "建议填写" : "可选"}
											/>
										)}
									</Field>
								</div>
								<Field form={form} name="remark" label="备注">
									{(field) => (
										<Textarea
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
											className="w-full min-h-[80px]"
											placeholder="补充说明"
										/>
									)}
								</Field>
							</div>
						)}
					</DialogBody>
					<DialogFooter>
						{canRecord && (
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "正在提交..." : "保存检验项"}
							</Button>
						)}
						{!canRecord && (
							<Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
								关闭
							</Button>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
