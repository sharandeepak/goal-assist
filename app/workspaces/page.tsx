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
import { useAuth } from "@/common/hooks/use-auth";
import {
  getAllWorkspacesForAuthUser,
  getWorkspaceUsers,
  getWorkspaceCount,
} from "@/features/workspace/services/workspaceService";
import CreateWorkspaceDialog from "@/features/workspace/components/create-workspace-dialog";
import type { SupabaseWorkspace, SupabaseUser } from "@/common/types";
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

  const [workspaces, setWorkspaces] = useState<SupabaseWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<SupabaseWorkspace | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<SupabaseUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  return (
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
        <TooltipProvider>
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
        </TooltipProvider>
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
            workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setSelectedWorkspace(ws);
                  setSearchQuery("");
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                  selectedWorkspace?.id === ws.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                    selectedWorkspace?.id === ws.id
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
              </button>
            ))
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

              {/* Search bar */}
              <div className="relative">
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
    </div>
  );
}
