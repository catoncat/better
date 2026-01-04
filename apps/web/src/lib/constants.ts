export const USER_ROLE_MAP: Record<string, string> = {
	admin: "系统管理员",
	planner: "生产计划员",
	engineer: "工艺工程师",
	quality: "质量工程师",
	leader: "产线组长",
	operator: "操作员",
};

export const NOTIFICATION_STATUS_MAP: Record<string, string> = {
	unread: "未读",
	read: "已读",
};

export const NOTIFICATION_PRIORITY_MAP: Record<string, string> = {
	low: "低",
	normal: "普通",
	high: "高",
};

export const WORK_ORDER_STATUS_MAP: Record<string, string> = {
	RECEIVED: "已接收",
	RELEASED: "已发布",
	IN_PROGRESS: "进行中",
	COMPLETED: "已完成",
};

export const RUN_STATUS_MAP: Record<string, string> = {
	PREP: "准备中",
	AUTHORIZED: "已授权",
	IN_PROGRESS: "生产中",
	ON_HOLD: "隔离",
	COMPLETED: "已完成",
	CLOSED_REWORK: "闭环返修",
	SCRAPPED: "报废",
};

export const INSPECTION_STATUS_MAP: Record<string, string> = {
	PENDING: "待开始",
	INSPECTING: "检验中",
	PASS: "通过",
	FAIL: "失败",
};

export const INSPECTION_RESULT_MAP: Record<string, string> = {
	PASS: "合格",
	FAIL: "不合格",
	NA: "不适用",
};

export const MRB_DECISION_MAP: Record<string, string> = {
	RELEASE: "放行",
	REWORK: "返修",
	SCRAP: "报废",
};

export const REWORK_TYPE_MAP: Record<string, string> = {
	REUSE_PREP: "复用就绪",
	FULL_PREP: "完整流程",
};
