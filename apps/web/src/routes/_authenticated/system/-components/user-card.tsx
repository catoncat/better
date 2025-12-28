import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserItem } from "@/hooks/use-users";
import { USER_ROLE_MAP } from "@/lib/constants";

interface UserCardProps {
	user: UserItem;
	onEdit?: (user: UserItem) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{user.name}</CardTitle>
				<div className="flex flex-wrap gap-2 justify-end">
					{user.roles.length > 0 ? (
						user.roles.map((role) => (
							<Badge key={role.id} variant="outline">
								{USER_ROLE_MAP[role.code] ?? role.name ?? role.code}
							</Badge>
						))
					) : (
						<Badge variant="outline">未分配角色</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-1.5 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">邮箱:</span>
						<span>{user.email || "-"}</span>
					</div>
					{user.phone && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">电话:</span>
							<span>{user.phone}</span>
						</div>
					)}
					{user.department && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">部门:</span>
							<span>{user.department}</span>
						</div>
					)}
				</div>
			</CardContent>
			{onEdit && (
				<CardFooter className="flex justify-end">
					<Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
						<Pencil className="mr-2 h-4 w-4" />
						编辑
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
