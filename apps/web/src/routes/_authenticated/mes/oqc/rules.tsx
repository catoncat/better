import { createFileRoute } from "@tanstack/react-router";
import {
	Filter,
	Loader2,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Can } from "@/components/ability/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type OqcSamplingRule,
	useDeleteOqcRule,
	useOqcRuleList,
} from "@/hooks/use-oqc-rules";
import { OQC_SAMPLING_TYPE_MAP } from "@/lib/constants";
import { RuleDialog } from "./-components/rule-dialog";
import { Permission } from "@better-app/db/permissions";

const ruleSearchSchema = z.object({
	page: z.number().default(1),
	pageSize: z.number().default(20),
	productCode: z.string().optional(),
	isActive: z.enum(["true", "false"]).optional(),
});

export const Route = createFileRoute("/_authenticated/mes/oqc/rules")({
	component: OqcRulesPage,
	validateSearch: ruleSearchSchema,
});

function OqcRulesPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [localSearch, setLocalSearch] = useState(search.productCode ?? "");
	const [debouncedSearch, setDebouncedSearch] = useState(localSearch);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(localSearch);
		}, 500);
		return () => clearTimeout(timer);
	}, [localSearch]);

	const { data, isLoading, refetch } = useOqcRuleList({
		...search,
		productCode: debouncedSearch || undefined,
	});

	const deleteRule = useDeleteOqcRule();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<OqcSamplingRule | null>(null);

	const handleSearch = (value: string) => {
		setLocalSearch(value);
		navigate({
			search: (prev) => ({ ...prev, productCode: value || undefined, page: 1 }),
		});
	};

	const handleEdit = (rule: OqcSamplingRule) => {
		setEditingRule(rule);
		setDialogOpen(true);
	};

	const handleCreate = () => {
		setEditingRule(null);
		setDialogOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (confirm("确定要停用此规则吗？停用后将不再生效。")) {
			await deleteRule.mutateAsync(id);
			refetch();
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">OQC 抽检规则</h1>
					<p className="text-muted-foreground">配置出货检验的自动抽样策略</p>
				</div>
				<Can permissions={Permission.QUALITY_OQC}>
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						新建规则
					</Button>
				</Can>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="relative w-64">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="搜索产品编码..."
									className="pl-8"
									value={localSearch}
									onChange={(e) => handleSearch(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>优先级</TableHead>
								<TableHead>产品</TableHead>
								<TableHead>产线</TableHead>
								<TableHead>路由</TableHead>
								<TableHead>抽样方式</TableHead>
								<TableHead>数值</TableHead>
								<TableHead>状态</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center">
										<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
									</TableCell>
								</TableRow>
							) : data?.items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
										暂无规则
									</TableCell>
								</TableRow>
							) : (
								data?.items.map((rule) => (
									<TableRow key={rule.id}>
										<TableCell>
											<Badge variant="outline">{rule.priority}</Badge>
										</TableCell>
										<TableCell className="font-mono">{rule.productCode || "ALL"}</TableCell>
										<TableCell>
											{rule.line ? (
												<span title={rule.line.name}>{rule.line.code}</span>
											) : (
												<span className="text-muted-foreground">ALL</span>
											)}
										</TableCell>
										<TableCell>
											{rule.routing ? (
												<span title={rule.routing.name}>{rule.routing.code}</span>
											) : (
												<span className="text-muted-foreground">ALL</span>
											)}
										</TableCell>
										<TableCell>
											{OQC_SAMPLING_TYPE_MAP[rule.samplingType]}
										</TableCell>
										<TableCell>
											{rule.sampleValue}
											{rule.samplingType === "PERCENTAGE" ? "%" : " pcs"}
										</TableCell>
										<TableCell>
											<Badge variant={rule.isActive ? "default" : "secondary"}>
												{rule.isActive ? "启用" : "停用"}
											</Badge>
										</TableCell>
										<TableCell>
											<Can permissions={Permission.QUALITY_OQC}>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" className="h-8 w-8 p-0">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => handleEdit(rule)}>
															编辑
														</DropdownMenuItem>
														{rule.isActive && (
															<DropdownMenuItem
																className="text-red-600"
																onClick={() => handleDelete(rule.id)}
															>
																<Trash2 className="mr-2 h-4 w-4" />
																停用
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</Can>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<RuleDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				rule={editingRule}
			/>
		</div>
	);
}
