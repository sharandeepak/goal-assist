// milestoneService.ts
import { Milestone, MilestoneProgressData, PageMilestoneSummary } from "@/types";
import { Unsubscribe, Timestamp } from "firebase/firestore"; // Needed for types in params
import { milestoneRepository, taskRepository } from "@/repositories";

export const subscribeToActiveMilestonesProgress = (
  callback: (milestones: MilestoneProgressData[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return milestoneRepository.subscribeToActiveMilestonesProgress(callback, onError);
};

export const getMilestonesEndingOnDate = async (date: Date): Promise<Milestone[]> => {
  return milestoneRepository.getMilestonesEndingOnDate(date);
};

export const getNextActiveMilestone = async (date: Date): Promise<Milestone | null> => {
    return milestoneRepository.getNextActiveMilestone(date);
};

interface MilestonePageSummaryData {
  activeCount: number;
  nextDeadlineDays: number | null;
  topUpcoming: PageMilestoneSummary[];
}

export const getPageMilestoneSummary = async (): Promise<MilestonePageSummaryData> => {
  return milestoneRepository.getPageMilestoneSummary();
};

export const subscribeToMilestonesByStatus = (
  status: Milestone['status'],
  callback: (milestones: Milestone[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return milestoneRepository.subscribeToMilestonesByStatus(status, callback, onError);
};

export const addMilestone = async (milestoneData: Omit<Milestone, 'id'>): Promise<string> => {
     return milestoneRepository.addMilestone(milestoneData);
};

export const updateMilestone = async (
    milestoneId: string,
    dataToUpdate: Partial<Omit<Milestone, 'id' | 'progress' | 'startDate' | 'tasks'>>
): Promise<void> => {
    if (!milestoneId) throw new Error("Milestone ID is required for update.");
    if (Object.keys(dataToUpdate).length === 0) {
        console.warn("updateMilestone called with no data to update.");
        return;
    }
    if (dataToUpdate.status && !['active', 'completed', 'archived'].includes(dataToUpdate.status)) {
        throw new Error(`Invalid milestone status provided: ${dataToUpdate.status}`);
    }
    const forbiddenFields: (keyof Milestone)[] = ['id', 'progress', 'startDate', 'tasks'];
    for (const field of forbiddenFields) {
        if (field in dataToUpdate) {
            console.warn(`Attempted to update forbidden field '${field}' in updateMilestone. Ignoring.`);
            delete dataToUpdate[field as keyof typeof dataToUpdate];
        }
    }
    if (Object.keys(dataToUpdate).length === 0) {
         return;
    }
    await milestoneRepository.updateMilestone(milestoneId, dataToUpdate);
};

export const deleteMilestone = async (milestoneId: string, deleteAssociatedTasks: boolean = false): Promise<void> => {
    if (!milestoneId) throw new Error("Milestone ID is required for deletion.");

    try {
        if (deleteAssociatedTasks) {
             console.log(`Attempting to delete tasks associated with milestone ${milestoneId}...`);
            await taskRepository.deleteTasksForMilestone(milestoneId);
             console.log(`Finished deleting tasks for milestone ${milestoneId}.`);
        }
        await milestoneRepository.deleteMilestone(milestoneId);
        console.log(`Milestone ${milestoneId} deleted successfully${deleteAssociatedTasks ? ' after associated tasks' : ''}.`);

    } catch (error) {
        console.error(`Error during deletion process for milestone ${milestoneId}: `, error);
        throw new Error(`Failed to delete milestone ${milestoneId}${deleteAssociatedTasks ? ' or its associated tasks' : ''}.`);
    }
};

export const getUpcomingActiveMilestones = async (count: number): Promise<Milestone[]> => {
  return milestoneRepository.getUpcomingActiveMilestones(count);
};

export const updateMilestoneProgress = async (milestoneId: string): Promise<void> => {
	if (!milestoneId) {
		console.warn("updateMilestoneProgress called without milestoneId");
		return;
	}
    await milestoneRepository.updateMilestoneProgress(milestoneId);
};

export const deleteAllUserMilestones = async (): Promise<void> => {
  console.warn(
    "deleteAllUserMilestones called. This will delete all documents in the 'milestones' collection and their associated tasks."
  );
  await milestoneRepository.deleteAllUserMilestones();
};