import { Skeleton } from "@/common/ui/skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";

export default function TeamLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faUsers} className="h-6 w-6 text-muted-foreground" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Search and tabs skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
