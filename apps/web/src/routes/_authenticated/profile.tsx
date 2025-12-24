import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useChangePassword, useUpdateProfile, useUserProfile } from "@/hooks/use-users";

export const Route = createFileRoute("/_authenticated/profile")({
	component: ProfilePage,
});

const profileSchema = z.object({
	name: z.string().min(1, "请输入姓名"),
	department: z.string().optional(),
	phone: z.string().optional(),
});

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "请输入当前密码"),
		newPassword: z.string().min(8, "新密码至少8位"),
		confirmPassword: z.string().min(8, "请确认新密码"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "两次输入的密码不一致",
		path: ["confirmPassword"],
	});

function ProfilePage() {
	const { data: user, isLoading } = useUserProfile();
	const updateProfileMutation = useUpdateProfile();
	const changePasswordMutation = useChangePassword();

	const profileForm = useForm<z.infer<typeof profileSchema>>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: "",
			department: "",
			phone: "",
		},
	});

	const passwordForm = useForm<z.infer<typeof passwordSchema>>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	useEffect(() => {
		if (user) {
			profileForm.reset({
				name: user.name,
				department: user.department || "",
				phone: user.phone || "",
			});
		}
	}, [user, profileForm]);

	const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
		try {
			await updateProfileMutation.mutateAsync(values);
			toast.success("个人资料已更新");
		} catch (error) {
			toast.error("更新失败", {
				description: error instanceof Error ? error.message : "请稍后重试",
			});
		}
	};

	const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
		try {
			await changePasswordMutation.mutateAsync({
				currentPassword: values.currentPassword,
				newPassword: values.newPassword,
			});
			toast.success("密码修改成功");
			passwordForm.reset();
		} catch (error) {
			toast.error("修改失败", {
				description: error instanceof Error ? error.message : "请确认当前密码是否正确",
			});
		}
	};

	if (isLoading) {
		return <div>加载中...</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">个人设置</h3>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>基本信息</CardTitle>
						<CardDescription>更新您的姓名、联系方式</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...profileForm}>
							<form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
								<FormField
									control={profileForm.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>姓名</FormLabel>
											<FormControl>
												<Input placeholder="您的姓名" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormItem>
									<FormLabel>邮箱</FormLabel>
									<FormControl>
										<Input value={user?.email ?? ""} disabled />
									</FormControl>
									<p className="text-muted-foreground text-xs">
										邮箱修改请到「账号升级」完成验证流程
									</p>
								</FormItem>
								<div className="grid grid-cols-1 gap-4">
									<FormField
										control={profileForm.control}
										name="department"
										render={({ field }) => (
											<FormItem>
												<FormLabel>部门</FormLabel>
												<FormControl>
													<Input placeholder="所属部门" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={profileForm.control}
										name="phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>手机号</FormLabel>
												<FormControl>
													<Input placeholder="联系电话" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="flex justify-end">
									<Button type="submit" disabled={updateProfileMutation.isPending}>
										{updateProfileMutation.isPending ? "保存中..." : "保存更改"}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>账号安全</CardTitle>
						<CardDescription>修改您的登录密码</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...passwordForm}>
							<form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
								<FormField
									control={passwordForm.control}
									name="currentPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>当前密码</FormLabel>
											<FormControl>
												<Input type="password" placeholder="请输入当前密码" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="grid grid-cols-1 gap-4">
									<FormField
										control={passwordForm.control}
										name="newPassword"
										render={({ field }) => (
											<FormItem>
												<FormLabel>新密码</FormLabel>
												<FormControl>
													<Input type="password" placeholder="至少8位字符" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={passwordForm.control}
										name="confirmPassword"
										render={({ field }) => (
											<FormItem>
												<FormLabel>确认新密码</FormLabel>
												<FormControl>
													<Input type="password" placeholder="再次输入新密码" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="flex justify-end">
									<Button type="submit" disabled={changePasswordMutation.isPending}>
										{changePasswordMutation.isPending ? "修改中..." : "修改密码"}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
