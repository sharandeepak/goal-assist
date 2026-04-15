"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faList, faSitemap, faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";
import { useRequiredAuth } from "@/common/hooks/use-auth";
import { MemberListView } from "@/features/team/components/member-list-view";
import { MemberTreeView } from "@/features/team/components/member-tree-view";
import { InviteMemberDialog } from "@/features/team/components/invite-member-dialog";
import { PendingInvitesSection } from "@/features/team/components/pending-invites-section";
import { getTeamMembers, searchTeamMembers, getUserPermissions } from "@/features/team/services/teamService";
import { getWorkspaceInvites } from "@/features/invite/services/inviteService";
import type { TeamMember, TeamViewMode } from "@/features/team/types";
import type { InviteWithDetails } from "@/features/invite/types";
import type { UserRole } from "@/common/types";
import { useAuth } from "@/common/hooks/use-auth";

export default function TeamPage() {
  const { workspaceId, userId } = useRequiredAuth();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<TeamViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const userRole = (user?.role || "member") as UserRole;
  const permissions = getUserPermissions(userRole);

  // Fetch team members
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [membersData, invitesData] = await Promise.all([
          searchQuery
            ? searchTeamMembers(workspaceId, searchQuery)
            : getTeamMembers(workspaceId),
          getWorkspaceInvites(workspaceId),
        ]);
        setMembers(membersData);
        setPendingInvites(invitesData.filter(i => i.status === "pending"));
      } catch (error) {
        console.error("Failed to fetch team data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, searchQuery]);

  const handleMemberUpdated = () => {
    // Refetch data when a member is updated
    const fetchData = async () => {
      const [membersData, invitesData] = await Promise.all([
        getTeamMembers(workspaceId),
        getWorkspaceInvites(workspaceId),
      ]);
      setMembers(membersData);
      setPendingInvites(invitesData.filter(i => i.status === "pending"));
    };
    fetchData();
  };

  const handleInviteCreated = () => {
    setIsInviteDialogOpen(false);
    handleMemberUpdated();
  };

  const canInvite = permissions.canInviteMember || permissions.canInviteManager || permissions.canInviteAdmin;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faUsers} className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Team</h1>
        </div>
        {canInvite && (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as TeamViewMode)}>
          <TabsList>
            <TabsTrigger value="list">
              <FontAwesomeIcon icon={faList} className="mr-2 h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="tree">
              <FontAwesomeIcon icon={faSitemap} className="mr-2 h-4 w-4" />
              Tree
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {viewMode === "list" ? (
            <MemberListView
              members={members}
              currentUserId={userId}
              userRole={userRole}
              onMemberUpdated={handleMemberUpdated}
            />
          ) : (
            <MemberTreeView
              workspaceId={workspaceId}
              currentUserId={userId}
              userRole={userRole}
              onMemberUpdated={handleMemberUpdated}
            />
          )}

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <PendingInvitesSection
              invites={pendingInvites}
              userRole={userRole}
              currentUserId={userId}
              onInviteUpdated={handleMemberUpdated}
            />
          )}
        </>
      )}

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        workspaceId={workspaceId}
        inviterId={userId}
        inviterRole={userRole}
        onInviteCreated={handleInviteCreated}
      />
    </div>
  );
}
