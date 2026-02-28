"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/common/ui/progress";
import { Skeleton } from "@/common/ui/skeleton";
import { MilestoneProgressData } from "@/common/types";
import { subscribeToActiveMilestonesProgress } from "@/features/milestones/services/milestoneService";
import { Target, Clock, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/common/lib/utils";
import styles from "../styles/MilestoneProgress.module.css";

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
			<div className={styles.loadingList}>
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className={styles.skeletonItem}
						style={{ animationDelay: `${i * 100}ms` }}
					>
						<div className={styles.skeletonRow}>
							<div className={styles.skeletonLeft}>
								<Skeleton className="h-10 w-10 rounded-xl" />
								<div className={styles.skeletonTextGroup}>
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
			<div className={styles.errorRoot}>
				<AlertTriangle className="h-5 w-5" />
				<p className={styles.errorText}>{error}</p>
			</div>
		);
	}

	if (milestones.length === 0) {
		return (
			<div className={styles.emptyRoot}>
				<div className={styles.emptyIconWrapper}>
					<Target className="h-8 w-8 text-muted-foreground" />
				</div>
				<p className={styles.emptyTitle}>No active milestones</p>
				<p className={styles.emptySubtitle}>Create your first milestone to track progress</p>
			</div>
		);
	}

	const urgencyIconWrapper: Record<string, string> = {
		high: styles.iconWrapperHigh,
		medium: styles.iconWrapperMedium,
		low: styles.iconWrapperLow,
	};
	const urgencyIcon: Record<string, string> = {
		high: styles.iconHigh,
		medium: styles.iconMedium,
		low: styles.iconLow,
	};

	return (
		<div className={styles.container}>
			{milestones.map((milestone, index) => {
				const urgency = (milestone.urgency as string) || "low";
				const iconWrapperClass = urgencyIconWrapper[urgency] || styles.iconWrapperLow;
				const iconClass = urgencyIcon[urgency] || styles.iconLow;

				return (
					<div
						key={milestone.id}
						className={styles.card}
						style={{ animationDelay: `${index * 75}ms` }}
					>
						<div className={styles.cardHeader}>
							<div className={styles.cardLeft}>
								<div className={cn(styles.iconWrapper, iconWrapperClass)}>
									<Target className={iconClass} />
								</div>
								<div className="min-w-0">
									<h3 className={styles.title} title={milestone.title}>
										{milestone.title}
									</h3>
									{milestone.daysLeft !== undefined && (
										<div className={styles.daysLeftRow}>
											<Clock className="h-3.5 w-3.5 text-muted-foreground" />
											<span className={styles.daysLeftText}>
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
									styles.badge,
									milestone.progress === 100 ? styles.badgeComplete : styles.badgeIncomplete
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
							className={styles.progressBar}
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
