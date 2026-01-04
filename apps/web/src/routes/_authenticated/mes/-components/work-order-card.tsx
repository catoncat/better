import { Permission } from "@better-app/db/permissions";
import { CheckCircle2, Clock, Pencil, Play, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAbility } from "@/hooks/use-ability";
import type { WorkOrder } from "@/hooks/use-work-orders";
import { WORK_ORDER_STATUS_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getPickStatusLabel, workOrderFieldMeta } from "./work-order-field-meta";

interface WorkOrderCardProps {
	workOrder: WorkOrder;
	onCreateRun?: (wo: WorkOrder) => void;
	onRelease?: (wo: WorkOrder) => void;
	onEditPickStatus?: (wo: WorkOrder) => void;
}

export function WorkOrderCard({
	workOrder,
	onCreateRun,
	onRelease,
	onEditPickStatus,
}: WorkOrderCardProps) {
	const { hasPermission } = useAbility();
	const statusLabel = WORK_ORDER_STATUS_MAP[workOrder.status] || workOrder.status;
	let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

	// Check if this is an ERP work order (erpStatus has value) or manual work order
	const isErpWorkOrder = Boolean(workOrder.erpStatus);
	// Get the effective pick status based on work order type
	const effectivePickStatus = isErpWorkOrder ? workOrder.erpPickStatus : workOrder.pickStatus;
	const isMaterialReady = ["2", "3", "4"].includes(effectivePickStatus ?? "");
	const isReleased = workOrder.status === "RELEASED";

	if (workOrder.status === "RELEASED") statusVariant = "secondary";
	if (workOrder.status === "IN_PROGRESS") statusVariant = "default";
	if (workOrder.status === "COMPLETED") statusVariant = "outline";

	const primaryField = workOrderFieldMeta.find((field) => field.cardPrimary);
	const secondaryField = workOrderFieldMeta.find((field) => field.cardSecondary);
	const badgeField = workOrderFieldMeta.find((field) => field.cardBadge);
	const detailFields = workOrderFieldMeta.filter((field) => field.cardDetail);
	const plannedQtyField = workOrderFieldMeta.find((field) => field.key === "plannedQty");

	return (
		<Card className={cn(isReleased && isMaterialReady && "border-l-4 border-l-emerald-500")}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					{primaryField?.cardValue?.(workOrder) ?? workOrder.woNo}
				</CardTitle>
				<div className="flex items-center gap-2">
					{isReleased && isMaterialReady && (
						<span className="flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
							<CheckCircle2 className="mr-1 h-3 w-3" />
							可开工
						</span>
					)}
					{isReleased && !isMaterialReady && (
						<span className="flex items-center text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
							<Clock className="mr-1 h-3 w-3" />
							待齐料
						</span>
					)}
					{badgeField?.cardValue?.(workOrder) ?? (
						<Badge variant={statusVariant}>{statusLabel}</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">
					{secondaryField?.cardValue?.(workOrder) ?? workOrder.productCode}
				</div>
				<p className="text-xs text-muted-foreground">
					{plannedQtyField?.label ?? "计划数量"}:{" "}
					{plannedQtyField?.cardValue?.(workOrder) ?? workOrder.plannedQty}
				</p>
				<div className="mt-4 space-y-1 text-sm">
					{detailFields.map((field) => {
						if (field.key === "pickStatus") {
							return (
								<div key={field.key} className="flex justify-between">
									<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
									<span className="flex items-center gap-1">
										<span
											className={cn(
												"font-medium",
												effectivePickStatus === "1" ? "text-muted-foreground" : "text-foreground",
											)}
										>
											{getPickStatusLabel(effectivePickStatus)}
										</span>
										{!isErpWorkOrder && hasPermission(Permission.WO_UPDATE) && (
											<Button
												variant="ghost"
												size="icon"
												className="h-5 w-5 hover:bg-muted"
												onClick={() => onEditPickStatus?.(workOrder)}
											>
												<Pencil className="h-3 w-3" />
											</Button>
										)}
									</span>
								</div>
							);
						}

						return (
							<div key={field.key} className="flex justify-between">
								<span className="text-muted-foreground">{field.cardLabel ?? field.label}:</span>
								<span>{field.cardValue?.(workOrder) ?? "-"}</span>
							</div>
						);
					})}
				</div>
			</CardContent>

			<CardFooter className="flex justify-end space-x-2">
				{workOrder.status === "RECEIVED" && hasPermission(Permission.WO_RELEASE) && (
					<Button variant="ghost" size="sm" onClick={() => onRelease?.(workOrder)}>
						<Send className="mr-2 h-4 w-4" />
						发布
					</Button>
				)}
				{(workOrder.status === "RELEASED" || workOrder.status === "IN_PROGRESS") &&
					isMaterialReady &&
					hasPermission(Permission.RUN_CREATE) && (
						<Button variant="ghost" size="sm" onClick={() => onCreateRun?.(workOrder)}>
							<Play className="mr-2 h-4 w-4" />
							创建批次
						</Button>
					)}
			</CardFooter>
		</Card>
	);
}
