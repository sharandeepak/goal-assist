import { cn } from "@/common/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "shimmer" | "pulse";
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
	return (
		<div
			className={cn(
				"rounded-lg bg-muted",
				variant === "pulse" && "animate-pulse",
				variant === "shimmer" &&
					"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
				variant === "default" && "animate-pulse-soft",
				className
			)}
			{...props}
		/>
	);
}

// Pre-composed skeletons for common use cases
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("rounded-xl border bg-card p-6 space-y-4", className)} {...props}>
			<div className="flex items-center gap-4">
				<Skeleton className="h-12 w-12 rounded-xl" />
				<div className="space-y-2 flex-1">
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</div>
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

function SkeletonText({
	lines = 3,
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
	return (
		<div className={cn("space-y-2", className)} {...props}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn(
						"h-4",
						i === lines - 1 ? "w-3/4" : "w-full"
					)}
				/>
			))}
		</div>
	);
}

function SkeletonAvatar({
	size = "default",
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	size?: "sm" | "default" | "lg";
}) {
	const sizes = {
		sm: "h-8 w-8",
		default: "h-10 w-10",
		lg: "h-14 w-14",
	};

	return (
		<Skeleton
			className={cn("rounded-full", sizes[size], className)}
			{...props}
		/>
	);
}

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar };
