"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Navigation progress indicator that shows at the top of the page during route transitions.
 * This provides visual feedback that navigation is happening, preventing users from thinking
 * the app is stuck.
 */
export default function NavigationProgress() {
	const pathname = usePathname();
	const [isNavigating, setIsNavigating] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		// Start progress animation when pathname changes
		setIsNavigating(true);
		setProgress(0);

		// Simulate progress (since Next.js doesn't provide actual progress)
		const timer1 = setTimeout(() => setProgress(30), 50);
		const timer2 = setTimeout(() => setProgress(60), 150);
		const timer3 = setTimeout(() => setProgress(80), 300);

		// Complete progress after a short delay
		const completeTimer = setTimeout(() => {
			setProgress(100);
			setTimeout(() => setIsNavigating(false), 200);
		}, 500);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
			clearTimeout(completeTimer);
		};
	}, [pathname]);

	return (
		<AnimatePresence>
			{isNavigating && (
				<motion.div
					className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"
					initial={{ scaleX: 0, transformOrigin: "left" }}
					animate={{ scaleX: progress / 100 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
					style={{
						boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
					}}
				/>
			)}
		</AnimatePresence>
	);
}
