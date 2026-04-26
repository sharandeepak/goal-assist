import { useQuery } from "@tanstack/react-query";
import { getTeamMembers } from "@/features/team/services/teamService";
import type { TeamMember } from "@/features/team/types";

/**
 * Hook returning the active workspace members.
 *
 * Shared cache key (`["workspace-members", workspaceId]`) lets multiple
 * components (assignee picker, badge, etc.) consume the same data without
 * triggering duplicate fetches.
 */
export function useWorkspaceMembers(workspaceId: string | null | undefined) {
  return useQuery<TeamMember[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => getTeamMembers(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
