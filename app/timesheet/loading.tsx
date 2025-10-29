import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TimesheetLoading() {
	return (
		<Card className="flex flex-col" style={{ height: "600px" }}>
			<CardHeader className="pb-3 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div className="flex-1 min-w-0">
						<Skeleton className="h-4 w-16 mb-1" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-3 w-24 mt-2" />
					</div>
					<div className="flex items-center gap-1">
						<Skeleton className="h-7 w-7 rounded" />
						<Skeleton className="h-7 w-7 rounded" />
						<Skeleton className="h-7 w-7 rounded" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-y-auto space-y-2 min-h-0">
				<Skeleton className="h-20 w-full rounded-lg" />
				<Skeleton className="h-20 w-full rounded-lg" />
				<Skeleton className="h-20 w-full rounded-lg" />
			</CardContent>
		</Card>
	);
}
