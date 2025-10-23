import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function MilestonesLoading() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<Skeleton className="h-9 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-36" />
			</div>

			{/* Tabs skeleton */}
			<div className="space-y-4">
				<div className="flex gap-2">
					<Skeleton className="h-10 w-20" />
					<Skeleton className="h-10 w-24" />
				</div>

				{/* Milestone cards skeleton */}
				<div className="space-y-4">
					{[...Array(2)].map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<Skeleton className="h-4 w-full mt-1" />
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-4">
									<Skeleton className="h-2 w-full" />
									<Skeleton className="h-4 w-8" />
								</div>
								<Skeleton className="h-5 w-1/3 mt-2" />
								<Skeleton className="h-4 w-1/2 mt-2" />
							</CardContent>
							<CardFooter className="flex justify-between">
								<Skeleton className="h-4 w-1/4" />
								<Skeleton className="h-4 w-1/4" />
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
