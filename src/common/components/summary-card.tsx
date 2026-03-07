"use client";

import { Card, CardContent } from "@/common/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faMinus, faArrowTrendUp, faArrowTrendDown } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/common/lib/utils";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface SummaryCardProps {
	title: string;
	value: string | number;
	description: string;
	change?: number | null;
	icon?: IconDefinition;
	trend?: "up" | "down" | "neutral";
	accentColor?: "primary" | "accent" | "destructive" | "success";
	className?: string;
	delay?: number;
}

export default function SummaryCard({
	title,
	value,
	description,
	change,
	icon: Icon,
	trend,
	accentColor = "primary",
	className,
	delay = 0,
}: SummaryCardProps) {
	const renderChange = () => {
		if (change === null || change === undefined) {
			return null;
		}

		const isPositive = change > 0;
		const isNegative = change < 0;

		return (
			<div
				className={cn(
					"flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
					isPositive && "bg-green-500/10 text-green-600 dark:text-green-400",
					isNegative && "bg-red-500/10 text-red-600 dark:text-red-400",
					!isPositive && !isNegative && "bg-muted text-muted-foreground"
				)}
			>
				{isPositive ? (
					<FontAwesomeIcon icon={faArrowTrendUp} className="h-3 w-3" />
				) : isNegative ? (
					<FontAwesomeIcon icon={faArrowTrendDown} className="h-3 w-3" />
				) : (
					<FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
				)}
				<span>{isPositive ? "+" : ""}{change.toFixed(1)}</span>
			</div>
		);
	};

	const accentStyles = {
		primary: "from-primary/20 to-transparent border-primary/20",
		accent: "from-accent/30 to-transparent border-accent/30",
		destructive: "from-destructive/20 to-transparent border-destructive/20",
		success: "from-green-500/20 to-transparent border-green-500/20",
	};

	return (
		<Card
			variant="elevated"
			hover="lift"
			className={cn(
				"relative overflow-hidden group",
				"animate-fade-up",
				className
			)}
			style={{ animationDelay: `${delay}ms` }}
		>
			{/* Gradient accent */}
			<div
				className={cn(
					"absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
					accentStyles[accentColor]
				)}
			/>

			<CardContent className="p-6 relative">
				<div className="flex items-start justify-between mb-4">
					{/* Title and Icon */}
					<div className="flex items-center gap-3">
						{Icon && (
							<div
								className={cn(
									"p-2.5 rounded-xl",
									"bg-primary/10 text-primary",
									"group-hover:bg-primary group-hover:text-primary-foreground",
									"transition-colors duration-300"
								)}
							>
								<FontAwesomeIcon icon={Icon} className="h-5 w-5" />
							</div>
						)}
						<span className="stat-label">{title}</span>
					</div>

					{/* Change indicator */}
					{renderChange()}
				</div>

				{/* Value - the hero */}
				<div className="mb-2">
					<span className="stat-value text-foreground">{value}</span>
				</div>

				{/* Description */}
				<p className="text-sm text-muted-foreground font-body">
					{description}
				</p>

				{/* Decorative element */}
				<div
					className={cn(
						"absolute -bottom-4 -right-4 w-24 h-24 rounded-full",
						"bg-primary/5 blur-2xl",
						"group-hover:bg-primary/10 transition-colors duration-500"
					)}
				/>
			</CardContent>
		</Card>
	);
}

// Compact variant for dense layouts
export function SummaryCardCompact({
	title,
	value,
	description,
	change,
	className,
}: Omit<SummaryCardProps, "icon" | "trend" | "accentColor">) {
	const renderChange = () => {
		if (change === null || change === undefined) return null;

		const isPositive = change > 0;
		const isNegative = change < 0;

		return (
			<span
				className={cn(
					"text-xs font-medium",
					isPositive && "text-green-500",
					isNegative && "text-red-500",
					!isPositive && !isNegative && "text-muted-foreground"
				)}
			>
				{isPositive ? (
					<FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 inline" />
				) : isNegative ? (
					<FontAwesomeIcon icon={faArrowDown} className="h-3 w-3 inline" />
				) : null}
				{Math.abs(change).toFixed(1)}
			</span>
		);
	};

	return (
		<Card variant="flat" className={cn("p-4", className)}>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
						{title}
					</p>
					<p className="text-2xl font-display font-bold tracking-tight">
						{value}
					</p>
				</div>
				<div className="text-right">
					{renderChange()}
					<p className="text-xs text-muted-foreground mt-1">{description}</p>
				</div>
			</div>
		</Card>
	);
}

// Bento-style card for grid layouts
export function BentoStatCard({
	title,
	value,
	description,
	icon: Icon,
	className,
	delay = 0,
}: Omit<SummaryCardProps, "change" | "trend" | "accentColor">) {
	return (
		<Card
			variant="glass"
			hover="scale"
			className={cn(
				"relative overflow-hidden",
				"animate-fade-up",
				className
			)}
			style={{ animationDelay: `${delay}ms` }}
		>
			<CardContent className="p-6">
				<div className="flex flex-col h-full">
					{Icon && (
						<div className="mb-4">
							<div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary">
								<FontAwesomeIcon icon={Icon} className="h-6 w-6" />
							</div>
						</div>
					)}

					<p className="stat-label mb-2">{title}</p>

					<p className="stat-value text-foreground mb-auto">{value}</p>

					<p className="text-sm text-muted-foreground mt-4 font-body">
						{description}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
