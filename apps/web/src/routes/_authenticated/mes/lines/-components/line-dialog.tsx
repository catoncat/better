import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { LineSummary } from "@/hooks/use-lines";
import { PROCESS_TYPE_MAP } from "@/lib/constants";
import type { client } from "@/lib/eden";

type LineCreateInput = Parameters<typeof client.api.lines.post>[0];

const processTypeValues = Object.keys(PROCESS_TYPE_MAP) as LineCreateInput["processType"][];

const formSchema = z.object({
	code: z.string().min(1, "请输入产线代码").max(50, "产线代码过长"),
	name: z.string().min(1, "请输入产线名称").max(100, "产线名称过长"),
	processType: z.enum(
		processTypeValues as [LineCreateInput["processType"], ...LineCreateInput["processType"][]],
	),
}) satisfies z.ZodType<LineCreateInput>;

type FormValues = z.infer<typeof formSchema>;

interface LineDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	line?: LineSummary | null;
	onSubmit: (values: LineCreateInput) => Promise<void>;
	isPending?: boolean;
}

export function LineDialog({
	open,
	onOpenChange,
	line,
	onSubmit,
	isPending = false,
}: LineDialogProps) {
	const isEdit = Boolean(line);
	const defaultProcessType = useMemo<LineCreateInput["processType"]>(() => {
		if (line?.processType) return line.processType;
		return processTypeValues[0] ?? "SMT";
	}, [line?.processType]);

	const form = useForm({
		defaultValues: {
			code: line?.code ?? "",
			name: line?.name ?? "",
			processType: defaultProcessType,
		} satisfies FormValues,
		onSubmit: async ({ value }) => {
			const payload: LineCreateInput = {
				code: value.code.trim(),
				name: value.name.trim(),
				processType: value.processType,
			};
			await onSubmit(payload);
			onOpenChange(false);
		},
		validators: {
			onSubmit: formSchema,
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				code: line?.code ?? "",
				name: line?.name ?? "",
				processType: line?.processType ?? defaultProcessType,
			});
		}
	}, [open, line, defaultProcessType, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑产线" : "新建产线"}</DialogTitle>
					<DialogDescription>维护产线主数据，用于工单派工与门禁校验。</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-4"
				>
					<Field form={form} name="code" label="产线代码" required>
						{(field) => (
							<Input
								className="w-full"
								placeholder="例如: LINE-A"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="name" label="产线名称" required>
						{(field) => (
							<Input
								className="w-full"
								placeholder="例如: SMT Production Line A"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="processType" label="工艺类型" required>
						{(field) => (
							<Select
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(value as LineCreateInput["processType"])
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="选择工艺类型" />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(PROCESS_TYPE_MAP).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</Field>

					<DialogFooter>
						<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, _isSubmitting]) => (
								<Button type="submit" disabled={!canSubmit || isPending}>
									{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{isEdit ? "保存更改" : "创建产线"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
