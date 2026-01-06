import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, unwrap } from "@/lib/eden";

// Stencil status types
export type StencilStatus = "READY" | "NOT_READY" | "MAINTENANCE";

export type RecordStencilStatusInput = {
	eventId: string;
	eventTime: string;
	stencilId: string;
	version?: string;
	status: StencilStatus;
	tensionValue?: number;
	lastCleanedAt?: string;
	operatorId?: string;
};

// Solder paste status types
export type SolderPasteStatus = "COMPLIANT" | "NON_COMPLIANT" | "EXPIRED";

export type RecordSolderPasteStatusInput = {
	eventId: string;
	eventTime: string;
	lotId: string;
	status: SolderPasteStatus;
	expiresAt?: string;
	thawedAt?: string;
	stirredAt?: string;
	operatorId?: string;
};

/**
 * Record stencil status (manual entry)
 */
export function useRecordStencilStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: RecordStencilStatusInput) => {
			const response = await client.api.integration["stencil-status"].post({
				...input,
				source: "MANUAL",
			});
			return unwrap(response);
		},
		onSuccess: (data) => {
			if (data.isDuplicate) {
				toast.info("钢网状态记录已存在（重复事件）");
			} else {
				toast.success("钢网状态已录入");
			}
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "stencil"] });
		},
	});
}

/**
 * Record solder paste status (manual entry)
 */
export function useRecordSolderPasteStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: RecordSolderPasteStatusInput) => {
			const response = await client.api.integration["solder-paste-status"].post({
				...input,
				source: "MANUAL",
			});
			return unwrap(response);
		},
		onSuccess: (data) => {
			if (data.isDuplicate) {
				toast.info("锡膏状态记录已存在（重复事件）");
			} else {
				toast.success("锡膏状态已录入");
			}
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "solder-paste"] });
		},
	});
}

/**
 * Bind stencil to a line
 */
export function useBindStencilToLine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId, stencilId }: { lineId: string; stencilId: string }) => {
			const response = await client.api.integration
				.lines({ lineId })
				.stencil.bind.post({ stencilId });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("钢网已绑定到产线");
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "line-bindings"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness"] });
		},
	});
}

/**
 * Unbind stencil from a line
 */
export function useUnbindStencilFromLine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId }: { lineId: string }) => {
			const response = await client.api.integration.lines({ lineId }).stencil.unbind.post({});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("钢网已从产线解绑");
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "line-bindings"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness"] });
		},
	});
}

/**
 * Bind solder paste to a line
 */
export function useBindSolderPasteToLine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId, lotId }: { lineId: string; lotId: string }) => {
			const response = await client.api.integration
				.lines({ lineId })
				["solder-paste"].bind.post({ lotId });
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("锡膏已绑定到产线");
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "line-bindings"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness"] });
		},
	});
}

/**
 * Unbind solder paste from a line
 */
export function useUnbindSolderPasteFromLine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ lineId }: { lineId: string }) => {
			const response = await client.api.integration
				.lines({ lineId })
				["solder-paste"].unbind.post({});
			return unwrap(response);
		},
		onSuccess: () => {
			toast.success("锡膏已从产线解绑");
			queryClient.invalidateQueries({ queryKey: ["mes", "integration", "line-bindings"] });
			queryClient.invalidateQueries({ queryKey: ["mes", "readiness"] });
		},
	});
}
