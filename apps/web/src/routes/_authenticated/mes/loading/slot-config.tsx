import { Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Can } from "@/components/ability/can";
import { LineSelect } from "@/components/select/line-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type FeederSlot, useDeleteFeederSlot, useFeederSlots } from "@/hooks/use-feeder-slots";
import { useLines } from "@/hooks/use-lines";
import { type SlotMapping, useDeleteSlotMapping, useSlotMappings } from "@/hooks/use-slot-mappings";
import { MappingDialog } from "./-components/mapping-dialog";
import { SlotDialog } from "./-components/slot-dialog";

const slotConfigSearchSchema = z.object({
	lineId: z.string().optional(),
	tab: z.enum(["slots", "mappings"]).default("slots"),
	productCode: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/mes/loading/slot-config")({
	component: SlotConfigPage,
	validateSearch: slotConfigSearchSchema,
});

function SlotConfigPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: lines } = useLines();

	// Default to first line if none selected
	const selectedLineId = search.lineId || lines?.items[0]?.id;

	const {
		data: slotsData,
		isLoading: slotsLoading,
		refetch: refetchSlots,
	} = useFeederSlots(selectedLineId);
	const {
		data: mappingsData,
		isLoading: mappingsLoading,
		refetch: refetchMappings,
	} = useSlotMappings({
		lineId: selectedLineId,
		productCode: search.productCode,
	});

	const deleteSlot = useDeleteFeederSlot();
	const deleteMapping = useDeleteSlotMapping();

	const [slotDialogOpen, setSlotDialogOpen] = useState(false);
	const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
	const [editingSlot, setEditingSlot] = useState<FeederSlot | null>(null);
	const [editingMapping, setEditingMapping] = useState<SlotMapping | null>(null);
	const [productSearch, setProductSearch] = useState(search.productCode ?? "");

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({
				search: (prev) => ({ ...prev, productCode: productSearch || undefined }),
			});
		}, 500);
		return () => clearTimeout(timer);
	}, [productSearch, navigate]);

	const handleLineChange = (lineId: string) => {
		navigate({
			search: (prev) => ({ ...prev, lineId }),
		});
	};

	const handleTabChange = (tab: string) => {
		navigate({
			search: (prev) => ({ ...prev, tab: tab as "slots" | "mappings" }),
		});
	};

	const handleCreateSlot = () => {
		setEditingSlot(null);
		setSlotDialogOpen(true);
	};

	const handleEditSlot = (slot: FeederSlot) => {
		setEditingSlot(slot);
		setSlotDialogOpen(true);
	};

	const handleDeleteSlot = async (slotId: string) => {
		if (!selectedLineId) return;
		if (confirm("确定要删除此站位吗？关联的物料映射也将被删除。")) {
			await deleteSlot.mutateAsync({ lineId: selectedLineId, slotId });
			refetchSlots();
			refetchMappings();
		}
	};

	const handleCreateMapping = () => {
		setEditingMapping(null);
		setMappingDialogOpen(true);
	};

	const handleEditMapping = (mapping: SlotMapping) => {
		setEditingMapping(mapping);
		setMappingDialogOpen(true);
	};

	const handleDeleteMapping = async (id: string) => {
		if (confirm("确定要删除此物料映射吗？")) {
			await deleteMapping.mutateAsync(id);
			refetchMappings();
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">站位表配置</h1>
					<p className="text-muted-foreground">配置产线站位及物料映射关系，用于上料防错</p>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-4">
						<div className="w-64">
							<LineSelect
								value={selectedLineId}
								onValueChange={handleLineChange}
								placeholder="选择产线"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Tabs value={search.tab} onValueChange={handleTabChange}>
						<div className="flex items-center justify-between mb-4">
							<TabsList>
								<TabsTrigger value="slots">
									<Settings2 className="mr-2 h-4 w-4" />
									站位管理
								</TabsTrigger>
								<TabsTrigger value="mappings">物料映射</TabsTrigger>
							</TabsList>

							<Can permissions={Permission.LOADING_CONFIG}>
								{search.tab === "slots" ? (
									<Button onClick={handleCreateSlot} disabled={!selectedLineId}>
										<Plus className="mr-2 h-4 w-4" />
										新建站位
									</Button>
								) : (
									<Button
										onClick={handleCreateMapping}
										disabled={!selectedLineId || !slotsData?.items.length}
									>
										<Plus className="mr-2 h-4 w-4" />
										新建映射
									</Button>
								)}
							</Can>
						</div>

						<TabsContent value="slots">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[100px]">站位码</TableHead>
										<TableHead>站位名称</TableHead>
										<TableHead className="w-[100px]">顺序</TableHead>
										<TableHead className="w-[100px]">锁定状态</TableHead>
										<TableHead className="w-[80px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{slotsLoading ? (
										<TableRow>
											<TableCell colSpan={5} className="h-24 text-center">
												<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
											</TableCell>
										</TableRow>
									) : !selectedLineId ? (
										<TableRow>
											<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
												请先选择产线
											</TableCell>
										</TableRow>
									) : slotsData?.items.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
												暂无站位，点击"新建站位"添加
											</TableCell>
										</TableRow>
									) : (
										slotsData?.items.map((slot) => (
											<TableRow key={slot.id}>
												<TableCell className="font-mono">{slot.slotCode}</TableCell>
												<TableCell>{slot.slotName || "-"}</TableCell>
												<TableCell>{slot.position}</TableCell>
												<TableCell>
													{slot.isLocked ? (
														<Badge variant="destructive">已锁定</Badge>
													) : (
														<Badge variant="outline">正常</Badge>
													)}
												</TableCell>
												<TableCell>
													<Can permissions={Permission.LOADING_CONFIG}>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" className="h-8 w-8 p-0">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem onClick={() => handleEditSlot(slot)}>
																	编辑
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="text-red-600"
																	onClick={() => handleDeleteSlot(slot.id)}
																>
																	<Trash2 className="mr-2 h-4 w-4" />
																	删除
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</Can>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TabsContent>

						<TabsContent value="mappings">
							<div className="mb-4">
								<div className="relative w-64">
									<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="按产品编码筛选..."
										className="pl-8"
										value={productSearch}
										onChange={(e) => setProductSearch(e.target.value)}
									/>
								</div>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[100px]">站位码</TableHead>
										<TableHead>站位名称</TableHead>
										<TableHead>物料编码</TableHead>
										<TableHead>产品编码</TableHead>
										<TableHead className="w-[80px]">优先级</TableHead>
										<TableHead className="w-[80px]">类型</TableHead>
										<TableHead className="w-[80px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{mappingsLoading ? (
										<TableRow>
											<TableCell colSpan={7} className="h-24 text-center">
												<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
											</TableCell>
										</TableRow>
									) : !selectedLineId ? (
										<TableRow>
											<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
												请先选择产线
											</TableCell>
										</TableRow>
									) : mappingsData?.items.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
												暂无物料映射
											</TableCell>
										</TableRow>
									) : (
										mappingsData?.items.map((mapping) => (
											<TableRow key={mapping.id}>
												<TableCell className="font-mono">{mapping.slotCode}</TableCell>
												<TableCell>{mapping.slotName || "-"}</TableCell>
												<TableCell className="font-mono">{mapping.materialCode}</TableCell>
												<TableCell>
													{mapping.productCode || (
														<span className="text-muted-foreground">ALL</span>
													)}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{mapping.priority}</Badge>
												</TableCell>
												<TableCell>
													{mapping.isAlternate ? (
														<Badge variant="secondary">替代</Badge>
													) : (
														<Badge>主料</Badge>
													)}
												</TableCell>
												<TableCell>
													<Can permissions={Permission.LOADING_CONFIG}>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" className="h-8 w-8 p-0">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem onClick={() => handleEditMapping(mapping)}>
																	编辑
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="text-red-600"
																	onClick={() => handleDeleteMapping(mapping.id)}
																>
																	<Trash2 className="mr-2 h-4 w-4" />
																	删除
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</Can>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{selectedLineId && (
				<>
					<SlotDialog
						open={slotDialogOpen}
						onOpenChange={setSlotDialogOpen}
						lineId={selectedLineId}
						slot={editingSlot}
					/>
					<MappingDialog
						open={mappingDialogOpen}
						onOpenChange={setMappingDialogOpen}
						slots={slotsData?.items ?? []}
						mapping={editingMapping}
					/>
				</>
			)}
		</div>
	);
}
