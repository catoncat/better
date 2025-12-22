import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type TableAction, TableActions } from "./table-actions";

export interface CardFieldDefinition<TData> {
	key: keyof TData | string;
	label?: string;
	primary?: boolean;
	badge?: boolean;
	badgeVariant?: "default" | "secondary" | "destructive" | "outline";
	render?: (value: unknown, item: TData) => ReactNode;
	className?: string;
	hideLabel?: boolean;
}

export interface DataCardProps<TData> {
	item: TData;
	fields: CardFieldDefinition<TData>[];
	actions?: TableAction[];
	onClick?: (item: TData) => void;
	className?: string;
}

function getNestedValue<TData>(item: TData, key: string): unknown {
	const keys = key.split(".");
	let value: unknown = item;
	for (const k of keys) {
		if (value == null) return undefined;
		value = (value as Record<string, unknown>)[k];
	}
	return value;
}

export function DataCard<TData>({
	item,
	fields,
	actions,
	onClick,
	className,
}: DataCardProps<TData>) {
	const primaryField = fields.find((f) => f.primary);
	const badgeField = fields.find((f) => f.badge);
	const regularFields = fields.filter((f) => !f.primary && !f.badge);

	const renderValue = (field: CardFieldDefinition<TData>) => {
		const value = getNestedValue(item, field.key as string);
		if (field.render) {
			return field.render(value, item);
		}
		if (value == null || value === "") return "-";
		return String(value);
	};

	return (
		<Card
			className={cn(onClick && "cursor-pointer hover:bg-accent/50 transition-colors", className)}
			onClick={() => onClick?.(item)}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				{primaryField && (
					<CardTitle className="text-sm font-medium">{renderValue(primaryField)}</CardTitle>
				)}
				{badgeField && (
					<Badge variant={badgeField.badgeVariant || "outline"}>{renderValue(badgeField)}</Badge>
				)}
			</CardHeader>
			<CardContent>
				<div className="grid gap-2 text-sm">
					{regularFields.map((field) => (
						<div key={field.key as string} className={cn("flex justify-between", field.className)}>
							{!field.hideLabel && field.label && (
								<span className="text-muted-foreground">{field.label}:</span>
							)}
							<span className={field.hideLabel ? "" : "font-medium"}>{renderValue(field)}</span>
						</div>
					))}
				</div>
				{actions && actions.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2 justify-end">
						<TableActions actions={actions} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
