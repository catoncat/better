import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

interface AppBranding {
	appName: string;
	shortName: string;
}

export function useAppBranding() {
	return useQuery<AppBranding>({
		queryKey: ["system", "app-branding"],
		queryFn: async () => {
			const response = await client.api.system["app-branding"].get();
			return unwrap(response);
		},
		staleTime: 5 * 60 * 1000, // 5 分钟缓存
	});
}
