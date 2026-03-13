import type { SupabaseWorkspace, SupabaseUser } from "@/common/types";

export interface WorkspaceRepository {
  getAllWorkspacesForAuthUser(authId: string): Promise<SupabaseWorkspace[]>;

  getWorkspaceUsers(workspaceId: string): Promise<SupabaseUser[]>;

  getWorkspaceCountForAuthUser(): Promise<number>;

  createWorkspaceWithAdmin(
    workspaceName: string,
    authId: string,
    email: string,
    firstName: string,
    lastName: string
  ): Promise<SupabaseWorkspace>;
}
