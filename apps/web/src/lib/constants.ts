export const USER_ROLE_MAP: Record<string, string> = {
	admin: "管理员",
	supervisor: "主管",
	workshop_supervisor: "车间主管",
	technician: "维修技师",
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
	CLOSED: "已关闭",
	CANCELLED: "已取消",
};

export const RUN_STATUS_MAP: Record<string, string> = {
	PREP: "准备中",
	FAI_PENDING: "FAI待定",
	AUTHORIZED: "已授权",
	RUNNING: "生产中",
	FINISHING: "收尾中",
	ARCHIVED: "已归档",
	CANCELLED: "已取消",
};
