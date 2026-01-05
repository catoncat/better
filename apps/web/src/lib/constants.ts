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

export const READINESS_ITEM_TYPE_MAP: Record<string, string> = {
	EQUIPMENT: "设备",
	MATERIAL: "物料",
	ROUTE: "路由",
	STENCIL: "钢网",
	SOLDER_PASTE: "锡膏",
	LOADING: "上料",
};
