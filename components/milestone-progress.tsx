"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MilestoneProgressData } from "@/types";
import { subscribeToActiveMilestonesProgress } from "@/services/milestoneService";

// temp comment to commit
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
			<div className="space-y-4" style={{ margin: "0px 20px" }}>
				{[...Array(3)].map((_, i) => (
					<div key={i} className="space-y-2">
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-2/4" />
							<Skeleton className="h-4 w-1/4" />
						</div>
						<div className="flex items-center gap-4">
							<Skeleton className="h-2 w-full" />
							<Skeleton className="h-4 w-8" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ margin: "0px 20px" }} className="text-center text-sm text-red-600 py-4">
				{error}
			</div>
		);
	}

	if (milestones.length === 0) {
		return (
			<div style={{ margin: "0px 20px" }} className="text-center text-sm text-muted-foreground py-4">
				No active milestones found.
			</div>
		);
	}

	return (
		<div className="space-y-6 p-2">
			{milestones.map((milestone) => (
				<div key={milestone.id} className="space-y-3">
					<div className="flex items-center justify-between font-medium">
						<div className="flex items-center gap-3">
							<span className={`h-2.5 w-2.5 rounded-full ${milestone.urgency === "high" ? "bg-red-500" : milestone.urgency === "medium" ? "bg-yellow-500" : "bg-green-500"}`} />
							<span className="truncate" title={milestone.title}>
								{milestone.title}
							</span>
						</div>
						{milestone.daysLeft !== undefined && (
							<span className="text-sm text-muted-foreground">
								{milestone.daysLeft} day{milestone.daysLeft !== 1 ? "s" : ""} left
							</span>
						)}
					</div>
					<div className="flex items-center gap-4">
						<Progress value={milestone.progress} />
						<span className="text-sm font-semibold text-muted-foreground w-12 text-right">{milestone.progress}%</span>
					</div>
				</div>
			))}
		</div>
	);
}
