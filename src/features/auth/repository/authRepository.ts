import type {
  SupabaseWorkspace,
  SupabaseWorkspaceInsert,
  SupabaseUser,
  SupabaseUserInsert,
} from "@/common/types";

export interface AuthRepository {
  createWorkspace(data: SupabaseWorkspaceInsert): Promise<SupabaseWorkspace>;

  createUser(data: SupabaseUserInsert): Promise<SupabaseUser>;

  createUsersBatch(
    users: SupabaseUserInsert[]
  ): Promise<SupabaseUser[]>;

  getUserByAuthId(authId: string, workspaceId?: string): Promise<SupabaseUser | null>;

  getWorkspaceById(workspaceId: string): Promise<SupabaseWorkspace | null>;

  activateUser(userId: string, authId: string): Promise<void>;
}
