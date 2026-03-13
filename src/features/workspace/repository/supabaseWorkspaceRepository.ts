import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type { SupabaseWorkspace, SupabaseUser } from "@/common/types";
import type { WorkspaceRepository } from "./workspaceRepository";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  async getAllWorkspacesForAuthUser(authId: string): Promise<SupabaseWorkspace[]> {
    try {
      const { data: userRecords, error: userError } = await getClient()
        .from("users")
        .select("workspace_id")
        .eq("auth_id", authId)
        .in("status", ["active", "invited"]);

      if (userError) {
        throw AppError.internal("WORKSPACE_LIST_ERROR", userError.message);
      }

      const workspaceIds = (userRecords ?? []).map((u) => u.workspace_id);
      if (workspaceIds.length === 0) return [];

      const { data: workspaces, error: wsError } = await getClient()
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds)
        .order("created_at", { ascending: true });

      if (wsError) {
        throw AppError.internal("WORKSPACE_LIST_ERROR", wsError.message);
      }

      return (workspaces ?? []) as SupabaseWorkspace[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("WORKSPACE_LIST_ERROR", "Failed to fetch workspaces.");
    }
  }

  async getWorkspaceUsers(workspaceId: string): Promise<SupabaseUser[]> {
    try {
      const { data, error } = await getClient()
        .from("users")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("first_name", { ascending: true });

      if (error) {
        throw AppError.internal("WORKSPACE_USERS_ERROR", error.message);
      }

      return (data ?? []) as SupabaseUser[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("WORKSPACE_USERS_ERROR", "Failed to fetch workspace users.");
    }
  }

  async getWorkspaceCountForAuthUser(): Promise<number> {
    try {
      const { data, error } = await getClient().rpc("get_workspace_count_for_auth_user");

      if (error) {
        throw AppError.internal("WORKSPACE_COUNT_ERROR", error.message);
      }

      return (data as number) ?? 0;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("WORKSPACE_COUNT_ERROR", "Failed to get workspace count.");
    }
  }

  async createWorkspaceWithAdmin(
    workspaceName: string,
    authId: string,
    email: string,
    firstName: string,
    lastName: string
  ): Promise<SupabaseWorkspace> {
    try {
      const { data: workspace, error: wsError } = await getClient()
        .from("workspaces")
        .insert({ name: workspaceName, creator_id: authId })
        .select()
        .single();

      if (wsError) {
        throw AppError.internal("WORKSPACE_CREATE_ERROR", wsError.message);
      }
      if (!workspace) {
        throw AppError.internal("WORKSPACE_CREATE_ERROR", "No data returned on insert.");
      }

      const typedWorkspace = workspace as SupabaseWorkspace;

      const { error: userError } = await getClient()
        .from("users")
        .insert({
          workspace_id: typedWorkspace.id,
          auth_id: authId,
          first_name: firstName,
          last_name: lastName || null,
          email,
          role: "admin",
          status: "active",
        });

      if (userError) {
        throw AppError.internal("WORKSPACE_CREATE_ERROR", userError.message);
      }

      return typedWorkspace;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("WORKSPACE_CREATE_ERROR", "Failed to create workspace.");
    }
  }
}

export const supabaseWorkspaceRepository = new SupabaseWorkspaceRepository();
