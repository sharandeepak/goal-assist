import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type {
  SupabaseWorkspace,
  SupabaseWorkspaceInsert,
  SupabaseUser,
  SupabaseUserInsert,
} from "@/common/types";
import type { AuthRepository } from "./authRepository";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseAuthRepository implements AuthRepository {
  async createWorkspace(data: SupabaseWorkspaceInsert): Promise<SupabaseWorkspace> {
    try {
      const { data: workspace, error } = await getClient()
        .from("workspaces")
        .insert(data)
        .select()
        .single();

      if (error)
        throw AppError.internal("WORKSPACE_CREATE_ERROR", error.message);
      if (!workspace)
        throw AppError.internal(
          "WORKSPACE_CREATE_ERROR",
          "No data returned on insert."
        );
      return workspace as SupabaseWorkspace;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("WORKSPACE_CREATE_ERROR", "Failed to create workspace.");
    }
  }

  async createUser(
    data: SupabaseUserInsert
  ): Promise<SupabaseUser> {
    try {
      const { data: user, error } = await getClient()
        .from("users")
        .insert(data)
        .select()
        .single();

      if (error)
        throw AppError.internal("USER_CREATE_ERROR", error.message);
      if (!user)
        throw AppError.internal(
          "USER_CREATE_ERROR",
          "No data returned on insert."
        );
      return user as SupabaseUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "USER_CREATE_ERROR",
        "Failed to create user."
      );
    }
  }

  async createUsersBatch(
    users: SupabaseUserInsert[]
  ): Promise<SupabaseUser[]> {
    try {
      if (users.length === 0) return [];

      const { data, error } = await getClient()
        .from("users")
        .insert(users)
        .select();

      if (error)
        throw AppError.internal("USERS_BATCH_ERROR", error.message);
      return (data ?? []) as SupabaseUser[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "USERS_BATCH_ERROR",
        "Failed to create users."
      );
    }
  }

  async getUserByAuthId(
    authId: string,
    workspaceId?: string
  ): Promise<SupabaseUser | null> {
    try {
      let query = getClient()
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .eq("status", "active");

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== "PGRST116") {
        throw AppError.internal("USER_FETCH_ERROR", error.message);
      }
      return (data as SupabaseUser) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "USER_FETCH_ERROR",
        "Failed to fetch user."
      );
    }
  }

  async getWorkspaceById(workspaceId: string): Promise<SupabaseWorkspace | null> {
    try {
      const { data, error } = await getClient()
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw AppError.internal("WORKSPACE_FETCH_ERROR", error.message);
      }
      return (data as SupabaseWorkspace) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "WORKSPACE_FETCH_ERROR",
        "Failed to fetch workspace."
      );
    }
  }

  async activateUser(userId: string, authId: string): Promise<void> {
    try {
      const { error } = await getClient()
        .from("users")
        .update({ auth_id: authId, status: "active" as const })
        .eq("id", userId);

      if (error)
        throw AppError.internal("USER_ACTIVATE_ERROR", error.message);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "USER_ACTIVATE_ERROR",
        "Failed to activate user."
      );
    }
  }
}

export const supabaseAuthRepository = new SupabaseAuthRepository();
