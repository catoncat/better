import type { ErpMasterConfig } from "./types";

const ERP_FORM_IDS = {
	workOrder: "PRD_MO",
	material: "BD_Material",
	bom: "ENG_BOM",
	workCenter: ["ENG_WorkCenter"],
	routing: "ENG_Route",
} as const;

export const getErpMasterConfig = (): ErpMasterConfig => ({
	workOrderRoutingField: process.env.MES_ERP_KINGDEE_WORK_ORDER_ROUTING_FIELD?.trim() || null,
	formIds: {
		workOrder: ERP_FORM_IDS.workOrder,
		material: ERP_FORM_IDS.material,
		bom: ERP_FORM_IDS.bom,
		workCenter: [...ERP_FORM_IDS.workCenter],
		routing: ERP_FORM_IDS.routing,
	},
});
