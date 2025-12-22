import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

// Infer Instrument type from the API using Eden Treaty
type ApiInstrumentResponse = Awaited<ReturnType<typeof client.api.instruments.get>>["data"];
export type Instrument = NonNullable<ApiInstrumentResponse>["items"][number];
export type InstrumentList = Exclude<
	ApiInstrumentResponse,
	{ code: string; message: string } | null | undefined
>;
type InstrumentCreateInput = Parameters<typeof client.api.instruments.post>[0];
type InstrumentUpdateInput = Parameters<ReturnType<typeof client.api.instruments>["patch"]>[0];

interface UseInstrumentListParams {
	page?: number;
	pageSize?: number;
	calibrationType?: string | string[];
	department?: string | string[];
	ownerId?: string;
	search?: string;
	sort?: string;
}

export function useInstrumentList(params: UseInstrumentListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;
	const calibrationType = Array.isArray(params.calibrationType)
		? params.calibrationType.join(",")
		: (params.calibrationType ?? "");
	const department = Array.isArray(params.department)
		? params.department.join(",")
		: (params.department ?? "");
	const search = params.search ?? "";
	const ownerId = params.ownerId ?? "";
	const sort = params.sort ?? "";

	return useQuery<InstrumentList>({
		queryKey: ["instruments", page, pageSize, search, calibrationType, department, ownerId, sort],
		queryFn: async () => {
			const { data, error } = await client.api.instruments.get({
				query: {
					page,
					pageSize,
					search: search || undefined,
					calibrationType: calibrationType || undefined,
					department: department || undefined,
					ownerId: ownerId || undefined,
					sort: sort || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "An error occurred");
			}

			if (!data) {
				throw new Error("No data received");
			}

			return data;
		},
		placeholderData: (previousData: InstrumentList | undefined) => previousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export function useCreateInstrument() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: InstrumentCreateInput) => {
			const { data, error } = await client.api.instruments.post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建仪器失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("仪器已创建");
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
			queryClient.invalidateQueries({ queryKey: ["instrument-departments"] });
		},
	});
}

export function useUpdateInstrument() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...body }: InstrumentUpdateInput & { id: string }) => {
			const { data, error } = await client.api.instruments({ id }).patch(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "更新仪器失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("仪器已更新");
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
			queryClient.invalidateQueries({ queryKey: ["instrument-departments"] });
		},
	});
}
