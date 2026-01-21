import { PERMISSION_GROUPS, Permission } from "@better-app/db/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Can } from "@/components/ability/can";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type RoleItem,
	useCreateRole,
	useDeleteRole,
	useRoleList,
	useUpdateRole,
} from "@/hooks/use-roles";
import {
	RoleDialog,
	type RoleFormValues,
} from "@/routes/_authenticated/system/-components/role-dialog";

const dataScopeLabel: Record<RoleItem["dataScope"], string> = {
	ALL: "全部产线",
	ASSIGNED_LINES: "仅管辖产线",
	ASSIGNED_STATIONS: "仅绑定工位",
};

export const Route = createFileRoute("/_authenticated/system/role-management")({
	component: RoleManagementPage,
});

function RoleManagementPage() {
	const { data, isLoading, isError, error } = useRoleList();
	const createRole = useCreateRole();
	const updateRole = useUpdateRole();
	const deleteRole = useDeleteRole();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
	const [initialValues, setInitialValues] = useState<RoleFormValues | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);

	const roles = data?.items ?? [];
	const sortedRoles = useMemo(
		() => [...roles].sort((a, b) => Number(b.isSystem) - Number(a.isSystem)),
		[roles],
	);

	const permissionLabelMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const group of Object.values(PERMISSION_GROUPS)) {
			for (const permission of group.permissions) {
				map.set(permission.value, permission.label);
			}
		}
		return map;
	}, []);

	const handleCreate = () => {
		setEditingRole(null);
		setInitialValues(null);
		setDialogOpen(true);
	};

	const handleEdit = (role: RoleItem) => {
		setEditingRole(role);
		setInitialValues(null);
		setDialogOpen(true);
	};

	const handleClone = (role: RoleItem) => {
		setEditingRole(null);
		setInitialValues({
			code: `${role.code}-copy`,
			name: `${role.name} (复制)`,
			description: role.description ?? "",
			dataScope: role.dataScope,
			permissions: role.permissions,
		});
		setDialogOpen(true);
	};

	const handleDelete = async (role: RoleItem) => {
		if (role.isSystem) {
			toast.error("系统角色不可删除");
			return;
		}
		setDeletingRole(role);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!deletingRole || deletingRole.isSystem) return;
		try {
			await deleteRole.mutateAsync({ id: deletingRole.id });
			toast.success("删除成功");
		} catch (err) {
			toast.error("删除失败", {
				description: err instanceof Error ? err.message : "请稍后重试",
			});
		} finally {
			setDeleteDialogOpen(false);
			setDeletingRole(null);
		}
	};

	const handleSubmit = async (values: RoleFormValues) => {
		try {
			if (editingRole) {
				const payload = editingRole.isSystem
					? { name: values.name, description: values.description }
					: {
							name: values.name,
							description: values.description,
							permissions: values.permissions,
							dataScope: values.dataScope,
						};
				await updateRole.mutateAsync({ id: editingRole.id, data: payload });
				toast.success("保存成功");
			} else {
				await createRole.mutateAsync({
					code: values.code,
					name: values.name,
					description: values.description,
					permissions: values.permissions,
					dataScope: values.dataScope,
				});
				toast.success("创建成功");
			}
			setDialogOpen(false);
			setEditingRole(null);
		} catch (err) {
			toast.error(editingRole ? "保存失败" : "创建失败", {
				description: err instanceof Error ? err.message : "请稍后重试",
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">角色管理</h1>
					<p className="text-sm text-muted-foreground">配置角色与权限点</p>
				</div>
				<Can permissions={Permission.SYSTEM_ROLE_MANAGE}>
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						新增角色
					</Button>
				</Can>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			) : isError ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
					加载角色失败：{error?.message}
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{sortedRoles.map((role) => (
						<Card key={role.id}>
							<CardHeader className="flex flex-row items-start justify-between gap-3">
								<div>
									<CardTitle className="flex items-center gap-2">
										<span>{role.name}</span>
										{role.isSystem && <Badge variant="secondary">系统</Badge>}
									</CardTitle>
									<p className="text-sm text-muted-foreground">{role.code}</p>
								</div>
								<Shield className="h-5 w-5 text-muted-foreground" />
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">{dataScopeLabel[role.dataScope]}</Badge>
									<Badge variant="outline">权限 {role.permissions.length}</Badge>
								</div>
								{role.description && (
									<p className="text-sm text-muted-foreground">{role.description}</p>
								)}
								<div className="flex flex-wrap gap-2">
									{role.permissions.slice(0, 4).map((permission) => (
										<Badge key={permission} variant="secondary" title={permission}>
											{permissionLabelMap.get(permission) ?? permission}
										</Badge>
									))}
									{role.permissions.length > 4 && (
										<Badge variant="secondary">+{role.permissions.length - 4}</Badge>
									)}
								</div>
								<Can permissions={Permission.SYSTEM_ROLE_MANAGE}>
									<div className="flex flex-wrap gap-2">
										<Button size="sm" variant="outline" onClick={() => handleEdit(role)}>
											编辑
										</Button>
										<Button size="sm" variant="secondary" onClick={() => handleClone(role)}>
											<Copy className="mr-2 h-4 w-4" />
											克隆
										</Button>
										<Button
											size="sm"
											variant="destructive"
											disabled={role.isSystem || deleteRole.isPending}
											onClick={() => handleDelete(role)}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											删除
										</Button>
									</div>
								</Can>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<RoleDialog
				open={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open);
					if (!open) {
						setEditingRole(null);
						setInitialValues(null);
					}
				}}
				role={editingRole}
				initialValues={initialValues}
				onSubmit={handleSubmit}
				isSubmitting={createRole.isPending || updateRole.isPending}
			/>

			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setDeletingRole(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确定删除此角色？</AlertDialogTitle>
						<AlertDialogDescription>
							角色：{deletingRole?.name ?? "-"}。此操作不可撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmDelete} disabled={deleteRole.isPending}>
							确认删除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
