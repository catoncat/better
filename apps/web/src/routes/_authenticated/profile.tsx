import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import {
	useChangePassword,
	useUpdateProfile,
	useUserProfile,
} from "@/hooks/use-users";

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

	const profileForm = useForm({
		defaultValues: {
			name: "",
			department: "",
			phone: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await updateProfileMutation.mutateAsync(value);
				toast.success("个人资料已更新");
			} catch (error) {
				toast.error("更新失败", {
					description:
						error instanceof Error ? error.message : "请稍后重试",
				});
			}
		},
	});

	const passwordForm = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onChange: zodValidator(passwordSchema),
		},
		onSubmit: async ({ value, formApi }) => {
			try {
				await changePasswordMutation.mutateAsync({
					currentPassword: value.currentPassword,
					newPassword: value.newPassword,
				});
				toast.success("密码修改成功");
				formApi.reset();
			} catch (error) {
				toast.error("修改失败", {
					description:
						error instanceof Error
							? error.message
							: "请确认当前密码是否正确",
				});
			}
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
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								profileForm.handleSubmit();
							}}
							className="space-y-4"
						>
							<Field
								form={profileForm}
								name="name"
								label="姓名"
								validators={{
									onChange: zodValidator(profileSchema.shape.name),
								}}
							>
								{(field) => (
									<Input
										placeholder="您的姓名"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								)}
							</Field>

							<div className="group grid gap-1.5">
								<div className="flex items-center gap-1.5 min-h-[20px]">
									<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
										邮箱
									</label>
								</div>
								<Input value={user?.email ?? ""} disabled />
								<p className="text-muted-foreground text-xs min-h-[20px]">
									邮箱修改请到「账号升级」完成验证流程
								</p>
							</div>

							<div className="grid grid-cols-1 gap-4">
								<Field
									form={profileForm}
									name="department"
									label="部门"
									validators={{
										onChange: zodValidator(profileSchema.shape.department),
									}}
								>
									{(field) => (
										<Input
											placeholder="所属部门"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(e.target.value)
											}
										/>
									)}
								</Field>
								<Field
									form={profileForm}
									name="phone"
									label="手机号"
									validators={{
										onChange: zodValidator(profileSchema.shape.phone),
									}}
								>
									{(field) => (
										<Input
											placeholder="联系电话"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(e.target.value)
											}
										/>
									)}
								</Field>
							</div>
							<div className="flex justify-end">
								<profileForm.Subscribe
									selector={(state) => [
										state.canSubmit,
										state.isSubmitting,
									]}
									children={([canSubmit, isSubmitting]) => (
										<Button
											type="submit"
											disabled={!canSubmit || updateProfileMutation.isPending}
										>
											{updateProfileMutation.isPending || isSubmitting
												? "保存中..."
												: "保存更改"}
										</Button>
									)}
								/>
							</div>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>账号安全</CardTitle>
						<CardDescription>修改您的登录密码</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								passwordForm.handleSubmit();
							}}
							className="space-y-4"
						>
							<Field
								form={passwordForm}
								name="currentPassword"
								label="当前密码"
								validators={{
									onChange: zodValidator(passwordSchema.shape.currentPassword),
								}}
							>
								{(field) => (
									<Input
										type="password"
										placeholder="请输入当前密码"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								)}
							</Field>
							<div className="grid grid-cols-1 gap-4">
								<Field
									form={passwordForm}
									name="newPassword"
									label="新密码"
									validators={{
										onChange: zodValidator(passwordSchema.shape.newPassword),
									}}
								>
									{(field) => (
										<Input
											type="password"
											placeholder="至少8位字符"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(e.target.value)
											}
										/>
									)}
								</Field>
								<Field
									form={passwordForm}
									name="confirmPassword"
									label="确认新密码"
									validators={{
										onChange: zodValidator(passwordSchema.shape.confirmPassword),
									}}
								>
									{(field) => (
										<Input
											type="password"
											placeholder="再次输入新密码"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(e.target.value)
											}
										/>
									)}
								</Field>
							</div>
							<div className="flex justify-end">
								<passwordForm.Subscribe
									selector={(state) => [
										state.canSubmit,
										state.isSubmitting,
									]}
									children={([canSubmit, isSubmitting]) => (
										<Button
											type="submit"
											disabled={!canSubmit || changePasswordMutation.isPending}
										>
											{changePasswordMutation.isPending || isSubmitting
												? "修改中..."
												: "修改密码"}
										</Button>
									)}
								/>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
