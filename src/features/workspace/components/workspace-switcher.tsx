"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faCheck,
  faBuilding,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/ui/dropdown-menu";
import { Button } from "@/common/ui/button";
import { useAuth } from "@/common/hooks/use-auth";
import { getAllWorkspacesForAuthUser } from "@/features/workspace/services/workspaceService";
import type { SupabaseWorkspace } from "@/common/types";

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const { authUser, workspace, switchWorkspace } = useAuth();
  const [workspaces, setWorkspaces] = useState<SupabaseWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;

    const fetchWorkspaces = async () => {
      try {
        const data = await getAllWorkspacesForAuthUser(authUser.id);
        setWorkspaces(data);
      } catch (err) {
        console.error("Failed to fetch workspaces:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [authUser]);

  const handleSwitch = async (id: string) => {
    if (id === workspace?.id) return;
    await switchWorkspace(id);
    router.refresh();
  };

  if (loading || !workspace) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
        <div className="w-24 h-4 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl border-border/60 px-3 text-sm font-medium hover:bg-muted/50"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faBuilding} className="text-xs" />
          </div>
          <span className="max-w-[140px] truncate">{workspace.name}</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="text-[10px] text-muted-foreground ml-1"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => handleSwitch(ws.id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                ws.id === workspace.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <FontAwesomeIcon icon={faBuilding} className="text-xs" />
            </div>
            <span className="flex-1 truncate text-sm">{ws.name}</span>
            {ws.id === workspace.id && (
              <FontAwesomeIcon
                icon={faCheck}
                className="text-primary text-xs shrink-0"
              />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/workspaces")}
          className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
          <span className="text-sm">View All Workspaces</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
