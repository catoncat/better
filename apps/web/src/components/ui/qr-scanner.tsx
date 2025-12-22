import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

interface QrScannerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onScan: (result: string) => void;
	title?: string;
	description?: string;
}

export function QrScanner({
	open,
	onOpenChange,
	onScan,
	title = "扫描二维码",
	description = "请将设备二维码对准摄像头",
}: QrScannerProps) {
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const instanceId = useId();
	const containerId = useMemo(() => `qr-reader-${instanceId.replace(/:/g, "")}`, [instanceId]);

	// Define stopScanner first to avoid initialization order issues
	const stopScanner = useCallback(async () => {
		const scanner = scannerRef.current;
		if (!scanner) {
			setIsScanning(false);
			return;
		}

		try {
			// Check if scanner is still scanning before stopping
			if (scanner.isScanning) {
				await scanner.stop();
			}
		} catch (err) {
			// Ignore stop errors
			console.warn("Error stopping scanner:", err);
		}

		try {
			// Only clear if the container element still exists in DOM
			// Html5Qrcode.clear() will try to remove DOM nodes, so we need to check first
			const container = containerRef.current;
			if (container?.isConnected) {
				await scanner.clear();
			}
		} catch (_err) {
			// Ignore clear errors (DOM might already be removed by React)
			// This is safe to ignore as React will handle the cleanup
		} finally {
			scannerRef.current = null;
			setIsScanning(false);
		}
	}, []);

	const startScanner = useCallback(async () => {
		if (!containerRef.current || scannerRef.current) return;

		try {
			setError(null);
			const scanner = new Html5Qrcode(containerId, {
				formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
				verbose: false,
			});
			scannerRef.current = scanner;

			await scanner.start(
				{ facingMode: "environment" },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
				},
				(decodedText) => {
					// Successfully scanned
					onScan(decodedText);
					// Stop scanner before closing dialog
					stopScanner().catch(() => {
						// Ignore cleanup errors
					});
					onOpenChange(false);
				},
				() => {
					// Ignore scan errors (no QR code found in frame)
				},
			);

			setIsScanning(true);
		} catch (err) {
			console.error("Failed to start scanner:", err);
			setError(err instanceof Error ? err.message : "无法启动摄像头，请确保已授权摄像头权限");
			setIsScanning(false);
			// Clean up on error
			scannerRef.current = null;
		}
	}, [containerId, onScan, onOpenChange, stopScanner]);

	useEffect(() => {
		if (open) {
			// Small delay to ensure DOM is ready
			const timer = setTimeout(() => {
				startScanner();
			}, 100);
			return () => {
				clearTimeout(timer);
				// Cleanup when dialog closes
				stopScanner();
			};
		} else {
			// Cleanup when dialog is closed
			stopScanner();
		}
	}, [open, startScanner, stopScanner]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopScanner();
		};
	}, [stopScanner]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Camera className="h-5 w-5" />
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
						<div ref={containerRef} id={containerId} className="w-full h-full" />
						{!isScanning && !error && (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="text-center text-muted-foreground">
									<Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
									<p className="text-sm">正在启动摄像头...</p>
								</div>
							</div>
						)}
					</div>

					{error && (
						<div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-start gap-2">
							<CameraOff className="h-5 w-5 shrink-0 mt-0.5" />
							<div>
								<p className="font-medium">摄像头启动失败</p>
								<p className="text-xs mt-1">{error}</p>
							</div>
						</div>
					)}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							<X className="mr-2 h-4 w-4" />
							取消
						</Button>
						{error && (
							<Button onClick={startScanner}>
								<Camera className="mr-2 h-4 w-4" />
								重试
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
