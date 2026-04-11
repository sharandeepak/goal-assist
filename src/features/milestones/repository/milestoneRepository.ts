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
    workspaceId: string,
    status: SupabaseMilestone["status"],
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void;

  subscribeToActiveMilestonesProgress(
    workspaceId: string,
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void;

  getPageMilestoneSummary(workspaceId: string): Promise<MilestonePageSummaryData>;

  getNextActiveMilestone(workspaceId: string, date: Date): Promise<SupabaseMilestone | null>;

  getUpcomingActiveMilestones(workspaceId: string, count: number): Promise<SupabaseMilestone[]>;

  getMilestonesEndingOnDate(workspaceId: string, date: Date): Promise<SupabaseMilestone[]>;

  addMilestone(milestoneData: SupabaseMilestoneInsert): Promise<SupabaseMilestone>;

  updateMilestone(milestoneId: string, dataToUpdate: SupabaseMilestoneUpdate): Promise<void>;

  getMilestoneById(workspaceId: string, milestoneId: string): Promise<SupabaseMilestone | null>;

  updateMilestoneProgress(
    milestoneId: string,
    data: { progress: number; status?: SupabaseMilestone["status"] }
  ): Promise<void>;

  deleteMilestone(milestoneId: string): Promise<void>;

  getAllMilestoneIds(workspaceId: string): Promise<string[]>;

  deleteAllMilestones(ids: string[]): Promise<void>;
}
