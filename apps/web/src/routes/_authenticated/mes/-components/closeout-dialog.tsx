import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type CloseoutDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	isSubmitting?: boolean;
	onConfirm: () => Promise<void> | void;
};

export function CloseoutDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "确认关闭",
	isSubmitting,
	onConfirm,
}: CloseoutDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						取消
					</Button>
					<Button onClick={onConfirm} disabled={isSubmitting}>
						{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
