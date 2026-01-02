import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserItem } from "@/hooks/use-users";
import { userFieldMeta } from "./user-field-meta";

interface UserCardProps {
	user: UserItem;
	onEdit?: (user: UserItem) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
	const primaryField = userFieldMeta.find((field) => field.cardPrimary);
	const badgeField = userFieldMeta.find((field) => field.cardBadge);
	const detailFields = userFieldMeta.filter((field) => field.cardDetail);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					{primaryField?.cardValue?.(user) ?? user.name}
				</CardTitle>
				<div className="flex flex-wrap gap-2 justify-end">{badgeField?.cardValue?.(user)}</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-1.5 text-sm">
					{detailFields.map((field) => {
						const value = field.cardValue?.(user);
						if (value == null || value === "") return null;
						return (
							<div key={field.key} className="flex justify-between">
								<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
								<span>{value}</span>
							</div>
						);
					})}
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
