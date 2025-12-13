import { Milestone, MilestoneProgressData, PageMilestoneSummary } from "@/types";
import { Unsubscribe } from "firebase/firestore";

export interface IMilestoneRepository {
  subscribeToActiveMilestonesProgress(
    callback: (milestones: MilestoneProgressData[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  getMilestonesEndingOnDate(date: Date): Promise<Milestone[]>;

  getNextActiveMilestone(date: Date): Promise<Milestone | null>;

  getPageMilestoneSummary(): Promise<{
    activeCount: number;
    nextDeadlineDays: number | null;
    topUpcoming: PageMilestoneSummary[];
  }>;

  subscribeToMilestonesByStatus(
    status: Milestone['status'],
    callback: (milestones: Milestone[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  addMilestone(milestoneData: Omit<Milestone, 'id'>): Promise<string>;

  updateMilestone(
    milestoneId: string,
    dataToUpdate: Partial<Omit<Milestone, 'id' | 'progress' | 'startDate' | 'tasks'>>
  ): Promise<void>;

  deleteMilestone(milestoneId: string, deleteAssociatedTasks?: boolean): Promise<void>;

  getUpcomingActiveMilestones(count: number): Promise<Milestone[]>;

  updateMilestoneProgress(milestoneId: string): Promise<void>;

  deleteAllUserMilestones(): Promise<void>;
}
