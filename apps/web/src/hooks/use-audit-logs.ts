import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/lib/eden";

const auditLogsApi = client.api["audit-logs"];

type UnwrapEnvelope<T> = T extends { data: infer D } ? D : T;
type AuditLogListResponse = Awaited<ReturnType<typeof auditLogsApi.get>>["data"];
type AuditLogListData = UnwrapEnvelope<NonNullable<AuditLogListResponse>>;

export type AuditLogItem = AuditLogListData["items"][number];
export type AuditLogList = AuditLogListData;

type AuditEntityType = AuditLogItem["entityType"];

export interface UseAuditLogListParams {
	page?: number;
	pageSize?: number;
	actorId?: string;
	entityType?: AuditEntityType;
	entityId?: string;
	action?: string;
	status?: string;
	from?: string;
	to?: string;
}

export function useAuditLogList(params: UseAuditLogListParams) {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 30;

	return useQuery<AuditLogList>({
		queryKey: ["audit-logs", page, pageSize, params],
		queryFn: async () => {
			const response = await auditLogsApi.get({
				query: {
					page,
					pageSize,
					actorId: params.actorId || undefined,
					entityType: params.entityType,
					entityId: params.entityId || undefined,
					action: params.action || undefined,
					status: params.status || undefined,
					from: params.from || undefined,
					to: params.to || undefined,
				},
			});

			return unwrap(response);
		},
		placeholderData: (previousData) => previousData,
	});
}
