"use client";

import { useState } from "react";
import { Button } from "@/common/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/ui/select";
import { Label } from "@/common/ui/label";
import { useToast } from "@/common/hooks/use-toast";
import { useRequiredAuth } from "@/common/providers/auth-provider";
import type { TeamMember } from "../types";
import type { UserRole } from "@/common/types";
import { getPermissionsForRole } from "../types";
import {
  updateMemberRole,
  updateMemberManager,
  removeMember,
  getPotentialManagers,
} from "../services/teamService";

interface MemberActionsMenuProps {
  member: TeamMember;
  userRole: UserRole;
  workspaceId: string;
  onMemberUpdated: () => void;
}

export function MemberActionsMenu({
  member,
  userRole,
  workspaceId,
  onMemberUpdated,
}: MemberActionsMenuProps) {
  const permissions = getPermissionsForRole(userRole);
  const { user } = useRequiredAuth();
  const { toast } = useToast();

  // Dialog open states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Role dialog state
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  // Manager dialog state
  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    member.managerId ?? "none"
  );
  const [potentialManagers, setPotentialManagers] = useState<TeamMember[]>([]);
  const [isManagerLoading, setIsManagerLoading] = useState(false);
  const [isManagerFetching, setIsManagerFetching] = useState(false);

  // Remove state
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);

  // Don't show menu if user has no permissions
  if (!permissions.canChangeRoles && !permissions.canAssignManager && !permissions.canRemoveMember) {
    return null;
  }

  const handleChangeRole = () => {
    setSelectedRole(member.role);
    setIsRoleDialogOpen(true);
  };

  const handleChangeManager = async () => {
    setSelectedManagerId(member.managerId ?? "none");
    setIsManagerFetching(true);
    setIsManagerDialogOpen(true);
    try {
      const managers = await getPotentialManagers(workspaceId, member.id);
      setPotentialManagers(managers);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load potential managers.",
        variant: "destructive",
      });
      setIsManagerDialogOpen(false);
    } finally {
      setIsManagerFetching(false);
    }
  };

  const handleRemove = () => {
    setIsConfirmDeleteOpen(true);
  };

  const handleSaveRole = async () => {
    setIsRoleLoading(true);
    try {
      await updateMemberRole(userRole, member.id, selectedRole);
      toast({
        title: "Role updated",
        description: `${member.firstName}'s role has been changed to ${selectedRole}.`,
      });
      setIsRoleDialogOpen(false);
      onMemberUpdated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleSaveManager = async () => {
    setIsManagerLoading(true);
    try {
      const managerId = selectedManagerId === "none" ? null : selectedManagerId;
      await updateMemberManager(userRole, member.id, managerId);
      toast({
        title: "Manager updated",
        description:
          managerId
            ? `${member.firstName}'s manager has been updated.`
            : `${member.firstName} has been set to no manager.`,
      });
      setIsManagerDialogOpen(false);
      onMemberUpdated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update manager.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsManagerLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!user) return;
    setIsRemoveLoading(true);
    try {
      await removeMember(user, member.id, workspaceId);
      toast({
        title: "Member removed",
        description: `${member.firstName} has been removed from the workspace.`,
      });
      setIsConfirmDeleteOpen(false);
      onMemberUpdated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRemoveLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FontAwesomeIcon icon={faEllipsisV} className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {permissions.canChangeRoles && (
            <DropdownMenuItem onClick={handleChangeRole}>
              Change Role
            </DropdownMenuItem>
          )}
          {permissions.canAssignManager && (
            <DropdownMenuItem onClick={handleChangeManager}>
              Change Manager
            </DropdownMenuItem>
          )}
          {permissions.canRemoveMember && (
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              Remove from Workspace
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-select">
                Role for {member.firstName} {member.lastName ?? ""}
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={isRoleLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isRoleLoading}>
              {isRoleLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager Assignment Dialog */}
      <Dialog open={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="manager-select">
                Manager for {member.firstName} {member.lastName ?? ""}
              </Label>
              {isManagerFetching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <Select
                  value={selectedManagerId}
                  onValueChange={setSelectedManagerId}
                >
                  <SelectTrigger id="manager-select">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {potentialManagers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName ?? ""} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManagerDialogOpen(false)}
              disabled={isManagerLoading || isManagerFetching}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveManager}
              disabled={isManagerLoading || isManagerFetching}
            >
              {isManagerLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation AlertDialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {member.firstName} {member.lastName ?? ""}
              </strong>{" "}
              from the workspace? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoveLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoveLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoveLoading ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
