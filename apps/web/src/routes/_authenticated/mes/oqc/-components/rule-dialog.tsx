import { Permission } from "@better-app/db/permissions";
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
import { useAbility } from "@/hooks/use-ability";
import { useLines } from "@/hooks/use-lines";
import { type OqcSamplingRule, useCreateOqcRule, useUpdateOqcRule } from "@/hooks/use-oqc-rules";
import { useRouteSearch } from "@/hooks/use-routes";
import { OQC_SAMPLING_TYPE_MAP } from "@/lib/constants";

const ruleSchema = z.object({
	productCode: z.string(),
	lineId: z.string(),
	routingId: z.string(),
	samplingType: z.enum(["PERCENTAGE", "FIXED"]),
	sampleValue: z.number().min(0, "必须大于等于0"),
	priority: z.number().int(),
	isActive: z.boolean(),
});

interface RuleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule?: OqcSamplingRule | null; // If present, edit mode
}

export function RuleDialog({ open, onOpenChange, rule }: RuleDialogProps) {
	const createRule = useCreateOqcRule();
	const updateRule = useUpdateOqcRule();
	const { hasPermission } = useAbility();
	const canViewLines = hasPermission(Permission.RUN_READ) && hasPermission(Permission.RUN_CREATE);
	const canReadRoute = hasPermission(Permission.ROUTE_READ);
	const { data: lines } = useLines({ enabled: canViewLines });
	const [routeSearch, setRouteSearch] = useState("");
	const { data: routeOptions } = useRouteSearch(routeSearch, { enabled: canReadRoute });

	const isEdit = !!rule;

	const form = useForm({
		defaultValues: {
			productCode: rule?.productCode ?? "",
			lineId: rule?.lineId ?? "ALL",
			routingId: rule?.routingId ?? "ALL",
			samplingType: (rule?.samplingType as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE",
			sampleValue: rule?.sampleValue ?? 10,
			priority: rule?.priority ?? 0,
			isActive: rule?.isActive ?? true,
		},
		onSubmit: async ({ value }) => {
			const normalized = {
				...value,
				productCode: value.productCode.trim() || undefined,
				lineId: value.lineId === "ALL" ? undefined : value.lineId,
				routingId: value.routingId === "ALL" ? undefined : value.routingId,
			};

			if (isEdit && rule) {
				await updateRule.mutateAsync({
					ruleId: rule.id,
					data: normalized,
				});
			} else {
				await createRule.mutateAsync(normalized);
			}
			onOpenChange(false);
		},
		validators: {
			onChange: ruleSchema,
		},
	});

	// Reset form when dialog opens/closes or rule changes
	useEffect(() => {
		if (open) {
			form.reset({
				productCode: rule?.productCode ?? "",
				lineId: rule?.lineId ?? "ALL",
				routingId: rule?.routingId ?? "ALL",
				samplingType: (rule?.samplingType as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE",
				sampleValue: rule?.sampleValue ?? 10,
				priority: rule?.priority ?? 0,
				isActive: rule?.isActive ?? true,
			});
		}
	}, [open, rule, form]);

	const isPending = createRule.isPending || updateRule.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑抽检规则" : "新建抽检规则"}</DialogTitle>
					<DialogDescription>配置 OQC 抽检策略。未填写的条件视为“全部匹配”。</DialogDescription>
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
						<Field form={form} name="productCode" label="产品编码 (选填)">
							{(field) => (
								<Input
									placeholder="所有产品"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>

						<Field form={form} name="priority" label="优先级">
							{(field) => (
								<Input
									type="number"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(Number(e.target.value))}
								/>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Field form={form} name="lineId" label="产线 (选填)">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={!canViewLines}
								>
									<SelectTrigger>
										<SelectValue placeholder="所有产线" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">所有产线</SelectItem>
										{canViewLines &&
											lines?.items.map((line) => (
												<SelectItem key={line.id} value={line.id}>
													{line.name} ({line.code})
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="routingId" label="工艺路由 (选填)">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									onOpenChange={(open) => {
										if (open && canReadRoute && !routeOptions) {
											setRouteSearch("");
										}
									}}
									disabled={!canReadRoute}
								>
									<SelectTrigger>
										<SelectValue placeholder="所有路由" />
									</SelectTrigger>
									<SelectContent>
										{canReadRoute && (
											<div className="p-2">
												<Input
													placeholder="搜索路由..."
													value={routeSearch}
													onChange={(e) => setRouteSearch(e.target.value)}
													onKeyDown={(e) => e.stopPropagation()}
												/>
											</div>
										)}
										<SelectItem value="ALL">所有路由</SelectItem>
										{canReadRoute &&
											routeOptions?.items.map((route) => (
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
						<Field form={form} name="samplingType" label="抽样类型">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as "PERCENTAGE" | "FIXED")}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(OQC_SAMPLING_TYPE_MAP).map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</Field>

						<Field form={form} name="sampleValue" label="数值">
							{(field) => (
								<div className="relative">
									<Input
										type="number"
										min={0}
										step={form.getFieldValue("samplingType") === "PERCENTAGE" ? 0.1 : 1}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									/>
									<span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
										{form.getFieldValue("samplingType") === "PERCENTAGE" ? "%" : "pcs"}
									</span>
								</div>
							)}
						</Field>
					</div>

					<Field form={form} name="isActive" label="是否启用">
						{(field) => (
							<div className="flex items-center gap-2">
								<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
								<span className="text-sm text-muted-foreground">
									{field.state.value ? "已启用" : "已停用"}
								</span>
							</div>
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
									{isEdit ? "保存更改" : "创建规则"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
