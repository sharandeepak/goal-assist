import { Unsubscribe } from "firebase/firestore";
import { Milestone, MilestoneProgressData } from "@/common/types";
import { getTaskCountsForMilestone, deleteTasksForMilestone } from "@/features/tasks/services/taskService";
import { FirebaseMilestoneRepository } from "@/features/milestones/repository/firebaseMilestoneRepository";
import type { MilestonePageSummaryData } from "@/features/milestones/repository/milestoneRepository";
import { calculateDaysLeft } from "@/features/milestones/utils";

const repository = new FirebaseMilestoneRepository();

/**
 * Subscribes to milestones based on their status.
 */
export const subscribeToMilestonesByStatus = (
  status: Milestone["status"],
  callback: (milestones: Milestone[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return repository.subscribeToMilestonesByStatus(status, callback, onError);
};

/**
 * Subscribes to active milestones for the Milestone Progress component,
 * calculating daysLeft dynamically.
 */
export const subscribeToActiveMilestonesProgress = (
  callback: (milestones: MilestoneProgressData[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return repository.subscribeToActiveMilestonesProgress(
    (milestones) => {
      const withDaysLeft: MilestoneProgressData[] = milestones.map((m) => ({
        ...m,
        daysLeft: calculateDaysLeft(m.endDate),
      }));
      callback(withDaysLeft);
    },
    onError
  );
};

/**
 * Fetches summary data for the main page's milestone card.
 */
export const getPageMilestoneSummary = async (): Promise<MilestonePageSummaryData> => {
  return repository.getPageMilestoneSummary();
};

/**
 * Fetches the next single active milestone occurring after a given date.
 */
export const getNextActiveMilestone = async (date: Date): Promise<Milestone | null> => {
  return repository.getNextActiveMilestone(date);
};

/**
 * Fetches a list of upcoming active milestones.
 */
export const getUpcomingActiveMilestones = async (count: number): Promise<Milestone[]> => {
  return repository.getUpcomingActiveMilestones(count);
};

/**
 * Fetches milestones ending on a specific date.
 */
export const getMilestonesEndingOnDate = async (date: Date): Promise<Milestone[]> => {
  return repository.getMilestonesEndingOnDate(date);
};

/**
 * Adds a new milestone.
 */
export const addMilestone = async (milestoneData: Omit<Milestone, "id">): Promise<string> => {
  return repository.addMilestone(milestoneData);
};

/**
 * Updates specific fields of an existing milestone.
 * Forbidden fields: id, progress, startDate, tasks.
 */
export const updateMilestone = async (
  milestoneId: string,
  dataToUpdate: Partial<Omit<Milestone, "id" | "progress" | "startDate" | "tasks">>
): Promise<void> => {
  if (!milestoneId) throw new Error("Milestone ID is required for update.");
  if (Object.keys(dataToUpdate).length === 0) {
    console.warn("updateMilestone called with no data to update.");
    return;
  }

  if (dataToUpdate.status && !["active", "completed", "archived"].includes(dataToUpdate.status)) {
    throw new Error(`Invalid milestone status provided: ${dataToUpdate.status}`);
  }

  const forbiddenFields: (keyof Milestone)[] = ["id", "progress", "startDate", "tasks"];
  for (const field of forbiddenFields) {
    if (field in dataToUpdate) {
      console.warn(
        `Attempted to update forbidden field '${field}' in updateMilestone. Ignoring.`
      );
      delete dataToUpdate[field as keyof typeof dataToUpdate];
    }
  }
  if (Object.keys(dataToUpdate).length === 0) {
    console.warn("updateMilestone called with only forbidden fields. No update performed.");
    return;
  }

  await repository.updateMilestone(milestoneId, dataToUpdate);
};

/**
 * Calculates and updates the progress percentage based on associated tasks.
 * Auto status: completed when 100%, revert to active when drops below 100%.
 */
export const updateMilestoneProgress = async (milestoneId: string): Promise<void> => {
  if (!milestoneId) {
    console.warn("updateMilestoneProgress called without milestoneId");
    return;
  }

  const current = await repository.getMilestoneById(milestoneId);
  if (!current) {
    console.error(`Milestone ${milestoneId} not found for progress update.`);
    return;
  }

  const { total, completed } = await getTaskCountsForMilestone(milestoneId);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const dataToUpdate: { progress: number; status?: Milestone["status"] } = { progress };

  if (progress === 100 && current.status !== "completed") {
    dataToUpdate.status = "completed";
    console.log(`Milestone ${milestoneId} automatically marked as completed.`);
  } else if (progress < 100 && current.status === "completed") {
    dataToUpdate.status = "active";
    console.log(
      `Milestone ${milestoneId} automatically reverted to active due to progress drop.`
    );
  }

  if (
    dataToUpdate.progress !== current.progress ||
    (dataToUpdate.status !== undefined && dataToUpdate.status !== current.status)
  ) {
    await repository.updateMilestoneProgress(milestoneId, dataToUpdate);
  }
};

/**
 * Deletes a milestone. Optionally deletes associated tasks first.
 */
export const deleteMilestone = async (
  milestoneId: string,
  deleteAssociatedTasks: boolean = false
): Promise<void> => {
  if (!milestoneId) throw new Error("Milestone ID is required for deletion.");

  try {
    if (deleteAssociatedTasks) {
      await deleteTasksForMilestone(milestoneId);
    }
    await repository.deleteMilestone(milestoneId);
  } catch (error) {
    console.error(`Error during deletion process for milestone ${milestoneId}: `, error);
    throw new Error(
      `Failed to delete milestone ${milestoneId}${deleteAssociatedTasks ? " or its associated tasks" : ""}.`
    );
  }
};

/**
 * Deletes all milestones and their associated tasks.
 * WARNING: Permanently deletes all documents in the milestones collection.
 */
export const deleteAllUserMilestones = async (): Promise<void> => {
  console.warn(
    "deleteAllUserMilestones called. This will delete all documents in the 'milestones' collection and their associated tasks."
  );

  const ids = await repository.getAllMilestoneIds();
  if (ids.length === 0) {
    console.log("No milestones found to delete.");
    return;
  }

  for (const milestoneId of ids) {
    try {
      await deleteTasksForMilestone(milestoneId);
    } catch (taskError) {
      console.error(`Error deleting tasks for milestone ${milestoneId}:`, taskError);
    }
  }

  await repository.deleteAllMilestones(ids);
  console.log(`Successfully deleted ${ids.length} milestones.`);
};
