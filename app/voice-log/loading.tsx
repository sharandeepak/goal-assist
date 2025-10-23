import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function VoiceLogLoading() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div>
				<Skeleton className="h-9 w-32 mb-2" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Recording card skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-64 mt-1" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex justify-center">
						<Skeleton className="h-16 w-16 rounded-full" />
					</div>
				</CardContent>
			</Card>

			{/* Tabs skeleton */}
			<div className="space-y-4">
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28" />
					<Skeleton className="h-10 w-24" />
				</div>

				{/* Logs skeleton */}
				<div className="space-y-4">
					{[...Array(2)].map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-5 w-48" />
								<Skeleton className="h-4 w-32 mt-1" />
							</CardHeader>
							<CardContent>
								<div className="space-y-1">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-4 w-5/6" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
