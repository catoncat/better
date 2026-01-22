import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { useLines } from "@/hooks/use-lines";
import { useStations } from "@/hooks/use-station-execution";
import type { RoleOption, UserItem } from "@/hooks/use-users";
import type { client } from "@/lib/eden";

type UserCreateInput = Parameters<typeof client.api.users.post>[0];

const baseFormSchema = z.object({
	name: z.string().min(1, "请输入姓名"),
	email: z.string().email("请输入正确的邮箱格式"),
	department: z.string(),
	phone: z.string(),
	isActive: z.boolean(),
	enableWecomNotification: z.boolean(),
	roleIds: z.array(z.string()).min(1, "至少选择一个角色"),
	lineIds: z.array(z.string()),
	stationIds: z.array(z.string()),
}) satisfies z.ZodType<UserCreateInput>;

export type UserFormValues = z.infer<typeof baseFormSchema>;

interface UserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: UserItem | null;
	roles: RoleOption[];
	onSubmit: (values: UserFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function UserDialog({ open, onOpenChange, user, roles, onSubmit }: UserDialogProps) {
	const { data: lines } = useLines();
	const { data: stations } = useStations();
	const roleCodeById = useMemo(() => new Map(roles.map((role) => [role.id, role.code])), [roles]);
	const roleOptions = useMemo(
		() => roles.map((role) => ({ value: role.id, label: role.name })),
		[roles],
	);
	const lineOptions = useMemo(
		() =>
			(lines?.items ?? []).map((line) => ({
				value: line.id,
				label: `${line.code} · ${line.name}`,
			})),
		[lines?.items],
	);
	const stationOptions = useMemo(
		() =>
			(stations?.items ?? []).map((station) => ({
				value: station.id,
				label: `${station.code} · ${station.name} · ${station.line?.name ?? "未绑定产线"}`,
			})),
		[stations?.items],
	);

	const validationSchema = useMemo(
		() =>
			baseFormSchema.superRefine((values, ctx) => {
				const roleCodes = values.roleIds
					.map((roleId) => roleCodeById.get(roleId))
					.filter((roleCode): roleCode is string => Boolean(roleCode));

				if (roleCodes.includes("material") && values.lineIds.length === 0) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["lineIds"],
						message: "物料员必须绑定产线",
					});
				}

				if (roleCodes.includes("operator") && values.stationIds.length === 0) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["stationIds"],
						message: "操作员必须绑定工位",
					});
				}
			}),
		[roleCodeById],
	);

	const form = useForm({
		defaultValues: {
			name: user?.name ?? "",
			email: user?.email ?? "",
			department: user?.department ?? "",
			phone: user?.phone ?? "",
			isActive: user?.isActive ?? true,
			enableWecomNotification: user?.enableWecomNotification ?? false,
			roleIds: user ? user.roles.map((role) => role.id) : [],
			lineIds: user?.lineIds ?? [],
			stationIds: user?.stationIds ?? [],
		} satisfies UserFormValues,
		validators: {
			onSubmit: validationSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	useEffect(() => {
		if (user) {
			form.reset({
				name: user.name,
				email: user.email || "",
				department: user.department || "",
				phone: user.phone || "",
				isActive: user.isActive,
				enableWecomNotification: user.enableWecomNotification || false,
				roleIds: user.roles.map((role) => role.id),
				lineIds: user.lineIds,
				stationIds: user.stationIds,
			});
		} else {
			form.reset({
				name: "",
				email: "",
				department: "",
				phone: "",
				isActive: true,
				enableWecomNotification: false,
				roleIds: [],
				lineIds: [],
				stationIds: [],
			});
		}
	}, [user, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{user ? "编辑用户" : "新增用户"}</DialogTitle>
					<DialogDescription>
						{user ? "修改用户的基础信息和权限" : "创建一个新的系统用户"}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col flex-1 min-h-0"
				>
					<DialogBody className="space-y-6">
						<div className="grid gap-4 md:grid-cols-2">
							<Field
								form={form}
								name="name"
								label="姓名"
								validators={{ onChange: baseFormSchema.shape.name }}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="请输入姓名"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="email"
								label="邮箱"
								validators={{ onChange: baseFormSchema.shape.email }}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="用于登录和通知"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="roleIds"
								label="角色"
								validators={{ onChange: baseFormSchema.shape.roleIds }}
							>
								{(field) => (
									<MultiSelect
										options={roleOptions}
										value={field.state.value}
										onValueChange={field.handleChange}
										placeholder="选择角色"
										disabled={roleOptions.length === 0}
									/>
								)}
							</Field>

							<Field
								form={form}
								name="department"
								label="部门/车间"
								validators={{ onChange: baseFormSchema.shape.department }}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="如：工程部、SMT车间"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="phone"
								label="联系电话"
								validators={{ onChange: baseFormSchema.shape.phone }}
							>
								{(field) => (
									<Input
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="用于紧急联系，可留空"
									/>
								)}
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field
								form={form}
								name="lineIds"
								label="产线绑定"
								tooltip="包含产线范围角色时必须绑定产线"
								validators={{ onChange: baseFormSchema.shape.lineIds }}
							>
								{(field) => (
									<MultiSelect
										options={lineOptions}
										value={field.state.value}
										onValueChange={field.handleChange}
										placeholder="选择产线"
										emptyText="暂无产线"
									/>
								)}
							</Field>

							<Field
								form={form}
								name="stationIds"
								label="工位绑定"
								tooltip="包含工位范围角色时必须绑定工位"
								validators={{ onChange: baseFormSchema.shape.stationIds }}
							>
								{(field) => (
									<MultiSelect
										options={stationOptions}
										value={field.state.value}
										onValueChange={field.handleChange}
										placeholder="选择工位"
										emptyText="暂无工位"
									/>
								)}
							</Field>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<Field
								form={form}
								name="isActive"
								validators={{ onChange: baseFormSchema.shape.isActive }}
							>
								{(field) => (
									<div className="flex items-center justify-between rounded-lg border p-4">
										<div className="space-y-1">
											<Label className="text-base">账号状态</Label>
											<p className="text-sm text-muted-foreground">停用后用户将无法登录系统</p>
										</div>
										<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									</div>
								)}
							</Field>

							<Field
								form={form}
								name="enableWecomNotification"
								validators={{ onChange: baseFormSchema.shape.enableWecomNotification }}
							>
								{(field) => (
									<div className="flex items-center justify-between rounded-lg border p-4">
										<div className="space-y-1">
											<Label className="text-base">企业微信通知</Label>
											<p className="text-sm text-muted-foreground">开启后将接收企业微信消息通知</p>
										</div>
										<Switch checked={field.state.value} onCheckedChange={field.handleChange} />
									</div>
								)}
							</Field>
						</div>

						<div className="rounded-lg border bg-muted/50 p-4 text-sm">
							<div className="font-medium text-foreground">账户标识</div>
							<div className="mt-1 text-muted-foreground">
								用户名：{user?.username || "未设置"} · 用户ID：{user?.id || "生成中"}
							</div>
						</div>
					</DialogBody>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							取消
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button type="submit" disabled={!canSubmit}>
									{isSubmitting ? "保存中..." : "保存更改"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
