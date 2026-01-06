import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
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
	type FeederSlot,
	useCreateFeederSlot,
	useUpdateFeederSlot,
} from "@/hooks/use-feeder-slots";

const slotSchema = z.object({
	slotCode: z.string().min(1, "站位码不能为空"),
	slotName: z.string(),
	position: z.number().int().min(0, "顺序必须大于等于 0"),
});

interface SlotDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lineId: string;
	slot?: FeederSlot | null;
}

export function SlotDialog({ open, onOpenChange, lineId, slot }: SlotDialogProps) {
	const createSlot = useCreateFeederSlot();
	const updateSlot = useUpdateFeederSlot();

	const isEdit = !!slot;

	const form = useForm({
		defaultValues: {
			slotCode: slot?.slotCode ?? "",
			slotName: slot?.slotName ?? "",
			position: slot?.position ?? 0,
		},
		onSubmit: async ({ value }) => {
			const data = {
				slotCode: value.slotCode.trim(),
				slotName: value.slotName.trim() || undefined,
				position: value.position,
			};

			if (isEdit && slot) {
				await updateSlot.mutateAsync({
					lineId,
					slotId: slot.id,
					data,
				});
			} else {
				await createSlot.mutateAsync({
					lineId,
					data,
				});
			}
			onOpenChange(false);
		},
		validators: {
			onChange: slotSchema,
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				slotCode: slot?.slotCode ?? "",
				slotName: slot?.slotName ?? "",
				position: slot?.position ?? 0,
			});
		}
	}, [open, slot, form]);

	const isPending = createSlot.isPending || updateSlot.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑站位" : "新建站位"}</DialogTitle>
					<DialogDescription>配置产线站位信息</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-4"
				>
					<Field form={form} name="slotCode" label="站位码">
						{(field) => (
							<Input
								placeholder="例如: 10, 20, A01"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="slotName" label="站位名称 (选填)">
						{(field) => (
							<Input
								placeholder="例如: 料槽1, Slot-A"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					</Field>

					<Field form={form} name="position" label="显示顺序">
						{(field) => (
							<Input
								type="number"
								min={0}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(Number(e.target.value))}
							/>
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
									{isEdit ? "保存更改" : "创建站位"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
