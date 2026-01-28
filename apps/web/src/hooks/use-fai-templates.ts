import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { client, unwrap } from "@/lib/eden";

const faiTemplatesApi = client.api["fai-templates"];
const faiTemplateApi = (templateId: string) => client.api["fai-templates"]({ templateId });

type FaiTemplateListResponse = Awaited<ReturnType<typeof faiTemplatesApi.get>>["data"];
type FaiTemplateListData = NonNullable<FaiTemplateListResponse>["data"];
export type FaiTemplateSummary = FaiTemplateListData["items"][number];

type FaiTemplateDetailResponse = Awaited<ReturnType<ReturnType<typeof faiTemplateApi>["get"]>>["data"];
export type FaiTemplateDetail = NonNullable<FaiTemplateDetailResponse>["data"];

type FaiTemplateCreateInput = Parameters<typeof faiTemplatesApi.post>[0];
type FaiTemplateUpdateInput = Parameters<ReturnType<typeof faiTemplateApi>["patch"]>[0];

export interface FaiTemplateListParams {
	page?: number;
	pageSize?: number;
	search?: string;
	productCode?: string;
	processType?: "SMT" | "DIP";
	isActive?: "true" | "false";
}

export function useFaiTemplateList(
	params: FaiTemplateListParams,
	options?: { enabled?: boolean },
) {
	return useQuery<FaiTemplateListData>({
		queryKey: ["mes", "fai-templates", params],
		enabled: options?.enabled ?? true,
		queryFn: async () => {
			const response = await faiTemplatesApi.get({
				query: {
					page: params.page ?? 1,
					pageSize: params.pageSize ?? 30,
					search: params.search || undefined,
					productCode: params.productCode || undefined,
					processType: params.processType,
					isActive: params.isActive,
				},
			});
			return unwrap(response);
		},
		staleTime: 15_000,
	});
}

export function useFaiTemplateDetail(templateId: string | undefined, options?: { enabled?: boolean }) {
	return useQuery<FaiTemplateDetail>({
		queryKey: ["mes", "fai-templates", "detail", templateId],
		enabled: Boolean(templateId) && (options?.enabled ?? true),
		queryFn: async () => {
			if (!templateId) {
				throw new Error("templateId is required");
			}
			const response = await faiTemplateApi(templateId).get();
			return unwrap(response);
		},
	});
}

export function useCreateFaiTemplate() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async (input: FaiTemplateCreateInput) => {
			const response = await faiTemplatesApi.post(input);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("FAI 模板已创建");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai-templates"] });
		},
		onError: (error: unknown) => showError("创建 FAI 模板失败", error),
	});
}

export function useUpdateFaiTemplate() {
	const queryClient = useQueryClient();
	const showError = useApiError();

	return useMutation({
		mutationFn: async ({ templateId, ...input }: { templateId: string } & FaiTemplateUpdateInput) => {
			const response = await faiTemplateApi(templateId).patch(input);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("FAI 模板已更新");
			queryClient.invalidateQueries({ queryKey: ["mes", "fai-templates"] });
		},
		onError: (error: unknown) => showError("更新 FAI 模板失败", error),
	});
}
