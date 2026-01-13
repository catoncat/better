import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string | Date | null) {
	if (!value) return "-";
	return format(value instanceof Date ? value : new Date(value), "yyyy-MM-dd HH:mm");
}
