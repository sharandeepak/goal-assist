import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PlannerLoading() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<Skeleton className="h-9 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Tabs skeleton */}
			<div className="space-y-4">
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>

				{/* Task list skeleton */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-48 mt-1" />
					</CardHeader>
					<CardContent className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="flex items-center justify-between space-x-2 p-3 rounded-lg border">
								<div className="flex items-center space-x-3 flex-1">
									<Skeleton className="h-5 w-5 rounded" />
									<Skeleton className="h-5 w-3/4" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton className="h-6 w-16 rounded-md" />
									<Skeleton className="h-6 w-24 rounded-md" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
