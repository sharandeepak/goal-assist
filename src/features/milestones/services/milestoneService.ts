import type { SupabaseMilestone, SupabaseMilestoneInsert, SupabaseMilestoneUpdate } from "@/common/types";
import { getTaskCountsForMilestone, deleteTasksForMilestone } from "@/features/tasks/services/taskService";
import { supabaseMilestoneRepository } from "@/features/milestones/repository/supabaseMilestoneRepository";
import type { MilestonePageSummaryData, MilestoneRepository } from "@/features/milestones/repository/milestoneRepository";
import { calculateDaysLeft } from "@/features/milestones/utils";
import { AppError } from "@/common/errors/AppError";

const repository: MilestoneRepository = supabaseMilestoneRepository;

export interface MilestoneProgressData extends SupabaseMilestone {
  daysLeft?: number;
}

export const subscribeToMilestonesByStatus = (
  workspaceId: string,
  status: SupabaseMilestone["status"],
  callback: (milestones: SupabaseMilestone[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToMilestonesByStatus(workspaceId, status, callback, onError);
};

export const subscribeToActiveMilestonesProgress = (
  workspaceId: string,
  callback: (milestones: MilestoneProgressData[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToActiveMilestonesProgress(
    workspaceId,
    (milestones) => {
      const withDaysLeft: MilestoneProgressData[] = milestones.map((m) => ({
        ...m,
        daysLeft: calculateDaysLeft(m.end_date),
      }));
      callback(withDaysLeft);
    },
    onError
  );
};

export const getPageMilestoneSummary = async (workspaceId: string): Promise<MilestonePageSummaryData> => {
  try {
    return await repository.getPageMilestoneSummary(workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_SUMMARY_ERROR", "Failed to fetch milestone summary.");
  }
};

export const getNextActiveMilestone = async (workspaceId: string, date: Date): Promise<SupabaseMilestone | null> => {
  try {
    return await repository.getNextActiveMilestone(workspaceId, date);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_NEXT_ERROR", "Failed to fetch next active milestone.");
  }
};

export const getUpcomingActiveMilestones = async (workspaceId: string, count: number): Promise<SupabaseMilestone[]> => {
  try {
    return await repository.getUpcomingActiveMilestones(workspaceId, count);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_UPCOMING_ERROR", "Failed to fetch upcoming milestones.");
  }
};

export const getMilestonesEndingOnDate = async (workspaceId: string, date: Date): Promise<SupabaseMilestone[]> => {
  try {
    return await repository.getMilestonesEndingOnDate(workspaceId, date);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_ENDING_ERROR", "Failed to fetch milestones ending on date.");
  }
};

export const addMilestone = async (milestoneData: SupabaseMilestoneInsert): Promise<SupabaseMilestone> => {
  if (!milestoneData.title) {
    throw AppError.badRequest("MILESTONE_TITLE_REQUIRED", "Milestone title is required.");
  }
  if (!milestoneData.urgency) {
    throw AppError.badRequest("MILESTONE_URGENCY_REQUIRED", "Milestone urgency is required.");
  }
  if (!milestoneData.status) {
    throw AppError.badRequest("MILESTONE_STATUS_REQUIRED", "Milestone status is required.");
  }
  if (!milestoneData.workspace_id) {
    throw AppError.badRequest("MILESTONE_WORKSPACE_REQUIRED", "Workspace ID is required.");
  }

  try {
    return await repository.addMilestone(milestoneData);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_ADD_ERROR", "Failed to add milestone.");
  }
};

export const updateMilestone = async (
  milestoneId: string,
  dataToUpdate: SupabaseMilestoneUpdate
): Promise<void> => {
  if (!milestoneId) {
    throw AppError.badRequest("MILESTONE_ID_REQUIRED", "Milestone ID is required for update.");
  }
  if (Object.keys(dataToUpdate).length === 0) {
    return;
  }

  const forbiddenFields = ["id", "progress", "start_date"] as const;
  for (const field of forbiddenFields) {
    if (field in dataToUpdate) {
      delete dataToUpdate[field as keyof typeof dataToUpdate];
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return;
  }

  if (
    dataToUpdate.status &&
    !["planned", "active", "completed", "on_hold"].includes(dataToUpdate.status)
  ) {
    throw AppError.badRequest(
      "MILESTONE_INVALID_STATUS",
      `Invalid milestone status: ${dataToUpdate.status}`
    );
  }

  try {
    await repository.updateMilestone(milestoneId, dataToUpdate);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_UPDATE_ERROR", "Failed to update milestone.");
  }
};

export const updateMilestoneProgress = async (workspaceId: string, milestoneId: string): Promise<void> => {
  if (!milestoneId) {
    return;
  }

  try {
    const current = await repository.getMilestoneById(workspaceId, milestoneId);
    if (!current) {
      console.error(`Milestone ${milestoneId} not found for progress update.`);
      return;
    }

    const { total, completed } = await getTaskCountsForMilestone(workspaceId, milestoneId);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const updateData: { progress: number; status?: SupabaseMilestone["status"] } = { progress };

    if (progress === 100 && current.status !== "completed") {
      updateData.status = "completed";
    } else if (progress < 100 && current.status === "completed") {
      updateData.status = "active";
    }

    if (
      updateData.progress !== current.progress ||
      (updateData.status !== undefined && updateData.status !== current.status)
    ) {
      await repository.updateMilestoneProgress(milestoneId, updateData);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_PROGRESS_ERROR", "Failed to update milestone progress.");
  }
};

export const deleteMilestone = async (
  milestoneId: string,
  workspaceId: string,
  deleteAssociatedTasks: boolean = false
): Promise<void> => {
  if (!milestoneId) {
    throw AppError.badRequest("MILESTONE_ID_REQUIRED", "Milestone ID is required for deletion.");
  }

  try {
    if (deleteAssociatedTasks) {
      await deleteTasksForMilestone(workspaceId, milestoneId);
    }
    await repository.deleteMilestone(milestoneId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "MILESTONE_DELETE_ERROR",
      `Failed to delete milestone ${milestoneId}.`
    );
  }
};

export const searchMilestonesByTitle = async (
  workspaceId: string,
  query: string,
  status?: SupabaseMilestone["status"]
): Promise<SupabaseMilestone[]> => {
  if (!query.trim()) return [];
  try {
    return await repository.searchMilestonesByTitle(workspaceId, query.trim(), status);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_SEARCH_ERROR", "Failed to search milestones.");
  }
};

export const deleteAllUserMilestones = async (workspaceId: string): Promise<void> => {
  try {
    const ids = await repository.getAllMilestoneIds(workspaceId);
    if (ids.length === 0) {
      return;
    }

    for (const milestoneId of ids) {
      try {
        await deleteTasksForMilestone(workspaceId, milestoneId);
      } catch (taskError) {
        console.error(`Error deleting tasks for milestone ${milestoneId}:`, taskError);
      }
    }

    await repository.deleteAllMilestones(ids);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MILESTONE_DELETE_ALL_ERROR", "Failed to delete all milestones.");
  }
};
