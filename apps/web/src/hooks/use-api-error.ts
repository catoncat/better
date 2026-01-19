import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

export const useApiError = () => {
	return (title: string, error: unknown, fallback = "请重试或联系管理员") => {
		toast.error(title, {
			description: getApiErrorMessage(error, fallback),
		});
	};
};
