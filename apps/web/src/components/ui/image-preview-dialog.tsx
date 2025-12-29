import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
	images: string[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialIndex?: number;
	title?: string;
}

export function ImagePreviewDialog({
	images,
	open,
	onOpenChange,
	initialIndex = 0,
	title = "图片预览",
}: ImagePreviewDialogProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (!open) return;
		const maxIndex = Math.max(images.length - 1, 0);
		const safeIndex = Math.min(Math.max(initialIndex, 0), maxIndex);
		setCurrentIndex(safeIndex);
	}, [open, initialIndex, images.length]);

	const hasMultiple = images.length > 1;
	const currentImage = images[currentIndex];

	const handlePrev = () => {
		if (images.length === 0) return;
		setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
	};

	const handleNext = () => {
		if (images.length === 0) return;
		setCurrentIndex((prev) => (prev + 1) % images.length);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{currentImage ? (
					<div className="space-y-3">
						<div className="relative flex items-center justify-center rounded-md border bg-muted/40 p-2">
							<img
								src={currentImage}
								alt={`预览 ${currentIndex + 1}`}
								className="max-h-[70vh] w-full object-contain"
							/>
							{hasMultiple && (
								<>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute left-2 top-1/2 -translate-y-1/2"
										onClick={handlePrev}
									>
										<ChevronLeft className="h-5 w-5" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-2 top-1/2 -translate-y-1/2"
										onClick={handleNext}
									>
										<ChevronRight className="h-5 w-5" />
									</Button>
								</>
							)}
						</div>
						<div className="text-center text-xs text-muted-foreground">
							{currentIndex + 1}/{images.length}
						</div>
					</div>
				) : (
					<div className="text-sm text-muted-foreground">暂无图片</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
