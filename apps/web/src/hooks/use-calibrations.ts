import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/eden";

const calibrationListRoute = client.api.instruments({ id: "instrument-id" }).calibrations;
const calibrationDetailRoute = calibrationListRoute({ recordId: "record-id" });
const allCalibrationRoute = client.api.instruments.calibrations;

type CalibrationListArgs = NonNullable<Parameters<typeof calibrationListRoute.get>[0]>;
type CalibrationListQuery = CalibrationListArgs["query"];
export type CalibrationCreateInput = Parameters<typeof calibrationListRoute.post>[0];
export type CalibrationListResponse = Awaited<ReturnType<typeof calibrationListRoute.get>>["data"];
export type CalibrationListSuccess = Extract<CalibrationListResponse, { items: unknown[] }>;
type CalibrationAllArgs = NonNullable<Parameters<typeof allCalibrationRoute.get>[0]>;
type CalibrationAllQuery = CalibrationAllArgs["query"];
export type CalibrationAllResponse = Awaited<ReturnType<typeof allCalibrationRoute.get>>["data"];
export type CalibrationAllSuccess = Extract<CalibrationAllResponse, { items: unknown[] }>;

export type InstrumentDetailResponse = Awaited<
	ReturnType<ReturnType<typeof client.api.instruments>["get"]>
>["data"];
export type InstrumentDetailSuccess = Extract<InstrumentDetailResponse, { id: string }>;

type CalibrationUpdateInput = Parameters<typeof calibrationDetailRoute.patch>[0];
type CalibrationDeleteInput = NonNullable<Parameters<typeof calibrationDetailRoute.delete>[0]>;

export function useInstrumentDetail(id?: string) {
	return useQuery({
		queryKey: ["instrument", id],
		enabled: Boolean(id),
		queryFn: async () => {
			if (!id) throw new Error("Missing instrument id");

			const { data, error } = await client.api.instruments({ id }).get();

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载仪器失败");
			}

			if (!data || !("id" in data)) {
				throw new Error((data as { message?: string } | undefined)?.message ?? "仪器不存在");
			}

			return data as InstrumentDetailSuccess;
		},
	});
}

export function useCalibrationRecords(instrumentId: string, query: CalibrationListQuery = {}) {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 20;
	const result = query.result ?? "";
	const dateFrom = query.dateFrom ?? "";
	const dateTo = query.dateTo ?? "";
	const sort = query.sort ?? "";

	return useQuery({
		queryKey: ["calibrations", instrumentId, page, pageSize, result, dateFrom, dateTo, sort],
		enabled: Boolean(instrumentId),
		queryFn: async () => {
			const { data, error } = await client.api.instruments({ id: instrumentId }).calibrations.get({
				query: {
					page,
					pageSize,
					result: result || undefined,
					dateFrom: dateFrom || undefined,
					dateTo: dateTo || undefined,
					sort: sort || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载校准记录失败");
			}

			if (!data || !("items" in data)) {
				throw new Error((data as { message?: string } | undefined)?.message ?? "未获取到记录");
			}

			return data as CalibrationListSuccess;
		},
		placeholderData: (previousData) => previousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export function useAllCalibrationRecords(query: CalibrationAllQuery = {}) {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 20;
	const result = query.result ?? "";
	const dateFrom = query.dateFrom ?? "";
	const dateTo = query.dateTo ?? "";
	const calibrationType = query.calibrationType ?? "";
	const instrumentId = query.instrumentId ?? "";
	const sort = query.sort ?? "";

	return useQuery({
		queryKey: [
			"calibrations",
			"all",
			page,
			pageSize,
			result,
			dateFrom,
			dateTo,
			calibrationType,
			instrumentId,
			sort,
		],
		queryFn: async () => {
			const { data, error } = await allCalibrationRoute.get({
				query: {
					...query,
					page,
					pageSize,
					result: result || undefined,
					dateFrom: dateFrom || undefined,
					dateTo: dateTo || undefined,
					calibrationType: calibrationType || undefined,
					instrumentId: instrumentId || undefined,
					sort: sort || undefined,
				},
			});

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "加载校准记录失败");
			}

			if (!data || !("items" in data)) {
				throw new Error((data as { message?: string } | undefined)?.message ?? "未获取到记录");
			}

			return data as CalibrationAllSuccess;
		},
		placeholderData: (previousData) => previousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export function useCreateCalibrationRecord(instrumentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: CalibrationCreateInput) => {
			const { data, error } = await client.api
				.instruments({ id: instrumentId })
				.calibrations.post(body);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建记录失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("校准记录已创建");
			queryClient.invalidateQueries({ queryKey: ["calibrations", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instrument", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
		},
	});
}

export function useCreateCalibrationRecordForAnyInstrument() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			instrumentId,
			data,
		}: {
			instrumentId: string;
			data: CalibrationCreateInput;
		}) => {
			const { data: result, error } = await client.api
				.instruments({ id: instrumentId })
				.calibrations.post(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "创建记录失败");
			}

			return { result, instrumentId };
		},
		onSuccess: (_result, variables) => {
			toast.success("校准记录已创建");
			queryClient.invalidateQueries({ queryKey: ["calibrations", "all"] });
			queryClient.invalidateQueries({ queryKey: ["calibrations", variables.instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instrument", variables.instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
		},
	});
}

export function useUpdateCalibrationRecord(instrumentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ recordId, data }: { recordId: string; data: CalibrationUpdateInput }) => {
			const { data: result, error } = await client.api
				.instruments({ id: instrumentId })
				.calibrations({ recordId })
				.patch(data);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "更新记录失败");
			}

			return result;
		},
		onSuccess: () => {
			toast.success("校准记录已更新");
			queryClient.invalidateQueries({ queryKey: ["calibrations", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instrument", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
		},
	});
}

export function useDeleteCalibrationRecord(instrumentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			recordId,
			query,
		}: {
			recordId: string;
			query?: CalibrationDeleteInput;
		}) => {
			const { data, error } = await client.api
				.instruments({ id: instrumentId })
				.calibrations({ recordId })
				.delete(query);

			if (error) {
				throw new Error(error.value ? JSON.stringify(error.value) : "删除记录失败");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("校准记录已删除");
			queryClient.invalidateQueries({ queryKey: ["calibrations", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instrument", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
		},
	});
}
