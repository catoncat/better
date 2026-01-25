import type { ProcessType } from "@better-app/db";

export const USER_ROLE_MAP: Record<string, string> = {
	admin: "系统管理员",
	planner: "生产计划员",
	engineer: "工艺工程师",
	quality: "质量工程师",
	material: "物料员",
	operator: "操作员",
	trace: "追溯审计员",
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

export const READINESS_ITEM_TYPE_MAP: Record<string, string> = {
	EQUIPMENT: "设备",
	MATERIAL: "物料",
	ROUTE: "路由",
	STENCIL: "钢网",
	SOLDER_PASTE: "锡膏",
	LOADING: "上料",
	// PREP_* 准备项检查（SMT Gap Phase 1）
	PREP_BAKE: "烘烤准备",
	PREP_PASTE: "锡膏准备",
	PREP_STENCIL_USAGE: "钢网使用",
	PREP_STENCIL_CLEAN: "钢网清洗",
	PREP_SCRAPER: "刮刀准备",
	PREP_FIXTURE: "夹具准备",
	PREP_PROGRAM: "炉温程式",
	TIME_RULE: "时间规则",
};

export const PROCESS_TYPE_MAP: Record<ProcessType, string> = {
	SMT: "SMT",
	DIP: "DIP",
};

export const OQC_SAMPLING_TYPE_MAP: Record<string, string> = {
	PERCENTAGE: "按比例 (%)",
	FIXED: "固定数量",
};

export const AUDIT_STATUS_MAP: Record<string, string> = {
	SUCCESS: "成功",
	FAIL: "失败",
};

export const AUDIT_ENTITY_TYPE_MAP: Record<string, string> = {
	WORK_ORDER: "工单",
	RUN: "批次",
	UNIT: "单件",
	TRACK: "过站",
	INSPECTION: "检验",
	DEFECT: "缺陷",
	DISPOSITION: "处置",
	DATA_VALUE: "采集值",
	MATERIAL_USE: "物料使用",
	INTEGRATION: "集成",
	USER: "用户",
	SYSTEM_CONFIG: "系统配置",
	NOTIFICATION: "通知",
	SYSTEM: "系统",
	READINESS_CHECK: "准备检查",
};

export const UNIT_STATUS_MAP: Record<string, string> = {
	QUEUED: "排队",
	IN_STATION: "在站",
	DONE: "完成",
	OUT_FAILED: "不良",
	SCRAPPED: "报废",
	ON_HOLD: "隔离",
};

export const READINESS_STATUS_MAP: Record<string, string> = {
	PENDING: "检查中",
	PASSED: "已通过",
	FAILED: "未通过",
};

export const READINESS_ITEM_STATUS_MAP: Record<string, string> = {
	PASSED: "通过",
	FAILED: "失败",
	WAIVED: "已豁免",
};

export const FAI_STATUS_MAP: Record<string, string> = {
	PENDING: "待开始",
	INSPECTING: "检验中",
	PASS: "已通过",
	FAIL: "未通过",
};

export const DEFECT_STATUS_MAP: Record<string, string> = {
	RECORDED: "已记录",
	DISPOSITIONED: "已处置",
	CLOSED: "已关闭",
};

export const DISPOSITION_TYPE_MAP: Record<string, string> = {
	REWORK: "返工",
	SCRAP: "报废",
	HOLD: "暂扣",
};

export const REWORK_TASK_STATUS_MAP: Record<string, string> = {
	OPEN: "进行中",
	DONE: "已完成",
	CANCELLED: "已取消",
};
