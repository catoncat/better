import { Permission } from "@better-app/db/permissions";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAbility } from "@/hooks/use-ability";
import {
	type MaterialLotListItem,
	useCreateMaterialLot,
	useMaterialLotList,
	useUpdateMaterialLot,
} from "@/hooks/use-material-lots";
import { useQueryPresets } from "@/hooks/use-query-presets";
import { formatDateTime } from "@/lib/utils";

interface MaterialLotFilters {
	materialCode: string;
	lotNo: string;
	hasIqc: "all" | "true" | "false";
	materialKnown: "all" | "true" | "false";
}

interface MaterialLotSearchParams {
	materialCode?: string;
	lotNo?: string;
	hasIqc?: string;
	materialKnown?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/mes/material-lots/")({
	validateSearch: (search: Record<string, unknown>): MaterialLotSearchParams => ({
		materialCode: (search.materialCode as string) || undefined,
		lotNo: (search.lotNo as string) || undefined,
		hasIqc: (search.hasIqc as string) || undefined,
		materialKnown: (search.materialKnown as string) || undefined,
		sort: (search.sort as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 30,
	}),
	component: MaterialLotsPage,
});

function MaterialLotsPage() {
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/mes/material-lots/" });
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { hasPermission } = useAbility();
	const canView = hasPermission(Permission.ROUTE_READ);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<MaterialLotListItem | null>(null);
	const [editForm, setEditForm] = useState({ supplier: "", iqcResult: "", iqcDate: "" });
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState({ materialCode: "", lotNo: "" });

	const updateMutation = useUpdateMaterialLot();
	const createMutation = useCreateMaterialLot();

	const filters: MaterialLotFilters = useMemo(
		() => ({
			materialCode: searchParams.materialCode || "",
			lotNo: searchParams.lotNo || "",
			hasIqc:
				searchParams.hasIqc === "true" || searchParams.hasIqc === "false"
					? searchParams.hasIqc
					: "all",
			materialKnown:
				searchParams.materialKnown === "true" || searchParams.materialKnown === "false"
					? searchParams.materialKnown
					: "all",
		}),
		[
			searchParams.materialCode,
			searchParams.lotNo,
			searchParams.hasIqc,
			searchParams.materialKnown,
		],
	);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized =
				typeof value === "string" ? (value.trim() ? value.trim() : undefined) : value || undefined;
			navigate({
				to: ".",
				search: {
					...searchParams,
					[key]: serialized,
					page: 1,
				},
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const setFilters = useCallback(
		(updates: Partial<MaterialLotFilters>) => {
			const nextSearch: MaterialLotSearchParams = {
				...searchParams,
				page: 1,
			};
			for (const [key, value] of Object.entries(updates)) {
				if (typeof value === "string") {
					(nextSearch as Record<string, unknown>)[key] = value.trim() ? value.trim() : undefined;
				} else {
					(nextSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: nextSearch,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: {
				page: 1,
				pageSize: searchParams.pageSize,
			},
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 30);

	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 30);
	}, [searchParams.page, searchParams.pageSize]);

	// 解析排序
	const [sortBy, sortOrder] = useMemo(() => {
		if (!searchParams.sort) return ["createdAt", "desc"] as const;
		const parts = searchParams.sort.split(".");
		if (parts.length === 2) {
			return [parts[0] || "createdAt", (parts[1] as "asc" | "desc") || "desc"] as const;
		}
		return ["createdAt", "desc"] as const;
	}, [searchParams.sort]);

	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<MaterialLotFilters>({ storageKey: "material-lots" });

	const systemPresets = useMemo((): SystemPreset<MaterialLotFilters>[] => {
		return [
			{ id: "unknown", name: "未知物料", filters: { materialKnown: "false" } },
			{ id: "no-iqc", name: "未检验", filters: { hasIqc: "false" } },
		];
	}, []);

	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);
	const currentActivePresetId = useMemo(
		() => matchPreset(filters, allPresets),
		[filters, allPresets, matchPreset],
	);

	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<MaterialLotFilters>) => {
			const next: Partial<MaterialLotFilters> = {
				materialCode: "",
				lotNo: "",
				hasIqc: "all",
				materialKnown: "all",
				...presetFilters,
			};
			setFilters(next);
			applyPreset(presetId);
		},
		[applyPreset, setFilters],
	);

	const { data, isLoading, error } = useMaterialLotList({
		materialCode: filters.materialCode || undefined,
		lotNo: filters.lotNo || undefined,
		hasIqc: filters.hasIqc === "all" ? undefined : filters.hasIqc,
		materialKnown: filters.materialKnown === "all" ? undefined : filters.materialKnown,
		offset: String(pageIndex * pageSize),
		limit: String(pageSize),
		sortBy,
		sortOrder,
	});

	const initialSorting = useMemo(() => [{ id: "createdAt", desc: true }], []);

	const handlePaginationChange = useCallback(
		(next: { pageIndex: number; pageSize: number }) => {
			setPageIndex(next.pageIndex);
			setPageSize(next.pageSize);
			navigate({
				to: ".",
				search: { ...searchParams, page: next.pageIndex + 1, pageSize: next.pageSize },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const handleSortingChange = useCallback(
		(nextSorting: { id: string; desc: boolean }[]) => {
			const serialized =
				nextSorting.length > 0
					? nextSorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(",")
					: undefined;
			navigate({
				to: ".",
				search: { ...searchParams, sort: serialized, page: 1 },
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const columns = useMemo((): ColumnDef<MaterialLotListItem>[] => {
		return [
			{
				accessorKey: "materialCode",
				header: "物料编码",
				cell: ({ row }) => (
					<div className="font-mono">
						{row.original.materialCode}
						{!row.original.materialKnown && (
							<Badge variant="outline" className="ml-2 text-yellow-600">
								未知
							</Badge>
						)}
					</div>
				),
			},
			{
				accessorKey: "materialName",
				header: "物料名称",
				cell: ({ row }) => row.original.materialName || "-",
			},
			{
				accessorKey: "lotNo",
				header: "批次号",
				cell: ({ row }) => <span className="font-mono">{row.original.lotNo}</span>,
			},
			{
				accessorKey: "supplier",
				header: "供应商",
				cell: ({ row }) => row.original.supplier || "-",
			},
			{
				accessorKey: "iqcResult",
				header: "IQC结果",
				cell: ({ row }) => {
					if (!row.original.iqcResult) return <span className="text-muted-foreground">未检验</span>;
					return (
						<Badge variant={row.original.iqcResult === "PASS" ? "default" : "destructive"}>
							{row.original.iqcResult}
						</Badge>
					);
				},
			},
			{
				accessorKey: "iqcDate",
				header: "IQC日期",
				cell: ({ row }) => (row.original.iqcDate ? formatDateTime(row.original.iqcDate) : "-"),
			},
			{
				accessorKey: "createdAt",
				header: "创建时间",
				cell: ({ row }) => formatDateTime(row.original.createdAt),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setEditingItem(row.original);
							setEditForm({
								supplier: row.original.supplier || "",
								iqcResult: row.original.iqcResult || "",
								iqcDate: row.original.iqcDate ? row.original.iqcDate.split("T")[0] : "",
							});
							setEditDialogOpen(true);
						}}
					>
						编辑
					</Button>
				),
			},
		];
	}, []);

	const handleSaveEdit = async () => {
		if (!editingItem) return;
		await updateMutation.mutateAsync({
			id: editingItem.id,
			data: {
				supplier: editForm.supplier || null,
				iqcResult: editForm.iqcResult || null,
				iqcDate: editForm.iqcDate || null,
			},
		});
		setEditDialogOpen(false);
		setEditingItem(null);
	};

	const canSubmitCreate =
		createForm.materialCode.trim().length > 0 && createForm.lotNo.trim().length > 0;

	const handleCreate = async () => {
		if (!canSubmitCreate) return;
		await createMutation.mutateAsync({
			materialCode: createForm.materialCode.trim(),
			lotNo: createForm.lotNo.trim(),
		});
		setCreateDialogOpen(false);
		setCreateForm({ materialCode: "", lotNo: "" });
	};

	const header = (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold tracking-tight">物料批次</h1>
				<p className="text-muted-foreground">查看和管理物料批次信息（IQC、供应商等）。</p>
			</div>
			<Button onClick={() => setCreateDialogOpen(true)}>新增物料批次</Button>
		</div>
	);

	if (!canView) {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<NoAccessCard description="需要路由查看权限才能查看物料批次。" />
			</div>
		);
	}

	return (
		<>
			<DataListLayout
				mode="server"
				data={data?.items ?? []}
				columns={columns}
				pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
				onPaginationChange={handlePaginationChange}
				onSortingChange={handleSortingChange}
				initialSorting={initialSorting}
				initialPageIndex={(searchParams.page || 1) - 1}
				initialPageSize={searchParams.pageSize || 30}
				locationSearch={locationSearch}
				isLoading={isLoading}
				error={
					error ? (
						<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
							加载失败：{error instanceof Error ? error.message : "未知错误"}
						</div>
					) : null
				}
				header={header}
				queryPresetBarProps={{
					systemPresets,
					userPresets,
					matchedPresetId: currentActivePresetId,
					onApplyPreset: handleApplyPreset,
					onSavePreset: (name: string) => savePreset(name, filters),
					onDeletePreset: deletePreset,
					onRenamePreset: renamePreset,
				}}
				filterToolbarProps={{
					isFiltered:
						filters.materialCode !== "" ||
						filters.lotNo !== "" ||
						filters.hasIqc !== "all" ||
						filters.materialKnown !== "all",
					fields: [
						{
							key: "materialCode",
							type: "custom",
							label: "物料编码",
							render: (value, onChange) => (
								<Input
									value={(value as string) || ""}
									onChange={(e) => onChange(e.target.value)}
									placeholder="物料编码包含..."
									className="h-8 w-[180px]"
								/>
							),
						},
						{
							key: "lotNo",
							type: "custom",
							label: "批次号",
							render: (value, onChange) => (
								<Input
									value={(value as string) || ""}
									onChange={(e) => onChange(e.target.value)}
									placeholder="批次号包含..."
									className="h-8 w-[180px]"
								/>
							),
						},
						{
							key: "hasIqc",
							type: "select",
							label: "IQC状态",
							options: [
								{ label: "全部", value: "all" },
								{ label: "已检验", value: "true" },
								{ label: "未检验", value: "false" },
							],
						},
						{
							key: "materialKnown",
							type: "select",
							label: "物料状态",
							options: [
								{ label: "全部", value: "all" },
								{ label: "已知", value: "true" },
								{ label: "未知", value: "false" },
							],
						},
					],
					filters,
					onFilterChange: setFilter,
					onReset: resetFilters,
				}}
			/>

			{/* 编辑对话框 */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>编辑物料批次</DialogTitle>
						<DialogDescription>
							{editingItem?.materialCode} / {editingItem?.lotNo}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="supplier">供应商</Label>
							<Input
								id="supplier"
								value={editForm.supplier}
								onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="iqcResult">IQC结果</Label>
							<Input
								id="iqcResult"
								placeholder="PASS / FAIL / ..."
								value={editForm.iqcResult}
								onChange={(e) => setEditForm({ ...editForm, iqcResult: e.target.value })}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="iqcDate">IQC日期</Label>
							<Input
								id="iqcDate"
								type="date"
								value={editForm.iqcDate}
								onChange={(e) => setEditForm({ ...editForm, iqcDate: e.target.value })}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							取消
						</Button>
						<Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 新建对话框 */}
			<Dialog
				open={createDialogOpen}
				onOpenChange={(open) => {
					setCreateDialogOpen(open);
					if (!open) {
						setCreateForm({ materialCode: "", lotNo: "" });
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>新增物料批次</DialogTitle>
						<DialogDescription>填写批次号与物料编码即可新建。</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="materialCode">物料编码</Label>
							<Input
								id="materialCode"
								value={createForm.materialCode}
								onChange={(e) =>
									setCreateForm({ ...createForm, materialCode: e.target.value })
								}
								placeholder="如：RES-0603-10K"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="lotNo">批次号</Label>
							<Input
								id="lotNo"
								value={createForm.lotNo}
								onChange={(e) => setCreateForm({ ...createForm, lotNo: e.target.value })}
								placeholder="如：LOT-2026-0128"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateDialogOpen(false)}
							disabled={createMutation.isPending}
						>
							取消
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!canSubmitCreate || createMutation.isPending}
						>
							创建
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
