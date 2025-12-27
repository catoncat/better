import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;

const routeVersionsApi = (code: string) => client.api.routes({ routingCode: code }).versions;
type RouteVersionListResponse = Awaited<
	ReturnType<ReturnType<typeof routeVersionsApi>["get"]>
>["data"];
type RouteVersionListData = UnwrapEnvelope<NonNullable<RouteVersionListResponse>>;
export type RouteVersion = RouteVersionListData["items"][number];

export function useRouteVersions(routingCode: string) {
	return useQuery({
		queryKey: ["mes", "route-versions", routingCode],
		enabled: Boolean(routingCode),
		queryFn: async () => {
			const response = await client.api.routes({ routingCode }).versions.get();
			const data = unwrap(response);
			return data.items;
		},
		staleTime: 15_000,
	});
}

export function useCompileRouteVersion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (routingCode: string) => {
			const response = await client.api.routes({ routingCode }).compile.post();
			return unwrap(response);
		},
		onSuccess: (_data, routingCode) => {
			toast.success("路由版本已编译");
			queryClient.invalidateQueries({ queryKey: ["mes", "route-versions", routingCode] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
