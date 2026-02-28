import type {
  SupabaseMilestone,
  SupabaseMilestoneInsert,
  SupabaseMilestoneUpdate,
  PageMilestoneSummary,
} from "@/common/types";

export interface MilestonePageSummaryData {
  activeCount: number;
  nextDeadlineDays: number | null;
  topUpcoming: PageMilestoneSummary[];
}

export interface MilestoneRepository {
  subscribeToMilestonesByStatus(
    status: SupabaseMilestone["status"],
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void;

  subscribeToActiveMilestonesProgress(
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void;

  getPageMilestoneSummary(): Promise<MilestonePageSummaryData>;

  getNextActiveMilestone(date: Date): Promise<SupabaseMilestone | null>;

  getUpcomingActiveMilestones(count: number): Promise<SupabaseMilestone[]>;

  getMilestonesEndingOnDate(date: Date): Promise<SupabaseMilestone[]>;

  addMilestone(milestoneData: SupabaseMilestoneInsert): Promise<SupabaseMilestone>;

  updateMilestone(milestoneId: string, dataToUpdate: SupabaseMilestoneUpdate): Promise<void>;

  getMilestoneById(milestoneId: string): Promise<SupabaseMilestone | null>;

  updateMilestoneProgress(
    milestoneId: string,
    data: { progress: number; status?: SupabaseMilestone["status"] }
  ): Promise<void>;

  deleteMilestone(milestoneId: string): Promise<void>;

  getAllMilestoneIds(): Promise<string[]>;

  deleteAllMilestones(ids: string[]): Promise<void>;
}
