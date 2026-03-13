import { AppError } from "@/common/errors/AppError";
import { supabaseWorkspaceRepository } from "../repository/supabaseWorkspaceRepository";
import type { WorkspaceRepository } from "../repository/workspaceRepository";
import type { SupabaseWorkspace, SupabaseUser } from "@/common/types";

const MAX_WORKSPACES = 5;
const repo: WorkspaceRepository = supabaseWorkspaceRepository;

export async function getAllWorkspacesForAuthUser(
  authId: string
): Promise<SupabaseWorkspace[]> {
  try {
    return await repo.getAllWorkspacesForAuthUser(authId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("WORKSPACE_LIST_ERROR", "Failed to fetch workspaces.");
  }
}

export async function getWorkspaceUsers(
  workspaceId: string
): Promise<SupabaseUser[]> {
  if (!workspaceId) {
    throw AppError.badRequest("WORKSPACE_ID_REQUIRED", "Workspace ID is required.");
  }

  try {
    return await repo.getWorkspaceUsers(workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("WORKSPACE_USERS_ERROR", "Failed to fetch workspace users.");
  }
}

export async function getWorkspaceCount(): Promise<number> {
  try {
    return await repo.getWorkspaceCountForAuthUser();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("WORKSPACE_COUNT_ERROR", "Failed to get workspace count.");
  }
}

export async function createWorkspace(
  workspaceName: string,
  authId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<SupabaseWorkspace> {
  if (!workspaceName.trim()) {
    throw AppError.badRequest("WORKSPACE_NAME_REQUIRED", "Workspace name is required.");
  }

  const count = await repo.getWorkspaceCountForAuthUser();
  if (count >= MAX_WORKSPACES) {
    throw AppError.badRequest(
      "WORKSPACE_LIMIT_REACHED",
      `You can create a maximum of ${MAX_WORKSPACES} workspaces.`
    );
  }

  try {
    return await repo.createWorkspaceWithAdmin(
      workspaceName.trim(),
      authId,
      email,
      firstName,
      lastName
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("WORKSPACE_CREATE_ERROR", "Failed to create workspace.");
  }
}
