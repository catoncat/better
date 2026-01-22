import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataListLayout, type SystemPreset } from "@/components/data-list";
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
	roleId: string[];
}

interface UserSearchParams {
	search?: string;
	roleId?: string;
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_authenticated/system/user-management")({
	validateSearch: (search: Record<string, unknown>): UserSearchParams => ({
		search: (search.search as string) || undefined,
		roleId: (search.roleId as string) || undefined,
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
	const locationSearch = typeof window !== "undefined" ? window.location.search : "";
	const { data: roles = [] } = useUserRoles();
	const roleIdByCode = useMemo(() => new Map(roles.map((role) => [role.code, role.id])), [roles]);

	const roleOptions = useMemo(
		() => roles.map((role) => ({ label: role.name, value: role.id })),
		[roles],
	);

	// Parse filters from URL
	const filters: UserFilters = useMemo(
		() => ({
			search: searchParams.search || "",
			roleId: searchParams.roleId?.split(",").filter(Boolean) || [],
		}),
		[searchParams],
	);

	const isFiltered = useMemo(() => {
		return filters.search !== "" || filters.roleId.length > 0;
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

	// Pagination state (driven by URL via DataListLayout server mode)
	const [pageIndex, setPageIndex] = useState((searchParams.page || 1) - 1);
	const [pageSize, setPageSize] = useState(searchParams.pageSize || 20);

	// Sync pagination state from URL (sorting/filtering resets page)
	useEffect(() => {
		setPageIndex((searchParams.page || 1) - 1);
		setPageSize(searchParams.pageSize || 20);
	}, [searchParams.page, searchParams.pageSize]);

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
	} = useQueryPresets<UserFilters>({
		storageKey: "user-management",
		sortableArrayKeys: ["roleId"],
	});

	// System presets (removed "all" per global rule)
	const systemPresets = useMemo((): SystemPreset<UserFilters>[] => {
		const presets: SystemPreset<UserFilters>[] = [];
		const presetRoleCodes = [
			"admin",
			"planner",
			"engineer",
			"quality",
			"material",
			"operator",
			"trace",
		] as const;

		for (const code of presetRoleCodes) {
			const roleId = roleIdByCode.get(code);
			if (!roleId) continue;
			presets.push({
				id: code,
				name: USER_ROLE_MAP[code] ?? code,
				filters: { roleId: [roleId] },
			});
		}

		return presets;
	}, [roleIdByCode]);

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
				roleId: [],
				...presetFilters,
			};
			setFilters(newFilters);
			applyPreset(presetId);
		},
		[setFilters, applyPreset],
	);

	const { data, isLoading, isError, error } = useUserList({
		page: pageIndex + 1,
		pageSize,
		search: filters.search.trim() || undefined,
		roleId: filters.roleId.length > 0 ? filters.roleId : undefined,
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

	return (
		<DataListLayout
			mode="server"
			data={data?.items || []}
			columns={userColumns}
			pageCount={data?.total ? Math.ceil(data.total / pageSize) : 1}
			onPaginationChange={handlePaginationChange}
			initialPageIndex={(searchParams.page || 1) - 1}
			initialPageSize={searchParams.pageSize || 20}
			locationSearch={locationSearch}
			isLoading={isLoading}
			loadingFallback={
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			}
			error={
				isError ? (
					<div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
						加载用户数据失败：{error?.message}
					</div>
				) : undefined
			}
			tableMeta={{
				onEdit: handleEdit,
			}}
			header={
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
					</div>
				</div>
			}
			queryPresetBarProps={{
				systemPresets,
				userPresets,
				matchedPresetId: currentActivePresetId,
				onApplyPreset: handleApplyPreset,
				onSavePreset: (name) => savePreset(name, filters),
				onDeletePreset: deletePreset,
				onRenamePreset: renamePreset,
			}}
			filterToolbarProps={{
				fields: [
					{
						key: "search",
						type: "search",
						placeholder: "搜索姓名、邮箱或用户名...",
					},
					{
						key: "roleId",
						type: "multiSelect",
						label: "角色",
						options: roleOptions,
					},
				],
				filters,
				onFilterChange: setFilter,
				onFiltersChange: setFilters,
				onReset: resetFilters,
				isFiltered,
				viewPreferencesKey,
				actions: canManageUsers && (
					<Button size="sm" className="h-8" onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						新增用户
					</Button>
				),
			}}
			dataListViewProps={{
				viewPreferencesKey,
				renderCard: (item) => <UserCard user={item as UserItem} onEdit={handleEdit} />,
			}}
		>
			<UserDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				user={editingUser}
				roles={roles}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>
		</DataListLayout>
	);
}
