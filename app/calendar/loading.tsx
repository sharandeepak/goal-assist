import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CalendarLoading() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div>
				<Skeleton className="h-9 w-48 mb-2" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Calendar and details skeleton */}
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-4 w-48 mt-1" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-80 w-full rounded-md" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64 mt-1" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-5 w-1/4" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-5 w-1/4 mt-4" />
						<Skeleton className="h-8 w-full" />
					</CardContent>
				</Card>
			</div>

			{/* Upcoming deadlines skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64 mt-1" />
				</CardHeader>
				<CardContent className="space-y-4">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="flex items-center gap-4 p-3">
							<Skeleton className="h-16 w-16 rounded-md" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-5 w-1/4" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
