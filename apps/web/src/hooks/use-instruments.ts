import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Infer Instrument type from the API using Eden Treaty
type ApiInstrumentResponse = Awaited<ReturnType<typeof client.api.instruments.get>>;
// Assuming unwrap returns { items: Instrument[] }
type InstrumentListData = { items: unknown[]; total: number; page: number; pageSize: number };
export type Instrument = InstrumentListData["items"][number];
export type InstrumentList = InstrumentListData;

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
			const response = await client.api.instruments.get({
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

			return unwrap(response);
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
			const response = await client.api.instruments.post(body);
			return unwrap(response);
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
			const response = await client.api.instruments({ id }).patch(body);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("仪器已更新");
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
			queryClient.invalidateQueries({ queryKey: ["instrument-departments"] });
		},
	});
}