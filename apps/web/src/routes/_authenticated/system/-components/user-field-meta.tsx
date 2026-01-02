import type { DataListFieldMeta } from "@/components/data-list/field-meta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserItem } from "@/hooks/use-users";
import { USER_ROLE_MAP } from "@/lib/constants";

const renderRoleBadges = (
	roles: UserItem["roles"],
	variant: "secondary" | "outline",
	emptyLabel: string,
) => {
	if (roles.length === 0) {
		return <Badge variant={variant}>{emptyLabel}</Badge>;
	}
	return (
		<div className="flex flex-wrap gap-2">
			{roles.map((role) => (
				<Badge key={role.id} variant={variant}>
					{USER_ROLE_MAP[role.code] ?? role.name ?? role.code}
				</Badge>
			))}
		</div>
	);
};

export const userFieldMeta: DataListFieldMeta<UserItem>[] = [
	{
		key: "name",
		label: "姓名",
		sortable: true,
		cardPrimary: true,
		cardValue: (user) => user.name,
		tableCell: (user) => {
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
		key: "username",
		label: "用户名",
		sortable: true,
		cardDetail: true,
		cardValue: (user) => user.username || "-",
		tableCell: (user) => user.username || "-",
	},
	{
		key: "roles",
		label: "角色",
		sortable: false,
		cardBadge: true,
		cardValue: (user) => renderRoleBadges(user.roles, "outline", "未分配角色"),
		tableCell: (user) => renderRoleBadges(user.roles, "secondary", "未分配"),
	},
	{
		key: "department",
		label: "部门/车间",
		sortable: true,
		cardDetail: true,
		cardValue: (user) => user.department || null,
		tableCell: (user) => user.department || "未填写",
	},
	{
		key: "phone",
		label: "联系电话",
		sortable: true,
		cardDetail: true,
		cardValue: (user) => user.phone || null,
		tableCell: (user) => user.phone || "-",
	},
	{
		key: "isActive",
		label: "状态",
		sortable: true,
		cardDetail: true,
		cardValue: (user) => (
			<Badge variant={user.isActive ? "default" : "destructive"}>
				{user.isActive ? "正常" : "停用"}
			</Badge>
		),
		tableCell: (user) => (
			<Badge variant={user.isActive ? "default" : "destructive"}>
				{user.isActive ? "正常" : "停用"}
			</Badge>
		),
	},
	{
		key: "email",
		label: "邮箱",
		sortable: false,
		tableHidden: true,
		cardDetail: true,
		cardValue: (user) => user.email || "-",
	},
];
