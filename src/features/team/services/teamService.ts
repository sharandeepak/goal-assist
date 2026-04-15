import type { SupabaseUser, UserRole } from "@/common/types";
import { AppError } from "@/common/errors/AppError";
import { supabaseTeamRepository } from "../repository/supabaseTeamRepository";
import type { TeamMember, TeamPermissions, UpdateMemberParams } from "../types";
import { getPermissionsForRole } from "../types";

const repository = supabaseTeamRepository;

// ─── Permission Helpers ───

/**
 * Get permissions for the current user
 */
export function getUserPermissions(userRole: UserRole): TeamPermissions {
  return getPermissionsForRole(userRole);
}

/**
 * Check if user can manage (edit/remove) a specific member
 */
export function canManageMember(actor: SupabaseUser, target: SupabaseUser): boolean {
  // Can't manage yourself
  if (actor.id === target.id) return false;
  // Only admins can manage members
  if (actor.role !== "admin") return false;
  return true;
}

/**
 * Check if user can invite with a specific role
 */
export function canInviteRole(inviterRole: UserRole, targetRole: UserRole): boolean {
  if (inviterRole === "admin") return true;
  if (inviterRole === "manager" && targetRole === "member") return true;
  return false;
}

// ─── Team Member Operations ───

/**
 * Get all workspace members for list view
 */
export async function getTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  return repository.getWorkspaceMembers(workspaceId);
}

/**
 * Search workspace members
 */
export async function searchTeamMembers(workspaceId: string, query: string): Promise<TeamMember[]> {
  if (!query.trim()) {
    return repository.getWorkspaceMembers(workspaceId);
  }
  return repository.searchMembers(workspaceId, query);
}

/**
 * Get members for tree view (top-level nodes)
 */
export async function getTopLevelMembers(workspaceId: string): Promise<SupabaseUser[]> {
  return repository.getTopLevelMembers(workspaceId);
}

/**
 * Get direct reports for a manager (lazy loading children in tree)
 */
export async function getDirectReports(managerId: string, workspaceId: string): Promise<SupabaseUser[]> {
  return repository.getDirectReports(managerId, workspaceId);
}

/**
 * Check if a member has direct reports (for tree view expand indicator)
 */
export async function hasDirectReports(memberId: string, workspaceId: string): Promise<boolean> {
  return repository.hasDirectReports(memberId, workspaceId);
}

// ─── Member Management ───

/**
 * Update a member's role
 * Only admins can change roles
 */
export async function updateMemberRole(
  actorRole: UserRole,
  memberId: string,
  newRole: UserRole
): Promise<void> {
  const permissions = getPermissionsForRole(actorRole);
  if (!permissions.canChangeRoles) {
    throw AppError.forbidden("TEAM_PERMISSION_DENIED", "You do not have permission to change roles.");
  }

  await repository.updateMemberRole(memberId, newRole);
}

/**
 * Update a member's manager
 * Only admins can assign managers
 */
export async function updateMemberManager(
  actorRole: UserRole,
  memberId: string,
  managerId: string | null
): Promise<void> {
  const permissions = getPermissionsForRole(actorRole);
  if (!permissions.canAssignManager) {
    throw AppError.forbidden("TEAM_PERMISSION_DENIED", "You do not have permission to assign managers.");
  }

  // Prevent self-assignment
  if (managerId && memberId === managerId) {
    throw AppError.badRequest("TEAM_SELF_MANAGER", "A member cannot be their own manager.");
  }

  await repository.updateMemberManager(memberId, managerId);
}

/**
 * Remove a member from the workspace
 * Only admins can remove members
 */
export async function removeMember(
  actor: SupabaseUser,
  memberId: string,
  workspaceId: string
): Promise<void> {
  const permissions = getPermissionsForRole(actor.role as UserRole);
  if (!permissions.canRemoveMember) {
    throw AppError.forbidden("TEAM_PERMISSION_DENIED", "You do not have permission to remove members.");
  }

  // Can't remove yourself
  if (actor.id === memberId) {
    throw AppError.badRequest("TEAM_SELF_REMOVE", "You cannot remove yourself from the workspace.");
  }

  await repository.removeMember(memberId, workspaceId);
}

/**
 * Get list of potential managers for assignment
 * Returns all active members except the target member (to prevent self-assignment)
 */
export async function getPotentialManagers(
  workspaceId: string,
  excludeMemberId?: string
): Promise<TeamMember[]> {
  const members = await repository.getWorkspaceMembers(workspaceId);

  // Filter out the target member and only include active members
  return members.filter(m =>
    m.status === "active" &&
    (excludeMemberId ? m.id !== excludeMemberId : true)
  );
}
