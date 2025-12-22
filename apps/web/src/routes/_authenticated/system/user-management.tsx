import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilterToolbar, QueryPresetBar, type SystemPreset } from "@/components/data-list";
import { DataListView } from "@/components/data-table/data-list-view";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import { useQueryPresets } from "@/hooks/use-query-presets";
import {
	type UserItem,
	useCreateUser,
	useUpdateUser,
	useUserList,
	useUserRoles,
} from "@/hooks/use-users";
import { USER_ROLE_MAP } from "@/lib/constants";
import { UserCard } from "./-components/user-card";
import { userColumns } from "./-components/user-columns";
import { UserDialog, type UserFormValues } from "./-components/user-dialog";

interface UserFilters {
	search: string;
	role: string[];
}

interface UserSearchParams {
	search?: string;
	role?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/system/user-management")({
	validateSearch: (search: Record<string, unknown>): UserSearchParams => ({
		search: (search.search as string) || undefined,
		role: (search.role as string) || undefined,
		page: Number(search.page) || 1,
		pageSize: Number(search.pageSize) || 20,
	}),
	component: SystemUserManagementPage,
});

function SystemUserManagementPage() {
	const viewPreferencesKey = "system-user-management";
	const { canManageUsers } = usePermission();
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/_authenticated/system/user-management" });
	const { data: roles = [] } = useUserRoles();

	const roleOptions = useMemo(
		() => roles.map((role: string) => ({ label: USER_ROLE_MAP[role] || role, value: role })),
		[roles],
	);

	// Parse filters from URL
	const filters: UserFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			role: searchParams.role?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || filters.role.length > 0;
	}, [filters]);

	// Update URL with new filters
	const setFilter = useCallback(
		(key: string, value: unknown) => {
			const serialized = Array.isArray(value)
				? value.length > 0
					? value.join(",")
					: undefined
				: value || undefined;

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
		(newFilters: Partial<UserFilters>) => {
			const newSearch: UserSearchParams = { ...searchParams, page: 1 };
			for (const [key, value] of Object.entries(newFilters)) {
				if (Array.isArray(value)) {
					(newSearch as Record<string, unknown>)[key] =
						value.length > 0 ? value.join(",") : undefined;
				} else {
					(newSearch as Record<string, unknown>)[key] = value || undefined;
				}
			}
			navigate({
				to: ".",
				search: newSearch,
				replace: true,
			});
		},
		[navigate, searchParams],
	);

	const resetFilters = useCallback(() => {
		navigate({
			to: ".",
			search: { page: 1, pageSize: searchParams.pageSize },
			replace: true,
		});
	}, [navigate, searchParams.pageSize]);

	// Pagination
	const [pagination, setPagination] = useState({
		pageIndex: (searchParams.page || 1) - 1,
		pageSize: searchParams.pageSize || 20,
	});

	// Dialog states
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<UserItem | null>(null);

	// Query presets
	const {
		presets: userPresets,
		savePreset,
		applyPreset,
		deletePreset,
		renamePreset,
		matchPreset,
	} = useQueryPresets<UserFilters>({ storageKey: "user-management" });

	// System presets
	const systemPresets = useMemo((): SystemPreset<UserFilters>[] => {
		return [
			{ id: "all", name: "全部", filters: {} },
			{ id: "admin", name: USER_ROLE_MAP.admin, filters: { role: ["admin"] } },
			{ id: "technician", name: USER_ROLE_MAP.technician, filters: { role: ["technician"] } },
			{ id: "operator", name: USER_ROLE_MAP.operator, filters: { role: ["operator"] } },
		];
	}, []);

	// All presets for matching
	const allPresets = useMemo(
		() => [...systemPresets, ...userPresets],
		[systemPresets, userPresets],
	);

	// Find active preset based on current filters
	const currentActivePresetId = useMemo(() => {
		return matchPreset(filters, allPresets);
	}, [filters, allPresets, matchPreset]);

	// Handle preset apply
	const handleApplyPreset = useCallback(
		(presetId: string, presetFilters: Partial<UserFilters>) => {
			const newFilters: Partial<UserFilters> = {
				search: "",
				role: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, isError, error } = useUserList({
		page: pagination.pageIndex + 1,
		pageSize: pagination.pageSize,
		search: filters.search.trim() || undefined,
		role: filters.role.length > 0 ? filters.role : undefined,
	});
	const updateMutation = useUpdateUser();
	const createMutation = useCreateUser();

	const handleEdit = (user: UserItem) => {
		setEditingUser(user);
		setDialogOpen(true);
	};

	const handleCreate = () => {
		setEditingUser(null);
		setDialogOpen(true);
	};

	const handleSubmit = async (values: UserFormValues) => {
		if (!canManageUsers) {
			toast.error("没有权限", {
				description: "当前账号不可管理用户",
			});
			return;
		}

		const payload = {
			...values,
			role: values.role as UserItem["role"],
		};

		try {
			if (editingUser) {
				await updateMutation.mutateAsync({
					id: editingUser.id,
					data: payload,
				});
				toast.success("保存成功", {
					description: `${editingUser.name} 的资料已更新`,
				});
			} else {
				const result = await createMutation.mutateAsync(payload);
				if (result && "initialPassword" in result) {
					toast.success("创建成功", {
						description: `新用户已创建，初始密码为：${result.initialPassword}`,
						duration: 10000,
					});
				} else {
					toast.success("创建成功", {
						description: "新用户已创建",
					});
				}
			}
			setDialogOpen(false);
		} catch (err) {
			toast.error(editingUser ? "保存失败" : "创建失败", {
				description: err instanceof Error ? err.message : "请稍后重试",
			});
		}
	};

	const handleDialogOpenChange = (open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setEditingUser(null);
		}
	};

	const table = useReactTable({
		data: data?.items ?? [],
		columns: userColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
		pageCount: data?.total ? Math.ceil(data.total / pagination.pageSize) : 1,
		state: {
			pagination,
		},
		onPaginationChange: setPagination,
		meta: {
			onEdit: handleEdit,
		},
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
				</div>
			</div>

			{/* Query Preset Bar */}
			<QueryPresetBar
				systemPresets={systemPresets}
				userPresets={userPresets}
				matchedPresetId={currentActivePresetId}
				onApplyPreset={handleApplyPreset}
				onSavePreset={(name) => savePreset(name, filters)}
				onDeletePreset={deletePreset}
				onRenamePreset={renamePreset}
			/>

			{/* Filter Toolbar */}
			<FilterToolbar
				fields={[
					{
						key: "search",
						type: "search",
						placeholder: "搜索姓名、邮箱或用户名...",
					},
					{
						key: "role",
						type: "multiSelect",
						label: "角色",
						options: roleOptions,
					},
				]}
				filters={filters}
				onFilterChange={setFilter}
				onReset={resetFilters}
				isFiltered={isFiltered}
				table={table}
				viewPreferencesKey={viewPreferencesKey}
				actions={
					canManageUsers && (
						<Button size="sm" className="h-8" onClick={handleCreate}>
							<Plus className="mr-2 h-4 w-4" />
							新增用户
						</Button>
					)
				}
			/>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : isError ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
					加载用户数据失败：{error?.message}
				</div>
			) : (
				<DataListView
					table={table}
					columns={userColumns}
					viewPreferencesKey={viewPreferencesKey}
					renderCard={(item) => <UserCard user={item} onEdit={handleEdit} />}
				/>
			)}

			<DataTablePagination table={table} />

			<UserDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				user={editingUser}
				roles={roles}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>
		</div>
	);
}
