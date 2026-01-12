import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Command, Loader2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey } from "@/lib/session-query";
import { cn } from "@/lib/utils";

// 测试账号配置（仅开发环境使用）
const TEST_ACCOUNTS = [
	{
		role: "系统管理员",
		email: "admin@example.com",
		password: "ChangeMe123!",
		description: "系统配置、用户管理、集成管理",
	},
	{
		role: "生产计划员",
		email: "planner@example.com",
		password: "Test123!",
		description: "工单接收/发布、批次创建、进度跟踪",
	},
	{
		role: "工艺工程师",
		email: "engineer@example.com",
		password: "Test123!",
		description: "路由配置、执行语义设置、版本编译",
	},
	{
		role: "质量工程师",
		email: "quality@example.com",
		password: "Test123!",
		description: "质量检验、缺陷处置、追溯分析",
	},
	{
		role: "产线组长",
		email: "leader@example.com",
		password: "Test123!",
		description: "批次授权、产线监控、工位执行",
	},
	{
		role: "操作员",
		email: "operator@example.com",
		password: "Test123!",
		description: "工位进站/出站操作",
	},
] as const;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();
	const isDev = import.meta.env.DEV;

	const handleTestAccountSelect = (testAccount: (typeof TEST_ACCOUNTS)[number]) => {
		setEmail(testAccount.email);
		setPassword(testAccount.password);
		toast.info(`已填入${testAccount.role}测试账号`);
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await authClient.signIn.email(
				{
					email,
					password,
				},
				{
					onSuccess: async () => {
						await queryClient.fetchQuery({
							queryKey: sessionQueryKey,
							queryFn: () => authClient.getSession(),
							staleTime: 0,
						});
						toast.success("登录成功");
						router.navigate({ to: "/mes/work-orders" });
					},
					onError: (ctx) => {
						toast.error(ctx.error.message || "登录失败");
						setIsLoading(false);
					},
				},
			);
		} catch (error) {
			console.error(error);
			toast.error("An unexpected error occurred");
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8" onSubmit={handleLogin}>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">欢迎回来</h1>
								<p className="text-muted-foreground text-balance">登录您的 Better APP 账户</p>
							</div>
							{isDev && (
								<Field>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<FieldLabel>快速测试账号</FieldLabel>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button type="button" variant="outline" size="sm" className="h-8">
														<User className="mr-2 h-3 w-3" />
														选择测试账号
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-72">
													<DropdownMenuLabel>测试账号列表（开发环境）</DropdownMenuLabel>
													<DropdownMenuSeparator />
													{TEST_ACCOUNTS.map((account) => (
														<DropdownMenuItem
															key={account.role}
															onClick={() => handleTestAccountSelect(account)}
															className="flex flex-col items-start gap-1 py-2"
														>
															<div className="flex items-center justify-between w-full">
																<span className="font-medium">{account.role}</span>
															</div>
															<div className="text-xs text-muted-foreground break-all">
																{account.email}
															</div>
															<div className="text-xs text-muted-foreground">
																{account.description}
															</div>
														</DropdownMenuItem>
													))}
													<DropdownMenuSeparator />
													<div className="px-2 py-1.5 text-xs text-muted-foreground">
														运行 bun run seed 创建测试账号
													</div>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</Field>
							)}
							<Field>
								<FieldLabel htmlFor="email">邮箱</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={isLoading}
								/>
							</Field>
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor="password">密码</FieldLabel>
									<button
										type="button"
										className="ml-auto text-sm underline-offset-2 hover:underline"
									>
										忘记密码？
									</button>
								</div>
								<Input
									id="password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={isLoading}
								/>
							</Field>
							<Field>
								<Button type="submit" className="w-full" disabled={isLoading}>
									{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									登录
								</Button>
							</Field>
						</FieldGroup>
					</form>
					<div className="bg-muted relative hidden md:flex items-center justify-center">
						<div className="absolute inset-0 bg-zinc-900" />
						<div className="relative z-20 flex items-center text-lg font-medium text-white">
							<Command className="mr-2 h-6 w-6" />
							Better APP
						</div>
					</div>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				点击继续即表示您同意我们的{" "}
				<button type="button" className="underline">
					服务条款
				</button>{" "}
				和{" "}
				<button type="button" className="underline">
					隐私政策
				</button>
				。
			</FieldDescription>
		</div>
	);
}
