import { useEffect, useRef } from "react";

/**
 * 动态 Favicon Hook - 优化版
 * 1. 监听系统级暗色模式 (prefers-color-scheme)
 * 2. 两阶段动效：快速移动 -> 慢速旋转变形
 * 3. 空间优化：预留 Padding 防止放大偏移被遮挡
 */
export function useDynamicFavicon() {
	const frameRef = useRef<number>(0);
	const startTimeRef = useRef<number>(0);

	useEffect(() => {
		// 1. 监听系统主题 (不依赖 App 内主题)
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		let isDark = mediaQuery.matches;

		const handleThemeChange = (e: MediaQueryListEvent) => {
			isDark = e.matches;
		};
		mediaQuery.addEventListener("change", handleThemeChange);

		// 2. 初始化 Canvas
		const canvas = document.createElement("canvas");
		canvas.width = 32;
		canvas.height = 32;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const faviconLinks = Array.from(
			document.querySelectorAll("link[rel*='icon']"),
		) as HTMLLinkElement[];
		if (faviconLinks.length === 0) {
			const link = document.createElement("link");
			link.rel = "icon";
			document.head.appendChild(link);
			faviconLinks.push(link);
		}

		// 3. 动画配置
		const DURATION_MOVE = 400; // 快速移动耗时 (ms)
		const DURATION_STAY = 1200; // 停留旋转耗时 (ms)
		const TOTAL_STAGE = DURATION_MOVE + DURATION_STAY;

		const config = {
			size: 32,
			rectSize: 10, // 基础尺寸
			baseRadius: 2,
		};

		const drawRoundedRect = (
			c: CanvasRenderingContext2D,
			x: number,
			y: number,
			w: number,
			h: number,
			r: number,
		) => {
			c.beginPath();
			c.moveTo(x + r, y);
			c.lineTo(x + w - r, y);
			c.quadraticCurveTo(x + w, y, x + w, y + r);
			c.lineTo(x + w, y + h - r);
			c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
			c.lineTo(x + r, y + h);
			c.quadraticCurveTo(x, y + h, x, y + h - r);
			c.lineTo(x, y + r);
			c.quadraticCurveTo(x, y, x + r, y);
			c.closePath();
		};

		const animate = (time: number) => {
			if (!startTimeRef.current) startTimeRef.current = time;
			const elapsed = time - startTimeRef.current;

			// 计算当前属于哪个大循环 (0, 1, 2, 3)
			const stageIndex = Math.floor(elapsed / TOTAL_STAGE) % 4;
			const stageElapsed = elapsed % TOTAL_STAGE;

			// 动态颜色：实时根据系统主题变化
			const fgColor = isDark ? "#ffffff" : "#0f172a";
			const baseColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)";

			ctx.clearRect(0, 0, 32, 32);

			const c1 = 10; // 锚点位置 (内收)
			const c2 = 22;
			const positions = [
				{ x: c1, y: c1 }, // 0: 左上
				{ x: c2, y: c1 }, // 1: 右上
				{ x: c2, y: c2 }, // 2: 右下
				{ x: c1, y: c2 }, // 3: 左下
			];

			// 1. 绘制四个底座
			ctx.fillStyle = baseColor;
			for (const pos of positions) {
				drawRoundedRect(ctx, pos.x - 5, pos.y - 5, 10, 10, 2);
				ctx.fill();
			}

			let curX = 0;
			let curY = 0;
			let currentRotation = 0;
			let currentScale = 1.0;

			if (stageElapsed < DURATION_MOVE) {
				// 第一阶段：快速移动
				const t = stageElapsed / DURATION_MOVE;
				const easedT = t * t * (3 - 2 * t);

				const startPos = positions[stageIndex];
				const endPos = positions[(stageIndex + 1) % 4];

				curX = startPos.x + (endPos.x - startPos.x) * easedT;
				curY = startPos.y + (endPos.y - startPos.y) * easedT;
				currentRotation = 0;
				currentScale = 1.0;
			} else {
				// 第二阶段：原地旋转 + 放大 + 向外偏移
				const t = (stageElapsed - DURATION_MOVE) / DURATION_STAY;
				const morphFactor = Math.sin(t * Math.PI); // 0 -> 1 -> 0

				// 慢速旋转 90 度
				currentRotation = t * (Math.PI / 2);

				// 放大 1.2 倍
				currentScale = 1.0 + 0.2 * morphFactor;

				const pos = positions[(stageIndex + 1) % 4];

				// 向外偏移逻辑
				const dx = pos.x - 16;
				const dy = pos.y - 16;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const offsetX = (dx / dist) * (2 * morphFactor);
				const offsetY = (dy / dist) * (2 * morphFactor);

				curX = pos.x + offsetX;
				curY = pos.y + offsetY;
			}

			// 2. 绘制活跃块
			ctx.save();
			ctx.translate(curX, curY);
			ctx.rotate(currentRotation);
			ctx.scale(currentScale, currentScale);
			ctx.translate(-curX, -curY);
			ctx.fillStyle = fgColor;
			drawRoundedRect(ctx, curX - 5, curY - 5, 10, 10, config.baseRadius);
			ctx.fill();
			ctx.restore();

			// 3. 更新 Favicon
			const dataUrl = canvas.toDataURL("image/png");
			for (const link of faviconLinks) {
				link.href = dataUrl;
			}

			frameRef.current = requestAnimationFrame(animate);
		};

		frameRef.current = requestAnimationFrame(animate);

		return () => {
			mediaQuery.removeEventListener("change", handleThemeChange);
			if (frameRef.current) cancelAnimationFrame(frameRef.current);
		};
	}, []);
}
