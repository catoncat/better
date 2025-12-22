import { Play, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoPreviewProps {
	url: string;
	onRemove?: () => void;
	readOnly?: boolean;
}

export function VideoPreview({ url, onRemove, readOnly = false }: VideoPreviewProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<div className="relative group inline-block">
				<button
					type="button"
					className="relative h-20 w-32 bg-black/10 rounded-md overflow-hidden cursor-pointer border border-border"
					onClick={() => setIsOpen(true)}
					aria-label="预览视频"
				>
					<video
						src={`${url}#t=1.0`}
						className="h-full w-full object-cover"
						preload="metadata"
						muted
						playsInline
					>
						<track kind="captions" src="/empty.vtt" srcLang="zh" label="captions" default />
					</video>
					<div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
						<Play
							className="h-8 w-8 text-white opacity-80 group-hover:opacity-100"
							fill="currentColor"
						/>
					</div>
				</button>

				{!readOnly && onRemove && (
					<Button
						type="button"
						variant="destructive"
						size="icon"
						className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => {
							e.stopPropagation();
							onRemove();
						}}
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black border-none">
					<div className="relative w-full aspect-video">
						<video src={url} className="w-full h-full" controls autoPlay>
							<track kind="captions" src="/empty.vtt" srcLang="zh" label="captions" default />
						</video>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
