import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			{/* Header skeleton */}
			<div className="flex items-center justify-between space-y-2">
				<Skeleton className="h-9 w-48" />
			</div>

			{/* Summary cards skeleton */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</div>

			{/* Main content skeleton */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-48 mt-2" />
					</CardHeader>
					<CardContent className="space-y-2">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="flex items-center gap-2 py-1">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-64 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
