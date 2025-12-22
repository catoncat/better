import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, HelpCircle, Loader2, RefreshCw, Save, Send, Settings } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchClient } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/system/settings")({
	component: SystemSettingsPage,
});

const brandingFormSchema = z.object({
	appName: z.string().min(1, "必填"),
	shortName: z.string().min(1, "必填"),
});

type BrandingFormValues = z.infer<typeof brandingFormSchema>;

// Schema for WeCom configuration
const wecomFormSchema = z
	.object({
		enabled: z.boolean().default(false),
		webhookUrl: z.string().default(""),
		mentionAll: z.boolean().default(false),
	})
	.refine(
		(data) => {
			if (data.enabled && !data.webhookUrl) {
				return false;
			}
			return true;
		},
		{
			message: "启用通知时必须填写 Webhook 地址",
			path: ["webhookUrl"],
		},
	);

type WecomFormValues = z.input<typeof wecomFormSchema>;

function SystemSettingsPage() {
	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
				<p className="text-muted-foreground">管理系统设置和偏好选项。</p>
			</div>

			<Tabs defaultValue="notifications" className="space-y-6">
				<TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
					<TabsTrigger value="notifications" className="gap-2">
						<Bell className="h-4 w-4" />
						通知设置
					</TabsTrigger>
					<TabsTrigger value="general" className="gap-2">
						<Settings className="h-4 w-4" />
						通用设置
					</TabsTrigger>
				</TabsList>

				<TabsContent value="notifications" className="space-y-6">
					<WeComSettingsCard />
				</TabsContent>

				<TabsContent value="general">
					<AppBrandingSettingsCard />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function AppBrandingSettingsCard() {
	const queryClient = useQueryClient();

	const { data, isLoading, isRefetching } = useQuery({
		queryKey: ["system", "app-branding"],
		queryFn: () => fetchClient<BrandingFormValues>("/system/app-branding"),
		retry: false,
	});

	const form = useForm<BrandingFormValues>({
		resolver: zodResolver(brandingFormSchema),
		defaultValues: {
			appName: "",
			shortName: "",
		},
	});

	useEffect(() => {
		if (data) {
			form.reset(data);
		}
	}, [data, form]);

	const saveMutation = useMutation({
		mutationFn: (values: BrandingFormValues) =>
			fetchClient<BrandingFormValues>("/system/app-branding", {
				method: "POST",
				body: JSON.stringify(values),
			}),
		onSuccess: (saved) => {
			toast.success("品牌配置已保存");
			form.reset(saved);
			queryClient.invalidateQueries({ queryKey: ["system", "app-branding"] });
		},
		onError: (error: Error) => {
			toast.error(`保存失败: ${error.message}`);
		},
	});

	const onSubmit = (values: BrandingFormValues) => {
		saveMutation.mutate(values);
	};

	const resetToFetched = () => {
		if (data) {
			form.reset(data);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 flex justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle>品牌与基础信息</CardTitle>
				<CardDescription>应用名称配置，保存后即时生效。</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
						<div className="grid gap-4 md:grid-cols-2">
							<FormField
								control={form.control}
								name="appName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>应用名称</FormLabel>
										<FormControl>
											<Input placeholder="Better APP" {...field} />
										</FormControl>
										<FormDescription>用于登录页、标题等正式场景。</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="shortName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>简称</FormLabel>
										<FormControl>
											<Input placeholder="APP" {...field} />
										</FormControl>
										<FormDescription>用于导航、移动端等短文案。</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<Button type="submit" disabled={saveMutation.isPending}>
								{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								<Save className="mr-2 h-4 w-4" />
								保存配置
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={resetToFetched}
								disabled={isRefetching || saveMutation.isPending}
							>
								<RefreshCw className="mr-2 h-4 w-4" />
								撤销修改
							</Button>
							{isRefetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

function WeComSettingsCard() {
	const queryClient = useQueryClient();

	// Fetch configuration
	const { data: config, isLoading } = useQuery({
		queryKey: ["system", "wecom-config"],
		queryFn: () => fetchClient<WecomFormValues>("/system/wecom-config"),
		retry: false,
	});

	const form = useForm<WecomFormValues>({
		resolver: zodResolver(wecomFormSchema),
		defaultValues: {
			enabled: false,
			webhookUrl: "",
			mentionAll: false,
		},
	});

	useEffect(() => {
		if (config) {
			form.reset(config);
		}
	}, [config, form]);

	// Save mutation
	const saveMutation = useMutation({
		mutationFn: (values: WecomFormValues) =>
			fetchClient("/system/wecom-config", {
				method: "POST",
				body: JSON.stringify(values),
			}),
		onSuccess: () => {
			toast.success("配置保存成功");
			queryClient.invalidateQueries({ queryKey: ["system", "wecom-config"] });
		},
		onError: (error: Error) => {
			toast.error(`配置保存失败: ${error.message}`);
		},
	});

	// Test mutation
	const testMutation = useMutation({
		mutationFn: () =>
			fetchClient("/system/wecom-test", {
				method: "POST",
				body: JSON.stringify(form.getValues()),
			}),
		onSuccess: () => {
			toast.success("测试消息发送成功");
		},
		onError: (error: Error) => {
			toast.error(`测试消息发送失败: ${error.message}`);
		},
	});

	function onSubmit(data: WecomFormValues) {
		saveMutation.mutate(data);
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6 flex justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<CardTitle>企业微信通知</CardTitle>
						<CardDescription>配置企业微信群机器人通知，用于接收系统告警和消息。</CardDescription>
					</div>
					<WeComHelpDialog />
				</div>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="enabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">启用通知</FormLabel>
										<FormDescription>开启后，系统消息将推送到企业微信群。</FormDescription>
									</div>
									<FormControl>
										<Switch checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
								</FormItem>
							)}
						/>

						<div className="space-y-4">
							<FormField
								control={form.control}
								name="webhookUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Webhook 地址</FormLabel>
										<FormControl>
											<div className="flex gap-2">
												<Input
													placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
													{...field}
													disabled={!form.watch("enabled")}
												/>
											</div>
										</FormControl>
										<FormDescription>企业微信群机器人的 Webhook 地址。</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="mentionAll"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">@所有人 (@all)</FormLabel>
											<FormDescription>开启后，每条消息都会 @所有人。</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={!form.watch("enabled")}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div className="flex items-center gap-4">
							<Button type="submit" disabled={saveMutation.isPending}>
								{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								<Save className="mr-2 h-4 w-4" />
								保存配置
							</Button>

							<Button
								type="button"
								variant="outline"
								disabled={
									!form.watch("enabled") || !form.watch("webhookUrl") || testMutation.isPending
								}
								onClick={() => testMutation.mutate()}
							>
								{testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								<Send className="mr-2 h-4 w-4" />
								发送测试消息
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

function WeComHelpDialog() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon">
					<HelpCircle className="h-5 w-5 text-muted-foreground" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>如何获取企业微信 Webhook 地址</DialogTitle>
					<DialogDescription>请按照以下步骤配置企业微信机器人。</DialogDescription>
				</DialogHeader>
				<div className="space-y-6 py-4">
					<div className="space-y-4">
						<div className="flex gap-4">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted font-medium">
								1
							</div>
							<div className="space-y-1">
								<h4 className="text-sm font-medium leading-none">创建群组</h4>
								<p className="text-sm text-muted-foreground">
									在企业微信中创建一个用于接收通知的群组。
								</p>
							</div>
						</div>
						<div className="flex gap-4">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted font-medium">
								2
							</div>
							<div className="space-y-1">
								<h4 className="text-sm font-medium leading-none">添加机器人</h4>
								<p className="text-sm text-muted-foreground">
									进入群设置 &rarr; 群机器人 &rarr; 添加机器人。
								</p>
							</div>
						</div>
						<div className="flex gap-4">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted font-medium">
								3
							</div>
							<div className="space-y-1">
								<h4 className="text-sm font-medium leading-none">配置机器人</h4>
								<p className="text-sm text-muted-foreground">
									给机器人起个名字（例如“系统通知”），并设置头像。
								</p>
							</div>
						</div>
						<div className="flex gap-4">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted font-medium">
								4
							</div>
							<div className="space-y-1">
								<h4 className="text-sm font-medium leading-none">复制 Webhook 地址</h4>
								<p className="text-sm text-muted-foreground">
									创建成功后，复制显示的 Webhook 地址并粘贴到上方输入框中。
								</p>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
