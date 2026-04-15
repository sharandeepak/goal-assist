import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type { SupabaseUser, UserRole } from "@/common/types";
import type { TeamRepository } from "./teamRepository";
import type { TeamMember } from "../types";
import { toTeamMember } from "../types";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseTeamRepository implements TeamRepository {
  async getWorkspaceMembers(workspaceId: string): Promise<TeamMember[]> {
    try {
      // Get all users in workspace
      const { data: users, error } = await getClient()
        .from("users")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["active", "invited"])
        .order("first_name", { ascending: true });

      if (error) {
        throw AppError.internal("TEAM_LIST_ERROR", error.message);
      }

      // Get manager names
      const managerIds = [...new Set(users?.filter(u => u.manager_id).map(u => u.manager_id))] as string[];

      let managerMap: Record<string, string> = {};
      if (managerIds.length > 0) {
        const { data: managers } = await getClient()
          .from("users")
          .select("id, first_name, last_name")
          .in("id", managerIds);

        managerMap = (managers || []).reduce((acc, m) => {
          acc[m.id] = `${m.first_name} ${m.last_name || ""}`.trim();
          return acc;
        }, {} as Record<string, string>);
      }

      return (users || []).map(user =>
        toTeamMember(user as SupabaseUser, user.manager_id ? managerMap[user.manager_id] : null)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_LIST_ERROR", "Failed to fetch team members.");
    }
  }

  async getMemberById(memberId: string): Promise<SupabaseUser | null> {
    try {
      const { data, error } = await getClient()
        .from("users")
        .select("*")
        .eq("id", memberId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw AppError.internal("TEAM_MEMBER_ERROR", error.message);
      }

      return data as SupabaseUser | null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_MEMBER_ERROR", "Failed to fetch member.");
    }
  }

  async getDirectReports(managerId: string, workspaceId: string): Promise<SupabaseUser[]> {
    try {
      const { data, error } = await getClient()
        .from("users")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("manager_id", managerId)
        .in("status", ["active", "invited"])
        .order("first_name", { ascending: true });

      if (error) {
        throw AppError.internal("TEAM_REPORTS_ERROR", error.message);
      }

      return (data || []) as SupabaseUser[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_REPORTS_ERROR", "Failed to fetch direct reports.");
    }
  }

  async getTopLevelMembers(workspaceId: string): Promise<SupabaseUser[]> {
    try {
      const { data, error } = await getClient()
        .from("users")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("manager_id", null)
        .in("status", ["active", "invited"])
        .order("first_name", { ascending: true });

      if (error) {
        throw AppError.internal("TEAM_TOP_LEVEL_ERROR", error.message);
      }

      return (data || []) as SupabaseUser[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_TOP_LEVEL_ERROR", "Failed to fetch top-level members.");
    }
  }

  async hasDirectReports(memberId: string): Promise<boolean> {
    try {
      const { count, error } = await getClient()
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", memberId)
        .in("status", ["active", "invited"]);

      if (error) {
        throw AppError.internal("TEAM_REPORTS_CHECK_ERROR", error.message);
      }

      return (count ?? 0) > 0;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_REPORTS_CHECK_ERROR", "Failed to check direct reports.");
    }
  }

  async updateMemberRole(memberId: string, role: UserRole): Promise<void> {
    try {
      const { error } = await getClient()
        .from("users")
        .update({ role })
        .eq("id", memberId);

      if (error) {
        throw AppError.internal("TEAM_UPDATE_ROLE_ERROR", error.message);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_UPDATE_ROLE_ERROR", "Failed to update member role.");
    }
  }

  async updateMemberManager(memberId: string, managerId: string | null): Promise<void> {
    try {
      const { error } = await getClient()
        .from("users")
        .update({ manager_id: managerId })
        .eq("id", memberId);

      if (error) {
        throw AppError.internal("TEAM_UPDATE_MANAGER_ERROR", error.message);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_UPDATE_MANAGER_ERROR", "Failed to update member manager.");
    }
  }

  async removeMember(memberId: string): Promise<void> {
    try {
      // Clear manager_id for any direct reports first
      await getClient()
        .from("users")
        .update({ manager_id: null })
        .eq("manager_id", memberId);

      // Delete the user record
      // Note: In the future, consider soft-delete with "inactive" status
      // once the database schema supports it
      const { error } = await getClient()
        .from("users")
        .delete()
        .eq("id", memberId);

      if (error) {
        throw AppError.internal("TEAM_REMOVE_ERROR", error.message);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_REMOVE_ERROR", "Failed to remove member.");
    }
  }

  async searchMembers(workspaceId: string, query: string): Promise<TeamMember[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;

      const { data: users, error } = await getClient()
        .from("users")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["active", "invited"])
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .order("first_name", { ascending: true });

      if (error) {
        throw AppError.internal("TEAM_SEARCH_ERROR", error.message);
      }

      // Get manager names (same logic as getWorkspaceMembers)
      const managerIds = [...new Set(users?.filter(u => u.manager_id).map(u => u.manager_id))] as string[];

      let managerMap: Record<string, string> = {};
      if (managerIds.length > 0) {
        const { data: managers } = await getClient()
          .from("users")
          .select("id, first_name, last_name")
          .in("id", managerIds);

        managerMap = (managers || []).reduce((acc, m) => {
          acc[m.id] = `${m.first_name} ${m.last_name || ""}`.trim();
          return acc;
        }, {} as Record<string, string>);
      }

      return (users || []).map(user =>
        toTeamMember(user as SupabaseUser, user.manager_id ? managerMap[user.manager_id] : null)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TEAM_SEARCH_ERROR", "Failed to search members.");
    }
  }
}

export const supabaseTeamRepository = new SupabaseTeamRepository();
