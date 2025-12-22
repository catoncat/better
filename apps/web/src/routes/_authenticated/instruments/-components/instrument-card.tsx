import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Eye, MoreHorizontal, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Instrument } from "@/hooks/use-instruments";

interface InstrumentCardProps {
	instrument: Instrument;
	onCreateCalibration?: (instrumentId: string) => void;
}

export function InstrumentCard({ instrument, onCreateCalibration }: InstrumentCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{instrument.instrumentNo}</CardTitle>
				<Badge variant={instrument.calibrationType === "internal" ? "secondary" : "default"}>
					{instrument.calibrationType === "internal" ? "内校" : "外校"}
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{instrument.description}</div>
				<p className="text-xs text-muted-foreground">{instrument.model}</p>
				<div className="mt-4 space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">部门:</span>
						<span>{instrument.department || "-"}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">责任人:</span>
						<span>{instrument.owner?.name || "-"}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">下次计量:</span>
						<span>
							{instrument.nextCalibrationDate
								? format(new Date(instrument.nextCalibrationDate), "yyyy-MM-dd")
								: "-"}
						</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end space-x-2">
				<Button variant="ghost" size="sm" asChild>
					<Link
						to="/calibrations"
						search={{
							instrumentId: instrument.id,
						}}
					>
						<Eye className="mr-2 h-4 w-4" />
						记录
					</Link>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onCreateCalibration?.(instrument.id)}
					disabled={!onCreateCalibration}
				>
					<Plus className="mr-2 h-4 w-4" />
					新增记录
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => onCreateCalibration?.(instrument.id)}
							disabled={!onCreateCalibration}
						>
							新增记录
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardFooter>
		</Card>
	);
}
