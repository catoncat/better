import type { ColumnDef, TableMeta } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { TableActions } from "@/components/data-table/table-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserItem } from "@/hooks/use-users";
import { USER_ROLE_MAP } from "@/lib/constants";

export const userColumns: ColumnDef<UserItem>[] = [
	{
		accessorKey: "name",
		header: "姓名",
		cell: ({ row }) => {
			const user = row.original;
			const email = user.email || "未填写邮箱";
			const initials = user.name?.slice(0, 1) || "?";

			return (
				<div className="flex items-center gap-3">
					<Avatar className="h-9 w-9">
						{user.image ? (
							<AvatarImage src={user.image} alt={user.name} />
						) : (
							<AvatarFallback>{initials}</AvatarFallback>
						)}
					</Avatar>
					<div className="flex flex-col">
						<span className="font-medium leading-tight">{user.name}</span>
						<span className="text-muted-foreground text-xs leading-tight">{email}</span>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "username",
		header: "用户名",
		cell: ({ row }) => row.getValue("username") || "-",
	},
	{
		id: "roles",
		header: "角色",
		cell: ({ row }) => {
			const roles = row.original.roles;
			if (roles.length === 0) {
				return <Badge variant="secondary">未分配</Badge>;
			}
			return (
				<div className="flex flex-wrap gap-2">
					{roles.map((role) => (
						<Badge key={role.id} variant="secondary">
							{USER_ROLE_MAP[role.code] ?? role.name ?? role.code}
						</Badge>
					))}
				</div>
			);
		},
	},
	{
		accessorKey: "department",
		header: "部门/车间",
		cell: ({ row }) => row.getValue("department") || "未填写",
	},
	{
		accessorKey: "phone",
		header: "联系电话",
		cell: ({ row }) => row.getValue("phone") || "-",
	},
	{
		accessorKey: "isActive",
		header: "状态",
		cell: ({ row }) => {
			const isActive = row.getValue("isActive") as boolean;
			return (
				<Badge variant={isActive ? "default" : "destructive"}>{isActive ? "正常" : "停用"}</Badge>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row, table }) => {
			const meta = table.options.meta as TableMeta<UserItem> & {
				onEdit?: (user: UserItem) => void;
			};

			return (
				<TableActions
					actions={[
						{
							icon: Pencil,
							label: "编辑资料",
							onClick: () => meta?.onEdit?.(row.original),
						},
					]}
				/>
			);
		},
	},
];
