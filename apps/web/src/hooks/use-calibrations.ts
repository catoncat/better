import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

const calibrationListRoute = client.api.instruments({ id: "instrument-id" }).calibrations;
const calibrationDetailRoute = calibrationListRoute({ recordId: "record-id" });
const allCalibrationRoute = client.api.instruments.calibrations;
const instrumentDetailRoute = client.api.instruments({ id: "instrument-id" });

type CalibrationListArgs = NonNullable<Parameters<typeof calibrationListRoute.get>[0]>;
type CalibrationListQuery = CalibrationListArgs["query"];
export type CalibrationCreateInput = Parameters<typeof calibrationListRoute.post>[0];

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type CalibrationListRawResponse = Awaited<ReturnType<typeof calibrationListRoute.get>>["data"];
type CalibrationListData = UnwrapEnvelope<NonNullable<CalibrationListRawResponse>>;
export type CalibrationListResponse = CalibrationListData;
export type CalibrationListSuccess = CalibrationListData;

type CalibrationAllArgs = NonNullable<Parameters<typeof allCalibrationRoute.get>[0]>;
type CalibrationAllQuery = CalibrationAllArgs["query"];
type CalibrationAllRawResponse = Awaited<ReturnType<typeof allCalibrationRoute.get>>["data"];
type CalibrationAllData = UnwrapEnvelope<NonNullable<CalibrationAllRawResponse>>;
export type CalibrationAllResponse = CalibrationAllData;
export type CalibrationAllSuccess = CalibrationAllData;

// Instrument detail type
type InstrumentDetailResponse = Awaited<ReturnType<typeof instrumentDetailRoute.get>>["data"];
export type InstrumentDetailSuccess = UnwrapEnvelope<NonNullable<InstrumentDetailResponse>>;

type CalibrationUpdateInput = Parameters<typeof calibrationDetailRoute.patch>[0];
type CalibrationDeleteInput = NonNullable<Parameters<typeof calibrationDetailRoute.delete>[0]>;

export function useInstrumentDetail(id?: string) {
	return useQuery<InstrumentDetailSuccess>({
		queryKey: ["instrument", id],
		enabled: Boolean(id),
		queryFn: async () => {
			if (!id) throw new Error("Missing instrument id");
			const response = await client.api.instruments({ id }).get();
			return unwrap(response);
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

	return useQuery<CalibrationListData>({
		queryKey: ["calibrations", instrumentId, page, pageSize, result, dateFrom, dateTo, sort],
		enabled: Boolean(instrumentId),
		queryFn: async () => {
			const response = await client.api.instruments({ id: instrumentId }).calibrations.get({
				query: {
					page,
					pageSize,
					result: result || undefined,
					dateFrom: dateFrom || undefined,
					dateTo: dateTo || undefined,
					sort: sort || undefined,
				},
			});
			return unwrap(response);
		},
		placeholderData: (previousData: CalibrationListData | undefined) => previousData,
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

	return useQuery<CalibrationAllData>({
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
			const response = await allCalibrationRoute.get({
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
			return unwrap(response);
		},
		placeholderData: (previousData: CalibrationAllData | undefined) => previousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
}

export function useCreateCalibrationRecord(instrumentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: CalibrationCreateInput) => {
			const response = await client.api.instruments({ id: instrumentId }).calibrations.post(body);
			return unwrap(response);
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
			const response = await client.api.instruments({ id: instrumentId }).calibrations.post(data);
			const result = unwrap(response);
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
			const response = await client.api
				.instruments({ id: instrumentId })
				.calibrations({ recordId })
				.patch(data);
			return unwrap(response);
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
			const response = await client.api
				.instruments({ id: instrumentId })
				.calibrations({ recordId })
				.delete(query);
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("校准记录已删除");
			queryClient.invalidateQueries({ queryKey: ["calibrations", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instrument", instrumentId] });
			queryClient.invalidateQueries({ queryKey: ["instruments"] });
		},
	});
}
