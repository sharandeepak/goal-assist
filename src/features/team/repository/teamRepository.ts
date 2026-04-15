import type { SupabaseUser, UserRole } from "@/common/types";
import type { TeamMember } from "../types";

export interface TeamRepository {
  /**
   * Get all workspace members with manager names
   */
  getWorkspaceMembers(workspaceId: string): Promise<TeamMember[]>;

  /**
   * Get a single member by ID
   */
  getMemberById(memberId: string): Promise<SupabaseUser | null>;

  /**
   * Get direct reports for a manager (for tree view)
   */
  getDirectReports(managerId: string, workspaceId: string): Promise<SupabaseUser[]>;

  /**
   * Get members without a manager (top-level for tree view)
   */
  getTopLevelMembers(workspaceId: string): Promise<SupabaseUser[]>;

  /**
   * Check if a member has any direct reports
   */
  hasDirectReports(memberId: string): Promise<boolean>;

  /**
   * Update a member's role
   */
  updateMemberRole(memberId: string, role: UserRole): Promise<void>;

  /**
   * Update a member's manager
   */
  updateMemberManager(memberId: string, managerId: string | null): Promise<void>;

  /**
   * Remove a member (set status to inactive)
   */
  removeMember(memberId: string): Promise<void>;

  /**
   * Search members by name or email
   */
  searchMembers(workspaceId: string, query: string): Promise<TeamMember[]>;
}
