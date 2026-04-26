"use client";

import { cn } from "@/common/lib/utils";
import { Skeleton } from "@/common/ui/skeleton";
import { useWorkspaceMembers } from "../hooks/use-workspace-members";
import type { TeamMember } from "../types";

export interface AssigneeBadgeProps {
  workspaceId: string;
  assigneeId: string | null;
  /** Avatar circle size. Defaults to "sm". */
  size?: "sm" | "md";
  /** Whether to render the name next to the avatar. Defaults to true. */
  showName?: boolean;
  className?: string;
}

function getInitials(member: TeamMember): string {
  const first = (member.firstName || "").trim();
  const last = (member.lastName || "").trim();
  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();
  if (initials) return initials;
  const emailInitial = (member.email || "").trim().charAt(0).toUpperCase();
  return emailInitial || "?";
}

function getDisplayName(member: TeamMember): string {
  const first = (member.firstName || "").trim();
  const last = (member.lastName || "").trim();
  const name = `${first} ${last}`.trim();
  return name || member.email;
}

export function AssigneeBadge({
  workspaceId,
  assigneeId,
  size = "sm",
  showName = true,
  className,
}: AssigneeBadgeProps) {
  const { data, isLoading } = useWorkspaceMembers(workspaceId);

  const circleSize = size === "md" ? "h-6 w-6" : "h-5 w-5";
  const textSize = size === "md" ? "text-sm" : "text-xs";
  const initialsSize = size === "md" ? "text-[10px]" : "text-[9px]";

  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          textSize,
          className
        )}
      >
        <Skeleton className={cn("rounded-full", circleSize)} />
        {showName && <Skeleton className="h-3 w-20" />}
      </span>
    );
  }

  // Unassigned state
  if (assigneeId === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground",
          textSize,
          className
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
            circleSize,
            initialsSize
          )}
          aria-hidden="true"
        >
          –
        </span>
        {showName && <span>Unassigned</span>}
      </span>
    );
  }

  const member = (data ?? []).find((m) => m.id === assigneeId);

  // Assignee id present but member missing (deleted user)
  if (!member) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground",
          textSize,
          className
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
            circleSize,
            initialsSize
          )}
          aria-hidden="true"
        >
          ?
        </span>
        {showName && <span>Unknown</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        textSize,
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
          circleSize,
          initialsSize
        )}
        aria-hidden="true"
      >
        {getInitials(member)}
      </span>
      {showName && <span>{getDisplayName(member)}</span>}
    </span>
  );
}
