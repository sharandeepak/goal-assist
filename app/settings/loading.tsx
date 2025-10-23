import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
	return (
		<div className="container mx-auto p-4">
			<Skeleton className="h-9 w-32 mb-6" />

			{/* Theme Settings skeleton */}
			<section className="mb-8">
				<Skeleton className="h-7 w-32 mb-3" />
				<div className="flex items-center justify-between p-4 border rounded-lg">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-10 w-32" />
				</div>
			</section>

			{/* Reminder Settings skeleton */}
			<section className="mb-8">
				<Skeleton className="h-7 w-28 mb-3" />
				<div className="p-4 border rounded-lg space-y-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-48" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
			</section>

			{/* Account Deletion skeleton */}
			<section>
				<Skeleton className="h-7 w-24 mb-3" />
				<div className="p-4 border rounded-lg">
					<Skeleton className="h-6 w-40 mb-2" />
					<Skeleton className="h-4 w-full mb-1" />
					<Skeleton className="h-4 w-3/4 mb-3" />
					<Skeleton className="h-10 w-40" />
				</div>
			</section>
		</div>
	);
}
