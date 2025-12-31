import type {
	ReadinessCheckStatus,
	ReadinessCheckType,
	ReadinessItemStatus,
	ReadinessItemType,
} from "@better-app/db";

export type CheckItemResult = {
	itemType: ReadinessItemType;
	itemKey: string;
	status: ReadinessItemStatus;
	failReason?: string;
	evidenceJson?: Record<string, unknown>;
};

export type CheckSummary = {
	total: number;
	passed: number;
	failed: number;
	waived: number;
};

export type CheckResultItem = {
	id: string;
	itemType: ReadinessItemType;
	itemKey: string;
	status: ReadinessItemStatus;
	failReason?: string | null;
	waivedAt?: string | null;
	waivedBy?: string | null;
	waiveReason?: string | null;
};

export type CheckResult = {
	checkId: string;
	type: ReadinessCheckType;
	status: ReadinessCheckStatus;
	checkedAt: string;
	checkedBy?: string | null;
	items: CheckResultItem[];
	summary: CheckSummary;
};

export type CheckHistoryEntry = {
	checkId: string;
	type: ReadinessCheckType;
	status: ReadinessCheckStatus;
	checkedAt: string;
	checkedBy?: string | null;
};

export type WaiveResult = {
	itemId: string;
	status: ReadinessItemStatus;
	waivedAt: string;
	waivedBy: string;
	waiveReason: string;
};

export type CanAuthorizeResult = {
	canAuthorize: boolean;
	failedItems?: CheckItemResult[];
};

export type ExceptionItem = {
	runNo: string;
	runStatus: string;
	productCode: string;
	lineCode: string | null;
	lineName: string | null;
	checkId: string;
	checkType: string;
	checkStatus: string;
	checkedAt: string;
	failedCount: number;
	waivedCount: number;
};

export type ExceptionsListResult = {
	items: ExceptionItem[];
	total: number;
	page: number;
	limit: number;
};

export type ExceptionsQuery = {
	lineId?: string;
	status?: "PREP" | "FAI_PENDING" | "ALL";
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
};
