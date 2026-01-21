import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import type { FeederSlot } from "@/hooks/use-feeder-slots";
import { useRouteSearch } from "@/hooks/use-routes";
import {
	type SlotMapping,
	useCreateSlotMapping,
	useUpdateSlotMapping,
} from "@/hooks/use-slot-mappings";

const mappingSchema = z.object({
	slotId: z.string().min(1, "请选择站位"),
	materialCode: z.string().min(1, "物料编码不能为空"),
	productCode: z.string(),
	routingId: z.string(),
	priority: z.number().int().min(0),
	isAlternate: z.boolean(),
	unitConsumption: z.union([z.number().min(0), z.undefined()]),
	isCommonMaterial: z.boolean(),
});

interface MappingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	slots: FeederSlot[];
	mapping?: SlotMapping | null;
	canReadRoute?: boolean;
}

export function MappingDialog({
	open,
	onOpenChange,
	slots,
	mapping,
	canReadRoute = true,
}: MappingDialogProps) {
	const createMapping = useCreateSlotMapping();
	const updateMapping = useUpdateSlotMapping();
	const [routeSearch, setRouteSearch] = useState("");
	const { data: routeOptions } = useRouteSearch(routeSearch, { enabled: canReadRoute });

	const isEdit = !!mapping;

	const form = useForm({
		defaultValues: {
			slotId: mapping?.slotId ?? "",
			materialCode: mapping?.materialCode ?? "",
			productCode: mapping?.productCode ?? "",
			routingId: mapping?.routingId ?? "ALL",
			priority: mapping?.priority ?? 0,
			isAlternate: mapping?.isAlternate ?? false,
			unitConsumption: mapping?.unitConsumption ?? undefined,
			isCommonMaterial: mapping?.isCommonMaterial ?? false,
		},
		onSubmit: async ({ value }) => {
			const data = {
				slotId: value.slotId,
				materialCode: value.materialCode.trim(),
				productCode: value.productCode.trim() || undefined,
				routingId: value.routingId === "ALL" ? undefined : value.routingId,
				priority: value.priority,
				isAlternate: value.isAlternate,
				unitConsumption: value.unitConsumption,
				isCommonMaterial: value.isCommonMaterial,
			};

			if (isEdit && mapping) {
				await updateMapping.mutateAsync({
					id: mapping.id,
					data: {
						materialCode: data.materialCode,
						productCode: data.productCode || null,
						routingId: data.routingId || null,
						priority: data.priority,
						isAlternate: data.isAlternate,
						unitConsumption: data.unitConsumption ?? null,
						isCommonMaterial: data.isCommonMaterial,
					},
				});
			} else {
				await createMapping.mutateAsync(data);
			}
			onOpenChange(false);
		},
		validators: {
			onChange: mappingSchema,
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				slotId: mapping?.slotId ?? "",
				materialCode: mapping?.materialCode ?? "",
				productCode: mapping?.productCode ?? "",
				routingId: mapping?.routingId ?? "ALL",
				priority: mapping?.priority ?? 0,
				isAlternate: mapping?.isAlternate ?? false,
				unitConsumption: mapping?.unitConsumption ?? undefined,
				isCommonMaterial: mapping?.isCommonMaterial ?? false,
			});
		}
	}, [open, mapping, form]);

	const isPending = createMapping.isPending || updateMapping.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑物料映射" : "新建物料映射"}</DialogTitle>
					<DialogDescription>配置站位与物料的对应关系</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="slotId" label="站位">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={isEdit}
								>
									<SelectTrigger>
										<SelectValue placeholder="选择站位" />
									</SelectTrigger>
									<SelectContent>
										{slots.map((slot) => (
											<SelectItem key={slot.id} value={slot.id}>
												{slot.slotName || slot.slotCode} ({slot.slotCode})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="materialCode" label="物料编码">
							{(field) => (
								<Input
									placeholder="例如: MAT001"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="productCode" label="产品编码 (选填)">
							{(field) => (
								<Input
									placeholder="留空表示通用"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>

						<Field form={form} name="routingId" label="工艺路由 (选填)">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									onOpenChange={(isOpen) => {
										if (isOpen && canReadRoute && !routeOptions) {
											setRouteSearch("");
										}
									}}
									disabled={!canReadRoute}
								>
									<SelectTrigger>
										<SelectValue placeholder="所有路由" />
									</SelectTrigger>
									<SelectContent>
										<div className="p-2">
											<Input
												placeholder="搜索路由..."
												value={routeSearch}
												onChange={(e) => setRouteSearch(e.target.value)}
												onKeyDown={(e) => e.stopPropagation()}
											/>
										</div>
										<SelectItem value="ALL">所有路由</SelectItem>
										{routeOptions?.items.map((route) => (
											<SelectItem key={route.id} value={route.id}>
												<span
													className="block max-w-[240px] truncate"
													title={`${route.name} (${route.code})`}
												>
													{route.name} ({route.code})
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="priority" label="优先级">
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

						<Field form={form} name="isAlternate" label="是否替代料">
							{(field) => (
								<div className="flex items-center gap-2 pt-2">
									<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									<span className="text-sm text-muted-foreground">
										{field.state.value ? "替代料" : "主料"}
									</span>
								</div>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="unitConsumption" label="单机用量">
							{(field) => (
								<Input
									type="number"
									min={0}
									placeholder="例如: 1.2"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => {
										const raw = e.target.value;
										field.handleChange(raw === "" ? undefined : Number(raw));
									}}
								/>
							)}
						</Field>

						<Field form={form} name="isCommonMaterial" label="通用料">
							{(field) => (
								<div className="flex items-center gap-2 pt-2">
									<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									<span className="text-sm text-muted-foreground">
										{field.state.value ? "通用料" : "专用料"}
									</span>
								</div>
							)}
						</Field>
					</div>

					<DialogFooter>
						<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, _isSubmitting]) => (
								<Button type="submit" disabled={!canSubmit || isPending}>
									{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{isEdit ? "保存更改" : "创建映射"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
