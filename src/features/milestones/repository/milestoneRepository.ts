import { Unsubscribe } from "firebase/firestore";
import { Milestone, PageMilestoneSummary } from "@/common/types";

/** Summary data for the main page's milestone card */
export interface MilestonePageSummaryData {
  activeCount: number;
  nextDeadlineDays: number | null;
  topUpcoming: PageMilestoneSummary[];
}

export interface MilestoneRepository {
  subscribeToMilestonesByStatus(
    status: Milestone["status"],
    callback: (milestones: Milestone[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  subscribeToActiveMilestonesProgress(
    callback: (milestones: Milestone[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  getPageMilestoneSummary(): Promise<MilestonePageSummaryData>;

  getNextActiveMilestone(date: Date): Promise<Milestone | null>;

  getUpcomingActiveMilestones(count: number): Promise<Milestone[]>;

  getMilestonesEndingOnDate(date: Date): Promise<Milestone[]>;

  addMilestone(milestoneData: Omit<Milestone, "id">): Promise<string>;

  updateMilestone(
    milestoneId: string,
    dataToUpdate: Partial<Omit<Milestone, "id" | "progress" | "startDate" | "tasks">>
  ): Promise<void>;

  getMilestoneById(milestoneId: string): Promise<Milestone | null>;

  updateMilestoneProgress(milestoneId: string, data: { progress: number; status?: Milestone["status"] }): Promise<void>;

  deleteMilestone(milestoneId: string): Promise<void>;

  getAllMilestoneIds(): Promise<string[]>;

  deleteAllMilestones(ids: string[]): Promise<void>;
}
