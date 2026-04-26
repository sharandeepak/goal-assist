"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/ui/card";
import { Skeleton } from "@/common/ui/skeleton";
import { PageMilestoneSummary } from "@/common/types";
import { useRequiredAuth } from "@/common/hooks/use-auth";
import { AssigneeBadge } from "@/features/team/components/assignee-badge";
import { styles } from "../styles/MilestoneSummary.styles";

interface MilestoneSummaryProps {
	initialData?: PageMilestoneSummary[];
	isLoading: boolean;
}

export default function MilestoneSummary({ initialData, isLoading }: MilestoneSummaryProps) {
	const { workspaceId } = useRequiredAuth();
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
								<span className="flex items-center justify-between gap-2">
									<span className="truncate">{milestone.title}</span>
									<AssigneeBadge
										workspaceId={workspaceId}
										assigneeId={milestone.assigneeId}
										size="sm"
										showName={false}
									/>
								</span>
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
