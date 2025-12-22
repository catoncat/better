import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/instruments/$instrumentId")({
	component: RedirectToCalibrations,
});

function RedirectToCalibrations() {
	const navigate = useNavigate();
	const { instrumentId } = Route.useParams();

	useEffect(() => {
		navigate({
			to: "/calibrations",
			search: (prev) => ({ ...prev, instrumentId }),
			replace: true,
		});
	}, [instrumentId, navigate]);

	return <div className="p-4 text-sm text-muted-foreground">正在跳转到校准记录...</div>;
}
