import { AppError } from "@/common/errors/AppError";
import { supabaseHierarchyRepository } from "../repository/supabaseHierarchyRepository";

const hierarchyRepository = supabaseHierarchyRepository;

/**
 * Add a manager relationship to the closure table.
 * Called when:
 * - A user accepts an invite with a manager_id
 * - An admin assigns a manager to an existing user
 */
export async function addManagerRelationship(
  managerId: string,
  reporteeId: string,
  workspaceId: string
): Promise<void> {
  if (managerId === reporteeId) {
    throw AppError.badRequest("HIERARCHY_SELF_REFERENCE", "A user cannot be their own manager.");
  }

  try {
    await hierarchyRepository.addManagerRelationship(managerId, reporteeId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("HIERARCHY_ADD_ERROR", "Failed to add manager relationship.");
  }
}

/**
 * Remove a manager relationship from the closure table.
 * Called when:
 * - An admin removes a manager from a user
 * - A user is removed from the workspace
 */
export async function removeManagerRelationship(
  managerId: string,
  reporteeId: string,
  workspaceId: string
): Promise<void> {
  try {
    await hierarchyRepository.removeManagerRelationship(managerId, reporteeId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("HIERARCHY_REMOVE_ERROR", "Failed to remove manager relationship.");
  }
}

/**
 * Update a user's manager.
 * Removes the old relationship (if any) and adds the new one.
 */
export async function updateManagerRelationship(
  userId: string,
  oldManagerId: string | null,
  newManagerId: string | null,
  workspaceId: string
): Promise<void> {
  try {
    // Remove old relationship
    if (oldManagerId) {
      await hierarchyRepository.removeManagerRelationship(oldManagerId, userId, workspaceId);
    }

    // Add new relationship
    if (newManagerId) {
      await hierarchyRepository.addManagerRelationship(newManagerId, userId, workspaceId);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("HIERARCHY_UPDATE_ERROR", "Failed to update manager relationship.");
  }
}

/**
 * Get all managers of a user (direct and transitive).
 */
export async function getManagersOf(
  userId: string,
  workspaceId: string
): Promise<{ managerId: string; depth: number }[]> {
  try {
    return await hierarchyRepository.getManagersOf(userId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("HIERARCHY_FETCH_ERROR", "Failed to fetch managers.");
  }
}

/**
 * Get all reportees of a manager (direct and transitive).
 */
export async function getReporteesOf(
  managerId: string,
  workspaceId: string
): Promise<{ reporteeId: string; depth: number }[]> {
  try {
    return await hierarchyRepository.getReporteesOf(managerId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("HIERARCHY_FETCH_ERROR", "Failed to fetch reportees.");
  }
}

/**
 * Check if a user is in the management chain of another user.
 * Returns true if managerId is a direct or indirect manager of reporteeId.
 */
export async function isManagerOf(
  managerId: string,
  reporteeId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const managers = await hierarchyRepository.getManagersOf(reporteeId, workspaceId);
    return managers.some((m) => m.managerId === managerId);
  } catch (error) {
    return false;
  }
}
