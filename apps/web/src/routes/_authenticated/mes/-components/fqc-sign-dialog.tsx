import { useForm } from "@tanstack/react-form";
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
import { Textarea } from "@/components/ui/textarea";
import type { FqcDetail } from "@/hooks/use-fqc";
import type { client } from "@/lib/eden";

const formSchema = z.object({
	remark: z.string().optional(),
}) satisfies z.ZodType<Parameters<ReturnType<typeof client.api.fqc>["sign"]["post"]>[0]>;

export type FqcSignFormValues = z.infer<typeof formSchema>;

const buildDefaultValues = (): FqcSignFormValues => ({
	remark: "",
});

interface FqcSignDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fqc: FqcDetail | null;
	onSubmit: (values: FqcSignFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function FqcSignDialog({
	open,
	onOpenChange,
	fqc,
	onSubmit,
	isSubmitting,
}: FqcSignDialogProps) {
	const form = useForm({
		defaultValues: buildDefaultValues(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const normalized = {
				remark: value.remark?.trim() || undefined,
			};
			await onSubmit(normalized);
			form.reset();
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset(buildDefaultValues());
		}
	}, [open, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>末件检验签字确认</DialogTitle>
					<DialogDescription>
						{fqc?.run?.runNo ? `确认批次 ${fqc.run.runNo} 的末件检验结果。` : "确认末件检验结果。"}
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
					<DialogBody className="space-y-4">
						<Field form={form} name="remark" label="备注（可选）">
							{(field) => (
								<Textarea
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									className="w-full min-h-[90px]"
									placeholder="输入签字备注..."
								/>
							)}
						</Field>
					</DialogBody>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "正在提交..." : "确认签字"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
