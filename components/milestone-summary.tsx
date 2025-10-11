"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMilestoneSummary } from "@/types";

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
				<CardContent className="space-y-4">
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
					<ul className="space-y-2">
						{initialData.map((milestone) => (
							<li key={milestone.id} className="text-sm">
								{milestone.title}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">No active milestones.</p>
				)}
			</CardContent>
		</Card>
	);
}
