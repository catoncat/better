import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { useLines } from "@/hooks/use-lines";
import { useStations } from "@/hooks/use-station-execution";
import type { RoleOption, UserItem } from "@/hooks/use-users";
import type { client } from "@/lib/eden";

type UserCreateInput = Parameters<typeof client.api.users.post>[0];

export const formSchema = z.object({
	name: z.string().min(1, "请输入姓名"),
	email: z.string().email("请输入正确的邮箱格式"),
	department: z.string().optional(),
	phone: z.string().optional(),
	isActive: z.boolean(),
	enableWecomNotification: z.boolean().optional(),
	roleIds: z.array(z.string()).min(1, "至少选择一个角色"),
	lineIds: z.array(z.string()).optional(),
	stationIds: z.array(z.string()).optional(),
}) satisfies z.ZodType<UserCreateInput>;

export type UserFormValues = z.infer<typeof formSchema>;

interface UserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: UserItem | null;
	roles: RoleOption[];
	onSubmit: (values: UserFormValues) => Promise<void>;
	isSubmitting?: boolean;
}

export function UserDialog({
	open,
	onOpenChange,
	user,
	roles,
	onSubmit,
	isSubmitting,
}: UserDialogProps) {
	const { data: lines } = useLines();
	const { data: stations } = useStations();
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

	const form = useForm<UserFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			email: "",
			department: "",
			phone: "",
			isActive: true,
			enableWecomNotification: false,
			roleIds: roleOptions.length > 0 ? [roleOptions[0]?.value] : [],
			lineIds: [],
			stationIds: [],
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
				roleIds: roleOptions.length > 0 ? [roleOptions[0]?.value] : [],
				lineIds: [],
				stationIds: [],
			});
		}
	}, [user, form, roleOptions]);

	const handleSubmit = async (values: UserFormValues) => {
		await onSubmit(values);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{user ? "编辑用户" : "新增用户"}</DialogTitle>
					<DialogDescription>
						{user ? "修改用户的基础信息和权限" : "创建一个新的系统用户"}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
						<DialogBody className="space-y-6">
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>姓名</FormLabel>
											<FormControl>
												<Input placeholder="请输入姓名" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>邮箱</FormLabel>
											<FormControl>
												<Input placeholder="用于登录和通知" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="roleIds"
									render={({ field }) => (
										<FormItem>
											<FormLabel>角色</FormLabel>
											<FormControl>
												<MultiSelect
													options={roleOptions}
													value={field.value}
													onValueChange={field.onChange}
													placeholder="选择角色"
													disabled={roleOptions.length === 0}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="department"
									render={({ field }) => (
										<FormItem>
											<FormLabel>部门/车间</FormLabel>
											<FormControl>
												<Input placeholder="如：工程部、SMT车间" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>联系电话</FormLabel>
											<FormControl>
												<Input placeholder="用于紧急联系，可留空" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="lineIds"
									render={({ field }) => (
										<FormItem>
											<FormLabel>产线绑定</FormLabel>
											<FormControl>
												<MultiSelect
													options={lineOptions}
													value={field.value ?? []}
													onValueChange={field.onChange}
													placeholder="选择产线"
													emptyText="暂无产线"
												/>
											</FormControl>
											<FormDescription>仅对产线组长/操作员的数据范围生效</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="stationIds"
									render={({ field }) => (
										<FormItem>
											<FormLabel>工位绑定</FormLabel>
											<FormControl>
												<MultiSelect
													options={stationOptions}
													value={field.value ?? []}
													onValueChange={field.onChange}
													placeholder="选择工位"
													emptyText="暂无工位"
												/>
											</FormControl>
											<FormDescription>仅对操作员的数据范围生效</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<FormField
									control={form.control}
									name="isActive"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-1">
												<FormLabel className="text-base">账号状态</FormLabel>
												<FormDescription>停用后用户将无法登录系统</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="enableWecomNotification"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-1">
												<FormLabel className="text-base">企业微信通知</FormLabel>
												<FormDescription>开启后将接收企业微信消息通知</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>
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
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "保存中..." : "保存更改"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
