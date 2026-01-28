import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Bot, HelpCircle, Loader2, RefreshCw, Save, Send, Settings } from "lucide-react";
import { useEffect } from "react";
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
import { Field } from "@/components/ui/form-field-wrapper";
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

const wecomFormSchema = z
	.object({
		enabled: z.boolean(),
		webhookUrl: z.string(),
		mentionAll: z.boolean(),
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

type WecomFormValues = z.infer<typeof wecomFormSchema>;

function SystemSettingsPage() {
	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
				<p className="text-muted-foreground">管理系统设置和偏好选项。</p>
			</div>

			<Tabs defaultValue="notifications" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
					<TabsTrigger value="notifications" className="gap-2">
						<Bell className="h-4 w-4" />
						通知设置
					</TabsTrigger>
					<TabsTrigger value="ai-chat" className="gap-2">
						<Bot className="h-4 w-4" />
						AI 助手
					</TabsTrigger>
					<TabsTrigger value="general" className="gap-2">
						<Settings className="h-4 w-4" />
						通用设置
					</TabsTrigger>
				</TabsList>

				<TabsContent value="notifications" className="space-y-6">
					<WeComSettingsCard />
				</TabsContent>

				<TabsContent value="ai-chat" className="space-y-6">
					<AIChatSettingsCard />
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

	const form = useForm({
		defaultValues: {
			appName: "",
			shortName: "",
		},
		validators: {
			onSubmit: brandingFormSchema,
		},
		onSubmit: async ({ value }) => {
			saveMutation.mutate(value);
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
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<Field
							form={form}
							name="appName"
							label="应用名称"
							description="用于登录页、标题等正式场景。"
						>
							{(field) => (
								<Input
									placeholder="Better APP"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
						<Field
							form={form}
							name="shortName"
							label="简称"
							description="用于导航、移动端等短文案。"
						>
							{(field) => (
								<Input
									placeholder="APP"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							)}
						</Field>
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
			</CardContent>
		</Card>
	);
}

// AI Chat config types
type ChatConfigResponse = {
	ok: boolean;
	config?: {
		enabled: boolean;
		baseUrl: string;
		model: string;
		suggestionsModel: string;
		maxTokens: number;
		rateLimitPerMinute: number;
		toolsEnabled: boolean;
		hasApiKey: boolean;
	};
	error?: string;
};

const chatFormSchema = z.object({
	enabled: z.boolean(),
	apiKey: z.string().optional(),
	baseUrl: z.string().min(1, "必填"),
	model: z.string().min(1, "必填"),
	suggestionsModel: z.string().min(1, "必填"),
	maxTokens: z.number().min(100).max(32000),
	rateLimitPerMinute: z.number().min(1).max(1000),
	toolsEnabled: z.boolean(),
});

type ChatFormValues = z.infer<typeof chatFormSchema>;

function AIChatSettingsCard() {
	const queryClient = useQueryClient();

	const { data, isLoading, isRefetching, error } = useQuery({
		queryKey: ["chat", "config"],
		queryFn: () => fetchClient<ChatConfigResponse>("/chat/config"),
		retry: false,
	});

	const form = useForm({
		defaultValues: {
			enabled: false,
			apiKey: "",
			baseUrl: "https://api.openai.com/v1",
			model: "gpt-4o-mini",
			suggestionsModel: "gpt-5.1-codex-mini",
			maxTokens: 2048,
			rateLimitPerMinute: 20,
			toolsEnabled: false,
		} as ChatFormValues,
		validators: {
			onSubmit: chatFormSchema,
		},
		onSubmit: async ({ value }) => {
			// Only send apiKey if it was changed (not empty)
			const payload = value.apiKey ? value : { ...value, apiKey: undefined };
			saveMutation.mutate(payload);
		},
	});

	useEffect(() => {
		if (data?.config) {
			form.reset({
				enabled: data.config.enabled,
				apiKey: "", // Never show the API key
				baseUrl: data.config.baseUrl,
				model: data.config.model,
				suggestionsModel: data.config.suggestionsModel,
				maxTokens: data.config.maxTokens,
				rateLimitPerMinute: data.config.rateLimitPerMinute,
				toolsEnabled: data.config.toolsEnabled,
			});
		}
	}, [data, form]);

	const saveMutation = useMutation({
		mutationFn: (values: Partial<ChatFormValues>) =>
			fetchClient<ChatConfigResponse>("/chat/config", {
				method: "PATCH",
				body: JSON.stringify(values),
			}),
		onSuccess: () => {
			toast.success("AI 助手配置已保存");
			queryClient.invalidateQueries({ queryKey: ["chat", "config"] });
		},
		onError: (error: Error) => {
			toast.error(`保存失败: ${error.message}`);
		},
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex justify-center p-6">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	// Check if user has permission
	if (error || data?.error === "Forbidden") {
		return (
			<Card>
				<CardContent className="p-6">
					<p className="text-muted-foreground">您没有权限访问此设置。需要管理员权限。</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle>AI 聊天助手</CardTitle>
				<CardDescription>配置系统内置的 AI 聊天助手，支持任意 OpenAI 兼容 API。</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<Field
						form={form}
						name="enabled"
						label="启用 AI 助手"
						description="开启后，用户可以在页面右下角使用 AI 助手。"
					>
						{(field) => <Switch checked={field.state.value} onCheckedChange={field.handleChange} />}
					</Field>

					<form.Subscribe selector={(state) => state.values.enabled}>
						{(enabled) => (
							<div className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<Field
										form={form}
										name="baseUrl"
										label="API 地址"
										description="OpenAI 兼容 API 的 Base URL。"
									>
										{(field) => (
											<Input
												placeholder="https://api.openai.com/v1"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												disabled={!enabled}
											/>
										)}
									</Field>

									<Field form={form} name="model" label="模型名称" description="使用的模型 ID。">
										{(field) => (
											<Input
												placeholder="gpt-4o-mini"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												disabled={!enabled}
											/>
										)}
									</Field>
								</div>
								<Field
									form={form}
									name="suggestionsModel"
									label="建议模型"
									description="用于生成建议问题的模型 ID。"
								>
									{(field) => (
										<Input
											placeholder="gpt-5.1-codex-mini"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											disabled={!enabled}
										/>
									)}
								</Field>

								<Field
									form={form}
									name="apiKey"
									label="API Key"
									description={
										data?.config?.hasApiKey
											? "已配置。留空保持不变，填写新值则更新。"
											: "尚未配置。请填写 API Key。"
									}
								>
									{(field) => (
										<Input
											type="password"
											placeholder={data?.config?.hasApiKey ? "••••••••" : "sk-..."}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											disabled={!enabled}
										/>
									)}
								</Field>

								<div className="grid gap-4 md:grid-cols-2">
									<Field
										form={form}
										name="maxTokens"
										label="最大 Tokens"
										description="单次回复的最大 token 数。"
									>
										{(field) => (
											<Input
												type="number"
												min={100}
												max={32000}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(Number(e.target.value))}
												disabled={!enabled}
											/>
										)}
									</Field>

									<Field
										form={form}
										name="rateLimitPerMinute"
										label="速率限制"
										description="每用户每分钟最大请求数。"
									>
										{(field) => (
											<Input
												type="number"
												min={1}
												max={1000}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(Number(e.target.value))}
												disabled={!enabled}
											/>
										)}
									</Field>
								</div>

								<Field
									form={form}
									name="toolsEnabled"
									label="启用代码库查询"
									description="允许 AI 读取项目代码和文档来回答问题。需要模型支持 Function Calling（如 GPT-4o）。"
								>
									{(field) => (
										<Switch
											checked={field.state.value}
											onCheckedChange={field.handleChange}
											disabled={!enabled}
										/>
									)}
								</Field>
							</div>
						)}
					</form.Subscribe>

					<div className="flex flex-wrap items-center gap-3">
						<Button type="submit" disabled={saveMutation.isPending}>
							{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							<Save className="mr-2 h-4 w-4" />
							保存配置
						</Button>
						{isRefetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function WeComSettingsCard() {
	const queryClient = useQueryClient();

	const { data: config, isLoading } = useQuery({
		queryKey: ["system", "wecom-config"],
		queryFn: () => fetchClient<WecomFormValues>("/system/wecom-config"),
		retry: false,
	});

	const form = useForm({
		defaultValues: {
			enabled: false,
			webhookUrl: "",
			mentionAll: false,
		},
		validators: {
			onSubmit: wecomFormSchema,
		},
		onSubmit: async ({ value }) => {
			saveMutation.mutate(value);
		},
	});

	useEffect(() => {
		if (config) {
			form.reset(config);
		}
	}, [config, form]);

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

	const testMutation = useMutation({
		mutationFn: () =>
			fetchClient("/system/wecom-test", {
				method: "POST",
				body: JSON.stringify({
					enabled: form.getFieldValue("enabled"),
					webhookUrl: form.getFieldValue("webhookUrl"),
					mentionAll: form.getFieldValue("mentionAll"),
				}),
			}),
		onSuccess: () => {
			toast.success("测试消息发送成功");
		},
		onError: (error: Error) => {
			toast.error(`测试消息发送失败: ${error.message}`);
		},
	});

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
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<Field
						form={form}
						name="enabled"
						label="启用通知"
						description="开启后，系统消息将推送到企业微信群。"
					>
						{(field) => <Switch checked={field.state.value} onCheckedChange={field.handleChange} />}
					</Field>

					<div className="space-y-4">
						<form.Subscribe selector={(state) => state.values.enabled}>
							{(enabled) => (
								<>
									<Field
										form={form}
										name="webhookUrl"
										label="Webhook 地址"
										description="企业微信群机器人的 Webhook 地址。"
									>
										{(field) => (
											<Input
												placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												disabled={!enabled}
											/>
										)}
									</Field>

									<Field
										form={form}
										name="mentionAll"
										label="@所有人 (@all)"
										description="开启后，每条消息都会 @所有人。"
									>
										{(field) => (
											<Switch
												checked={field.state.value}
												onCheckedChange={field.handleChange}
												disabled={!enabled}
											/>
										)}
									</Field>
								</>
							)}
						</form.Subscribe>
					</div>

					<div className="flex items-center gap-4">
						<Button type="submit" disabled={saveMutation.isPending}>
							{saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							<Save className="mr-2 h-4 w-4" />
							保存配置
						</Button>

						<form.Subscribe selector={(state) => [state.values.enabled, state.values.webhookUrl]}>
							{([enabled, webhookUrl]) => (
								<Button
									type="button"
									variant="outline"
									disabled={!enabled || !webhookUrl || testMutation.isPending}
									onClick={() => testMutation.mutate()}
								>
									{testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									<Send className="mr-2 h-4 w-4" />
									发送测试消息
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
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
									给机器人起个名字（例如"系统通知"），并设置头像。
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
