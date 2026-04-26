"use client";

import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faPlus,
  faMagnifyingGlass,
  faUsers,
  faCalendarDays,
  faShieldHalved,
  faUserTie,
  faUser,
  faRightFromBracket,
  faEllipsisVertical,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Badge } from "@/common/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/common/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/ui/dropdown-menu";
import { useAuth } from "@/common/hooks/use-auth";
import { useToast } from "@/common/hooks/use-toast";
import {
  getAllWorkspacesForAuthUser,
  getWorkspaceUsers,
  getWorkspaceCount,
  leaveWorkspace,
} from "@/features/workspace/services/workspaceService";
import CreateWorkspaceDialog from "@/features/workspace/components/create-workspace-dialog";
import { InviteMemberDialog } from "@/features/team/components/invite-member-dialog";
import type { SupabaseWorkspace, SupabaseUser, UserRole } from "@/common/types";
import { AppError } from "@/common/errors/AppError";
import { format } from "date-fns";

const MAX_WORKSPACES = 5;

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: typeof faShieldHalved; className: string }
> = {
  admin: {
    label: "Admin",
    icon: faShieldHalved,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  manager: {
    label: "Manager",
    icon: faUserTie,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  member: {
    label: "Member",
    icon: faUser,
    className: "bg-muted text-muted-foreground",
  },
};

export default function WorkspacesPage() {
  const { authUser, workspace: currentWorkspace, switchWorkspace } = useAuth();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState<SupabaseWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<SupabaseWorkspace | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<SupabaseUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<SupabaseWorkspace | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const fetchWorkspaces = async () => {
    if (!authUser) return;
    setLoadingWorkspaces(true);
    try {
      const [data, count] = await Promise.all([
        getAllWorkspacesForAuthUser(authUser.id),
        getWorkspaceCount(),
      ]);
      setWorkspaces(data);
      setWorkspaceCount(count);

      if (data.length > 0 && !selectedWorkspace) {
        const defaultWs =
          currentWorkspace
            ? data.find((w) => w.id === currentWorkspace.id) ?? data[0]
            : data[0];
        setSelectedWorkspace(defaultWs);
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setWorkspaceUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const users = await getWorkspaceUsers(selectedWorkspace.id);
        setWorkspaceUsers(users);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [selectedWorkspace]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return workspaceUsers;
    const q = searchQuery.toLowerCase();
    return workspaceUsers.filter(
      (u) =>
        u.first_name.toLowerCase().includes(q) ||
        (u.last_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [workspaceUsers, searchQuery]);

  const isAtLimit = workspaceCount >= MAX_WORKSPACES;

  const currentUserInSelectedWorkspace = useMemo(
    () => workspaceUsers.find((u) => u.auth_id === authUser?.id) ?? null,
    [workspaceUsers, authUser]
  );

  const canInviteInSelectedWorkspace =
    currentUserInSelectedWorkspace?.role === "admin" ||
    currentUserInSelectedWorkspace?.role === "manager";

  const handleConfirmLeave = async () => {
    if (!leaveTarget || !authUser) return;
    const target = leaveTarget;
    setIsLeaving(true);
    try {
      await leaveWorkspace(target.id);

      const remaining = workspaces.filter((w) => w.id !== target.id);
      setWorkspaces(remaining);
      setWorkspaceCount((c) => Math.max(0, c - 1));

      const wasActive = target.id === currentWorkspace?.id;
      const wasSelected = target.id === selectedWorkspace?.id;

      if (wasSelected) {
        setSelectedWorkspace(remaining[0] ?? null);
      }

      toast({
        title: "Left workspace",
        description: `You are no longer a member of "${target.name}".`,
      });

      setLeaveTarget(null);

      if (wasActive) {
        if (remaining.length > 0) {
          await switchWorkspace(remaining[0].id);
          window.location.href = "/";
        } else {
          window.location.href = "/onboarding";
        }
      }
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.errorMessage
          : "Failed to leave workspace.";
      toast({
        title: "Couldn't leave workspace",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <TooltipProvider>
    <div className="flex-1 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Workspaces
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your workspaces and team members.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                onClick={() => setIsCreateOpen(true)}
                disabled={isAtLimit}
                className="rounded-full px-5"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2 text-sm" />
                Create Workspace
              </Button>
            </div>
          </TooltipTrigger>
          {isAtLimit && (
            <TooltipContent>
              <p>You have reached the maximum of {MAX_WORKSPACES} workspaces.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </header>

      {/* Usage indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {workspaceCount} / {MAX_WORKSPACES} workspaces used
        </span>
        <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(workspaceCount / MAX_WORKSPACES) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content — 1:3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left panel — Workspace list */}
        <div className="lg:col-span-1 space-y-2">
          {loadingWorkspaces ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-muted animate-pulse"
              />
            ))
          ) : (
            workspaces.map((ws) => {
              const isOwner = ws.creator_id === authUser?.id;
              const isSelected = selectedWorkspace?.id === ws.id;
              return (
                <div
                  key={ws.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedWorkspace(ws);
                    setSearchQuery("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedWorkspace(ws);
                      setSearchQuery("");
                    }
                  }}
                  className={`group w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <FontAwesomeIcon icon={faBuilding} className="text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {ws.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ws.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {ws.id === currentWorkspace?.id && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                    >
                      Active
                    </Badge>
                  )}
                  {!isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Workspace actions for ${ws.name}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <FontAwesomeIcon
                            icon={faEllipsisVertical}
                            className="text-sm"
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setLeaveTarget(ws);
                          }}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <FontAwesomeIcon
                            icon={faRightFromBracket}
                            className="mr-2 text-xs"
                          />
                          Leave workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right panel — Workspace details + user list */}
        <div className="lg:col-span-3">
          {selectedWorkspace ? (
            <div className="space-y-5">
              {/* Workspace info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border/50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FontAwesomeIcon icon={faBuilding} className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {selectedWorkspace.name}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
                        Created {format(new Date(selectedWorkspace.created_at), "MMMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faUsers} className="text-xs" />
                        {workspaceUsers.length} member{workspaceUsers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedWorkspace.id !== currentWorkspace?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={async () => {
                      await switchWorkspace(selectedWorkspace.id);
                      window.location.href = "/";
                    }}
                  >
                    Switch to this workspace
                  </Button>
                )}
              </div>

              {/* Search bar + Invite button */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground/60">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
                  </div>
                  <Input
                    placeholder="Search members by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
                {canInviteInSelectedWorkspace && (
                  <Button
                    onClick={() => setIsInviteOpen(true)}
                    className="rounded-full px-5 shrink-0"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="mr-2 text-sm" />
                    Invite Member
                  </Button>
                )}
              </div>

              {/* User list */}
              {loadingUsers ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery
                    ? "No members match your search."
                    : "No members in this workspace yet."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const roleConfig = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.member;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 overflow-hidden">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`}
                            alt={u.first_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.first_name}
                            {u.last_name ? ` ${u.last_name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2.5 py-0.5 shrink-0 ${roleConfig.className}`}
                        >
                          <FontAwesomeIcon
                            icon={roleConfig.icon}
                            className="mr-1.5 text-[10px]"
                          />
                          {roleConfig.label}
                        </Badge>
                        <Badge
                          variant={u.status === "active" ? "default" : "outline"}
                          className="text-xs px-2 py-0.5 shrink-0"
                        >
                          {u.status === "active" ? "Active" : "Invited"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Select a workspace to view its details.
            </div>
          )}
        </div>
      </div>

      <CreateWorkspaceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={fetchWorkspaces}
        disabled={isAtLimit}
      />

      {selectedWorkspace && currentUserInSelectedWorkspace && (
        <InviteMemberDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          workspaceId={selectedWorkspace.id}
          inviterId={currentUserInSelectedWorkspace.id}
          inviterRole={currentUserInSelectedWorkspace.role as UserRole}
          onInviteCreated={async () => {
            const users = await getWorkspaceUsers(selectedWorkspace.id);
            setWorkspaceUsers(users);
          }}
        />
      )}

      <AlertDialog
        open={leaveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isLeaving) setLeaveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Leave &ldquo;{leaveTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this workspace and all of its data. An
              admin will need to invite you again to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmLeave();
              }}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? "Leaving..." : "Leave workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
