import { PERMISSION_GROUPS } from "@better-app/db/permissions";
import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { RoleItem } from "@/hooks/use-roles";
import type { client } from "@/lib/eden";

const dataScopeOptions = [
	{ value: "ALL", label: "全部产线" },
	{ value: "ASSIGNED_LINES", label: "仅管辖产线" },
	{ value: "ASSIGNED_STATIONS", label: "仅绑定工位" },
] as const;

// Type Safety: Infer input type from Eden
type RoleCreateInput = Parameters<typeof client.api.roles.post>[0];

const formSchema = z.object({
	code: z.string().min(1, "请输入角色代码"),
	name: z.string().min(1, "请输入角色名称"),
	description: z.string(),
	dataScope: z.enum(["ALL", "ASSIGNED_LINES", "ASSIGNED_STATIONS"]),
	permissions: z.array(z.string()).min(1, "至少选择一个权限"),
}) satisfies z.ZodType<RoleCreateInput>;

export type RoleFormValues = z.infer<typeof formSchema>;

interface RoleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: RoleItem | null;
	initialValues?: RoleFormValues | null;
	onSubmit: (values: RoleFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function RoleDialog({ open, onOpenChange, role, initialValues, onSubmit }: RoleDialogProps) {
	const permissionGroups = useMemo(() => Object.values(PERMISSION_GROUPS), []);
	const form = useForm({
		defaultValues: {
			code: role?.code ?? "",
			name: role?.name ?? "",
			description: role?.description ?? "",
			dataScope: role?.dataScope ?? "ALL",
			permissions: role?.permissions ?? [],
		} satisfies RoleFormValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	useEffect(() => {
		if (role) {
			form.reset({
				code: role.code,
				name: role.name,
				description: role.description ?? "",
				dataScope: role.dataScope,
				permissions: role.permissions,
			});
			return;
		}

		if (initialValues) {
			form.reset(initialValues);
			return;
		}

		form.reset({
			code: "",
			name: "",
			description: "",
			dataScope: "ALL",
			permissions: [],
		});
	}, [form, role, initialValues]);

	const isSystemRole = role?.isSystem ?? false;
	const isClone = Boolean(!role && initialValues);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{role ? "编辑角色" : isClone ? "克隆角色" : "新增角色"}</DialogTitle>
					<DialogDescription>
						{role
							? "更新角色名称、描述与权限范围"
							: isClone
								? "基于现有角色复制，生成新的自定义角色"
								: "创建一个新的自定义角色"}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col min-h-0"
				>
					<DialogBody className="space-y-2">
						<div className="grid gap-y-1 gap-x-4 md:grid-cols-2">
							<Field
								form={form}
								name="code"
								label="角色代码"
								tooltip="创建后不可修改"
								validators={{
									onChange: formSchema.shape.code,
								}}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="例如: planner"
										disabled={Boolean(role)}
									/>
								)}
							</Field>

							<Field
								form={form}
								name="name"
								label="角色名称"
								validators={{
									onChange: formSchema.shape.name,
								}}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="例如: 生产计划员"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="description"
								label="描述"
								className="md:col-span-2"
								validators={{
									onChange: formSchema.shape.description,
								}}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="可选"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="dataScope"
								label="数据范围"
								tooltip="系统角色数据范围固定"
								validators={{
									onChange: formSchema.shape.dataScope,
								}}
							>
								{(field) => (
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as RoleFormValues["dataScope"])
										}
										disabled={isSystemRole}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="选择数据范围" />
										</SelectTrigger>
										<SelectContent>
											{dataScopeOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</Field>
						</div>

						<Field
							form={form}
							name="permissions"
							label="权限点"
							tooltip="选择该角色可执行的操作"
							validators={{
								onChange: formSchema.shape.permissions,
							}}
						>
							{(field) => (
								<div className="space-y-5">
									{permissionGroups.map((group) => (
										<div key={group.label} className="rounded-lg border p-4">
											<p className="mb-3 text-sm font-semibold">{group.label}</p>
											<div className="grid gap-3 md:grid-cols-2">
												{group.permissions.map((perm) => {
													const checkboxId = `perm-${perm.value}`;
													return (
														<div key={perm.value} className="flex items-center gap-2 text-sm">
															<Checkbox
																id={checkboxId}
																disabled={isSystemRole}
																checked={field.state.value.includes(perm.value)}
																onCheckedChange={(checked: boolean | "indeterminate") => {
																	const next =
																		checked === true
																			? [...field.state.value, perm.value]
																			: field.state.value.filter(
																					(value: string) => value !== perm.value,
																				);
																	field.handleChange(next);
																}}
															/>
															<Label htmlFor={checkboxId} className="font-normal cursor-pointer">
																{perm.label}
															</Label>
														</div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							)}
						</Field>
					</DialogBody>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button type="submit" disabled={!canSubmit}>
									{isSubmitting ? "保存中..." : role ? "保存" : "创建"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
