"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/ui/card";
import { Skeleton } from "@/common/ui/skeleton";
import { PageMilestoneSummary } from "@/common/types";
import styles from "../styles/MilestoneSummary.module.css";

interface MilestoneSummaryProps {
	initialData?: PageMilestoneSummary[];
	isLoading: boolean;
}

export default function MilestoneSummary({ initialData, isLoading }: MilestoneSummaryProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Active Milestones</CardTitle>
					<CardDescription>Your most important upcoming goals.</CardDescription>
				</CardHeader>
				<CardContent className={styles.contentSkeleton}>
					<Skeleton className="h-8 w-3/4" />
					<Skeleton className="h-8 w-1/2" />
					<Skeleton className="h-8 w-5/6" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Active Milestones</CardTitle>
				<CardDescription>Your most important upcoming goals.</CardDescription>
			</CardHeader>
			<CardContent>
				{initialData && initialData.length > 0 ? (
					<ul className={styles.list}>
						{initialData.map((milestone) => (
							<li key={milestone.id} className={styles.listItem}>
								{milestone.title}
							</li>
						))}
					</ul>
				) : (
					<p className={styles.emptyText}>No active milestones.</p>
				)}
			</CardContent>
		</Card>
	);
}
