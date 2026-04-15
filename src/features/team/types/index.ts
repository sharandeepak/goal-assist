import type { SupabaseUser, UserRole } from "@/common/types";
import type { InviteWithDetails } from "@/features/invite/types";

// ─── Team Member Types ───

/**
 * Team member with manager info for list view
 */
export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "inactive";
  managerId: string | null;
  managerName: string | null; // Denormalized for display
  createdAt: string;
}

/**
 * Convert a SupabaseUser to TeamMember
 */
export function toTeamMember(
  user: SupabaseUser,
  managerName?: string | null
): TeamMember {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as "active" | "invited" | "inactive",
    managerId: user.manager_id,
    managerName: managerName || null,
    createdAt: user.created_at,
  };
}

// ─── Tree View Types ───

/**
 * Tree node for hierarchical display
 */
export interface TeamTreeNode {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "inactive";
  children: TeamTreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
  hasChildren: boolean;
  depth: number;
}

/**
 * Response from lazy-loading children
 */
export interface TreeChildrenResponse {
  children: TeamTreeNode[];
  hasMore: boolean;
}

// ─── Permission Types ───

/**
 * Actions a user can perform on team members
 */
export type TeamAction =
  | "invite_admin"
  | "invite_manager"
  | "invite_member"
  | "remove_member"
  | "change_role"
  | "assign_manager"
  | "cancel_invite"
  | "resend_invite";

/**
 * Check if a user can perform an action
 */
export interface TeamPermissions {
  canInviteAdmin: boolean;
  canInviteManager: boolean;
  canInviteMember: boolean;
  canRemoveMember: boolean;
  canChangeRoles: boolean;
  canAssignManager: boolean;
  canCancelInvite: boolean;
  canResendInvite: boolean;
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(
  role: UserRole,
  isOwnInvite: boolean = false
): TeamPermissions {
  switch (role) {
    case "admin":
      return {
        canInviteAdmin: true,
        canInviteManager: true,
        canInviteMember: true,
        canRemoveMember: true,
        canChangeRoles: true,
        canAssignManager: true,
        canCancelInvite: true,
        canResendInvite: true,
      };
    case "manager":
      return {
        canInviteAdmin: false,
        canInviteManager: false,
        canInviteMember: true,
        canRemoveMember: false,
        canChangeRoles: false,
        canAssignManager: false,
        canCancelInvite: isOwnInvite,
        canResendInvite: isOwnInvite,
      };
    case "member":
    default:
      return {
        canInviteAdmin: false,
        canInviteManager: false,
        canInviteMember: false,
        canRemoveMember: false,
        canChangeRoles: false,
        canAssignManager: false,
        canCancelInvite: false,
        canResendInvite: false,
      };
  }
}

// ─── Team Page State Types ───

export type TeamViewMode = "list" | "tree";

export interface TeamPageState {
  viewMode: TeamViewMode;
  searchQuery: string;
  isInviteDialogOpen: boolean;
}

// ─── Service Parameter Types ───

export interface UpdateMemberParams {
  memberId: string;
  role?: UserRole;
  managerId?: string | null;
}

export interface RemoveMemberParams {
  memberId: string;
  workspaceId: string;
}

// Re-export invite types for convenience
export type { InviteWithDetails };
