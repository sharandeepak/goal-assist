import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type {
  SupabaseMilestone,
  SupabaseMilestoneInsert,
  SupabaseMilestoneUpdate,
} from "@/common/types";
import type {
  MilestoneRepository,
  MilestonePageSummaryData,
} from "./milestoneRepository";
import { AppError } from "@/common/errors/AppError";
import { startOfDay, endOfDay, differenceInDays } from "date-fns";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseMilestoneRepository
  extends BaseRepository<"milestones">
  implements MilestoneRepository
{
  constructor() {
    super("milestones", getClient);
  }

  subscribeToMilestonesByStatus(
    workspaceId: string,
    status: SupabaseMilestone["status"],
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", status)
          .order("end_date", { ascending: true });

        if (error) throw error;
        callback((data ?? []) as SupabaseMilestone[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  subscribeToActiveMilestonesProgress(
    workspaceId: string,
    callback: (milestones: SupabaseMilestone[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .order("end_date", { ascending: true });

        if (error) throw error;
        callback((data ?? []) as SupabaseMilestone[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  async getPageMilestoneSummary(workspaceId: string): Promise<MilestonePageSummaryData> {
    try {
      const { data: rows, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("end_date", { ascending: true });

      if (error) throw error;

      const milestones = (rows ?? []) as SupabaseMilestone[];
      const now = new Date();
      let nextDeadlineDays: number | null = null;

      const topUpcoming = milestones.slice(0, 3).map((m) => {
        const daysLeft = m.end_date
          ? differenceInDays(new Date(m.end_date), now)
          : undefined;

        if (
          daysLeft !== undefined &&
          (nextDeadlineDays === null || daysLeft < nextDeadlineDays)
        ) {
          nextDeadlineDays = daysLeft;
        }

        return {
          id: m.id,
          title: m.title,
          urgency: m.urgency,
          daysLeft,
        };
      });

      return {
        activeCount: milestones.length,
        nextDeadlineDays,
        topUpcoming,
      };
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_SUMMARY_ERROR",
        "Failed to fetch milestone summary."
      );
    }
  }

  async getNextActiveMilestone(workspaceId: string, date: Date): Promise<SupabaseMilestone | null> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .gte("end_date", date.toISOString())
        .order("end_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as SupabaseMilestone | null;
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_NEXT_ACTIVE_ERROR",
        "Failed to fetch next active milestone."
      );
    }
  }

  async getUpcomingActiveMilestones(
    workspaceId: string,
    count: number
  ): Promise<SupabaseMilestone[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("end_date", { ascending: true })
        .limit(count);

      if (error) throw error;
      return (data ?? []) as SupabaseMilestone[];
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_UPCOMING_ERROR",
        "Failed to fetch upcoming active milestones."
      );
    }
  }

  async getMilestonesEndingOnDate(
    workspaceId: string,
    date: Date
  ): Promise<SupabaseMilestone[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("end_date", startOfDay(date).toISOString())
        .lte("end_date", endOfDay(date).toISOString());

      if (error) throw error;
      return (data ?? []) as SupabaseMilestone[];
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_ENDING_ON_DATE_ERROR",
        "Failed to fetch milestones ending on date."
      );
    }
  }

  async getMilestoneById(
    workspaceId: string,
    milestoneId: string
  ): Promise<SupabaseMilestone | null> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", milestoneId)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as SupabaseMilestone | null;
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_FIND_BY_ID_ERROR",
        "Failed to fetch milestone by ID."
      );
    }
  }

  async addMilestone(
    milestoneData: SupabaseMilestoneInsert
  ): Promise<SupabaseMilestone> {
    try {
      const { data, error } = await this.table
        .insert(milestoneData)
        .select()
        .single();

      if (error) throw error;
      return data as SupabaseMilestone;
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_CREATE_ERROR",
        "Failed to create milestone."
      );
    }
  }

  async updateMilestone(
    milestoneId: string,
    dataToUpdate: SupabaseMilestoneUpdate
  ): Promise<void> {
    try {
      const { data, error } = await this.table
        .update(dataToUpdate)
        .eq("id", milestoneId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw AppError.notFound(
          "MILESTONE_NOT_FOUND",
          `Milestone ${milestoneId} not found.`
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "MILESTONE_UPDATE_ERROR",
        "Failed to update milestone."
      );
    }
  }

  async updateMilestoneProgress(
    milestoneId: string,
    progressData: {
      progress: number;
      status?: SupabaseMilestone["status"];
    }
  ): Promise<void> {
    try {
      const { data, error } = await this.table
        .update(progressData)
        .eq("id", milestoneId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw AppError.notFound(
          "MILESTONE_NOT_FOUND",
          `Milestone ${milestoneId} not found.`
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "MILESTONE_PROGRESS_ERROR",
        "Failed to update milestone progress."
      );
    }
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    try {
      const { data, error } = await this.table
        .delete()
        .eq("id", milestoneId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw AppError.notFound(
          "MILESTONE_NOT_FOUND",
          `Milestone ${milestoneId} not found.`
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "MILESTONE_DELETE_ERROR",
        "Failed to delete milestone."
      );
    }
  }

  async getAllMilestoneIds(workspaceId: string): Promise<string[]> {
    try {
      const { data, error } = await this.table
        .select("id")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      return (data ?? []).map((row) => row.id);
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_FETCH_IDS_ERROR",
        "Failed to fetch milestone IDs."
      );
    }
  }

  async deleteAllMilestones(ids: string[]): Promise<void> {
    try {
      if (ids.length === 0) return;
      const { error } = await this.table.delete().in("id", ids);

      if (error) throw error;
    } catch (error) {
      throw AppError.internal(
        "MILESTONE_DELETE_ALL_ERROR",
        "Failed to delete all milestones."
      );
    }
  }
}

export const supabaseMilestoneRepository = new SupabaseMilestoneRepository();
