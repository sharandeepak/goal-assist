"use client";

import { Button } from "@/common/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/ui/dropdown-menu";
import type { TeamMember } from "../types";
import type { UserRole } from "@/common/types";
import { getPermissionsForRole } from "../types";

interface MemberActionsMenuProps {
  member: TeamMember;
  userRole: UserRole;
  onMemberUpdated: () => void;
}

export function MemberActionsMenu({ member, userRole, onMemberUpdated }: MemberActionsMenuProps) {
  const permissions = getPermissionsForRole(userRole);

  // Don't show menu if user has no permissions
  if (!permissions.canChangeRoles && !permissions.canAssignManager && !permissions.canRemoveMember) {
    return null;
  }

  const handleChangeRole = () => {
    // TODO: Implement in Task 3.8 - open role change dialog
    console.log("Change role for:", member.id);
  };

  const handleChangeManager = () => {
    // TODO: Implement in Task 3.8 - open manager assignment dialog
    console.log("Change manager for:", member.id);
  };

  const handleRemove = () => {
    // TODO: Implement in Task 3.8 - confirm and remove member
    console.log("Remove member:", member.id);
  };

  return (
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
  );
}
