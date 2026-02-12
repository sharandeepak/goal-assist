"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MilestoneProgressData } from "@/types";
import { subscribeToActiveMilestonesProgress } from "@/services/milestoneService";
import { Target, Clock, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MilestoneProgress() {
	const [milestones, setMilestones] = useState<MilestoneProgressData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);

		const unsubscribe = subscribeToActiveMilestonesProgress(
			(fetchedMilestones) => {
				setMilestones(fetchedMilestones);
				setLoading(false);
			},
			(err) => {
				console.error(err);
				setError("Failed to load milestone progress.");
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	if (loading) {
		return (
			<div className="space-y-6">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="p-4 rounded-xl bg-muted/30 space-y-3 animate-fade-up"
						style={{ animationDelay: `${i * 100}ms` }}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-xl" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
							<Skeleton className="h-8 w-16 rounded-lg" />
						</div>
						<Skeleton className="h-2 w-full rounded-full" />
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive">
				<AlertTriangle className="h-5 w-5" />
				<p className="text-sm">{error}</p>
			</div>
		);
	}

	if (milestones.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="p-4 rounded-2xl bg-muted/50 mb-4">
					<Target className="h-8 w-8 text-muted-foreground" />
				</div>
				<p className="text-muted-foreground font-medium mb-1">No active milestones</p>
				<p className="text-sm text-muted-foreground/70">Create your first milestone to track progress</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{milestones.map((milestone, index) => {
				const urgencyConfig = {
					high: {
						icon: AlertTriangle,
						color: "text-red-500",
						bg: "bg-red-500/10",
						border: "border-red-500/20",
					},
					medium: {
						icon: Clock,
						color: "text-yellow-500",
						bg: "bg-yellow-500/10",
						border: "border-yellow-500/20",
					},
					low: {
						icon: CheckCircle2,
						color: "text-green-500",
						bg: "bg-green-500/10",
						border: "border-green-500/20",
					},
				};

				const config = urgencyConfig[milestone.urgency as keyof typeof urgencyConfig] || urgencyConfig.low;
				const UrgencyIcon = config.icon;

				return (
					<div
						key={milestone.id}
						className={cn(
							"p-4 rounded-xl border transition-all duration-300",
							"bg-card hover:bg-muted/30",
							"animate-fade-up"
						)}
						style={{ animationDelay: `${index * 75}ms` }}
					>
						<div className="flex items-start justify-between gap-4 mb-4">
							<div className="flex items-center gap-3 min-w-0">
								<div className={cn("p-2.5 rounded-xl flex-shrink-0", config.bg)}>
									<Target className={cn("h-5 w-5", config.color)} />
								</div>
								<div className="min-w-0">
									<h3 className="font-semibold truncate" title={milestone.title}>
										{milestone.title}
									</h3>
									{milestone.daysLeft !== undefined && (
										<div className="flex items-center gap-1.5 mt-1">
											<Clock className="h-3.5 w-3.5 text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												{milestone.daysLeft === 0
													? "Due today"
													: `${milestone.daysLeft} day${milestone.daysLeft !== 1 ? "s" : ""} left`}
											</span>
										</div>
									)}
								</div>
							</div>

							<div
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold",
									milestone.progress === 100 ? "bg-green-500/10 text-green-600" : "bg-muted"
								)}
							>
								{milestone.progress === 100 ? (
									<CheckCircle2 className="h-4 w-4" />
								) : (
									<TrendingUp className="h-4 w-4" />
								)}
								{milestone.progress}%
							</div>
						</div>

						<Progress
							value={milestone.progress}
							size="sm"
							className="h-2"
							indicatorClassName={cn(
								milestone.progress === 100 && "bg-green-500",
								milestone.progress < 30 && "bg-red-500",
								milestone.progress >= 30 && milestone.progress < 70 && "bg-yellow-500",
								milestone.progress >= 70 && milestone.progress < 100 && "bg-primary"
							)}
						/>
					</div>
				);
			})}
		</div>
	);
}
