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

function formatCompileErrors(errors: unknown, maxItems = 3): string | undefined {
	if (!errors) return undefined;

	const items: string[] = [];
	const push = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed) return;
		items.push(trimmed);
	};

	if (Array.isArray(errors)) {
		for (const item of errors) {
			if (!item) continue;
			if (typeof item === "string") {
				push(item);
				continue;
			}
			if (typeof item !== "object") {
				push(String(item));
				continue;
			}

			const record = item as { stepNo?: number; code?: string; message?: string };
			const stepLabel = typeof record.stepNo === "number" ? `Step ${record.stepNo}` : "Step";
			const code = record.code ?? "ERROR";
			const message = record.message ?? "";
			push(`${stepLabel} ${code}: ${message}`);
		}
	} else if (typeof errors === "string") {
		push(errors);
	} else {
		try {
			push(JSON.stringify(errors));
		} catch {
			push(String(errors));
		}
	}

	if (items.length === 0) return undefined;
	const shown = items.slice(0, maxItems);
	const remaining = items.length - shown.length;
	return remaining > 0 ? `${shown.join("; ")} ... (+${remaining})` : shown.join("; ");
}

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
		onSuccess: (data, routingCode) => {
			if (data.status === "READY") {
				toast.success("编译成功", {
					description: `v${data.versionNo} · READY`,
				});
			} else if (data.status === "INVALID") {
				toast.error("编译失败", {
					description:
						formatCompileErrors(data.errorsJson, 4) ??
						`已生成 v${data.versionNo} · INVALID，请检查执行语义配置后重试。`,
				});
			} else {
				toast.message("编译已完成", {
					description: `v${data.versionNo} · ${String(data.status)}`,
				});
			}
			queryClient.invalidateQueries({ queryKey: ["mes", "route-versions", routingCode] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});
}
