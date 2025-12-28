import { PERMISSION_GROUPS } from "@better-app/db/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import {
	Form,
	FormControl,
	FormDescription,
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
import type { RoleItem } from "@/hooks/use-roles";

const dataScopeOptions = [
	{ value: "ALL", label: "全部产线" },
	{ value: "ASSIGNED_LINES", label: "仅管辖产线" },
	{ value: "ASSIGNED_STATIONS", label: "仅绑定工位" },
] as const;

const formSchema = z.object({
	code: z.string().min(1, "请输入角色代码"),
	name: z.string().min(1, "请输入角色名称"),
	description: z.string().optional(),
	dataScope: z.enum(["ALL", "ASSIGNED_LINES", "ASSIGNED_STATIONS"]),
	permissions: z.array(z.string()).min(1, "至少选择一个权限"),
});

export type RoleFormValues = z.infer<typeof formSchema>;

interface RoleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: RoleItem | null;
	onSubmit: (values: RoleFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function RoleDialog({ open, onOpenChange, role, onSubmit, isSubmitting }: RoleDialogProps) {
	const permissionGroups = useMemo(() => Object.values(PERMISSION_GROUPS), []);
	const form = useForm<RoleFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			code: "",
			name: "",
			description: "",
			dataScope: "ALL",
			permissions: [],
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
		form.reset({
			code: "",
			name: "",
			description: "",
			dataScope: "ALL",
			permissions: [],
		});
	}, [form, role]);

	const isSystemRole = role?.isSystem ?? false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{role ? "编辑角色" : "新增角色"}</DialogTitle>
					<DialogDescription>
						{role ? "更新角色名称、描述与权限范围" : "创建一个新的自定义角色"}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
						<DialogBody className="space-y-6">
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>角色代码</FormLabel>
											<FormControl>
												<Input placeholder="例如: planner" {...field} disabled={Boolean(role)} />
											</FormControl>
											<FormDescription>创建后不可修改</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>角色名称</FormLabel>
											<FormControl>
												<Input placeholder="例如: 生产计划员" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>描述</FormLabel>
											<FormControl>
												<Input placeholder="可选" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="dataScope"
									render={({ field }) => (
										<FormItem>
											<FormLabel>数据范围</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
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
											</FormControl>
											<FormDescription>系统角色数据范围固定</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="permissions"
								render={({ field }) => (
									<FormItem>
										<FormLabel>权限点</FormLabel>
										<FormDescription>选择该角色可执行的操作</FormDescription>
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
																		checked={field.value.includes(perm.value)}
																		onCheckedChange={(checked) => {
																			const next = checked
																				? [...field.value, perm.value]
																				: field.value.filter((value) => value !== perm.value);
																			field.onChange(next);
																		}}
																	/>
																	<label htmlFor={checkboxId}>{perm.label}</label>
																</div>
															);
														})}
													</div>
												</div>
											))}
										</div>
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
								{role ? "保存" : "创建"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
