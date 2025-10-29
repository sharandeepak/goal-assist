import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TimesheetLoading() {
	return (
		<div className="container mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-64 mt-2" />
				</div>
				<div className="text-right">
					<Skeleton className="h-5 w-24 mb-2" />
					<Skeleton className="h-8 w-32" />
				</div>
			</div>

			<div className="flex items-center justify-between py-4">
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-6 w-[200px]" />
					<Skeleton className="h-10 w-10" />
				</div>
				<Skeleton className="h-10 w-[150px]" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
				{Array.from({ length: 7 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-4 w-16 mt-1" />
								</div>
								<div className="flex items-center gap-1">
									<Skeleton className="h-7 w-7 rounded" />
									<Skeleton className="h-7 w-7 rounded" />
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-20 w-full rounded-lg" />
							<Skeleton className="h-20 w-full rounded-lg" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
