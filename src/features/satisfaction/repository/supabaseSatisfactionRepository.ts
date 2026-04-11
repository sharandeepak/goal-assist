import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type { SupabaseSatisfactionLog, SupabaseSatisfactionLogInsert } from "@/common/types";
import type { SatisfactionRepository } from "./satisfactionRepository";
import { AppError } from "@/common/errors/AppError";
import { format, subDays } from "date-fns";

type SatisfactionRow = Database["public"]["Tables"]["satisfaction_logs"]["Row"];

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseSatisfactionRepository extends BaseRepository<"satisfaction_logs"> implements SatisfactionRepository {
  constructor() {
    super("satisfaction_logs", getClient);
  }

  subscribeToRecentLogs(
    workspaceId: string,
    limit: number,
    callback: (logs: SupabaseSatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("log_date", { ascending: false })
          .limit(limit);
        if (error) throw AppError.internal("SATISFACTION_FETCH_ERROR", error.message);
        callback((data ?? []) as SupabaseSatisfactionLog[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  subscribeToLogsForMonth(
    workspaceId: string,
    year: number,
    month: number,
    callback: (logs: SupabaseSatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("workspace_id", workspaceId)
          .gte("log_date", startDate)
          .lt("log_date", endDate)
          .order("log_date", { ascending: true });
        if (error) throw AppError.internal("SATISFACTION_FETCH_ERROR", error.message);
        callback((data ?? []) as SupabaseSatisfactionLog[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  async addSatisfactionEntry(logData: SupabaseSatisfactionLogInsert): Promise<SupabaseSatisfactionLog> {
    try {
      const { data, error } = await this.table.insert(logData as never).select().single();
      if (error) throw AppError.internal("SATISFACTION_CREATE_ERROR", "Failed to add satisfaction entry.");
      return data as SupabaseSatisfactionLog;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("SATISFACTION_CREATE_ERROR", "Failed to add satisfaction entry.");
    }
  }

  async saveSatisfactionEntry(logData: SupabaseSatisfactionLogInsert): Promise<SupabaseSatisfactionLog> {
    try {
      const { data: existing, error: findError } = await this.table
        .select("*")
        .eq("workspace_id", logData.workspace_id)
        .eq("user_id", logData.user_id)
        .eq("log_date", logData.log_date)
        .maybeSingle();
      if (findError) throw AppError.internal("SATISFACTION_SAVE_ERROR", "Failed to save satisfaction entry.");
      if (existing) {
        const row = existing as SatisfactionRow;
        const { data: updated, error: updateError } = await this.table
          .update({ score: logData.score, notes: logData.notes ?? null } as never)
          .eq("id", row.id)
          .select()
          .single();
        if (updateError) throw AppError.internal("SATISFACTION_SAVE_ERROR", "Failed to save satisfaction entry.");
        return updated as SupabaseSatisfactionLog;
      }
      const { data: inserted, error: insertError } = await this.table.insert(logData as never).select().single();
      if (insertError) throw AppError.internal("SATISFACTION_SAVE_ERROR", "Failed to save satisfaction entry.");
      return inserted as SupabaseSatisfactionLog;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("SATISFACTION_SAVE_ERROR", "Failed to save satisfaction entry.");
    }
  }

  async getSatisfactionSummary(workspaceId: string): Promise<{
    currentScore: number | null;
    change: number | null;
  }> {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

      const [todayResult, yesterdayResult] = await Promise.all([
        this.table.select("score").eq("workspace_id", workspaceId).eq("log_date", today).maybeSingle(),
        this.table.select("score").eq("workspace_id", workspaceId).eq("log_date", yesterday).maybeSingle(),
      ]);

      if (todayResult.error) throw AppError.internal("SATISFACTION_SUMMARY_ERROR", "Failed to fetch satisfaction summary.");
      if (yesterdayResult.error) throw AppError.internal("SATISFACTION_SUMMARY_ERROR", "Failed to fetch satisfaction summary.");

      const currentScore = (todayResult.data as SatisfactionRow | null)?.score ?? null;
      const previousScore = (yesterdayResult.data as SatisfactionRow | null)?.score ?? null;

      return {
        currentScore,
        change: currentScore !== null && previousScore !== null ? currentScore - previousScore : null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("SATISFACTION_SUMMARY_ERROR", "Failed to fetch satisfaction summary.");
    }
  }

  async deleteAllSatisfactionLogs(): Promise<void> {
    try {
      const { error } = await this.table.delete().neq("id", "");
      if (error) throw AppError.internal("SATISFACTION_DELETE_ALL_ERROR", "Failed to delete all satisfaction logs.");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("SATISFACTION_DELETE_ALL_ERROR", "Failed to delete all satisfaction logs.");
    }
  }
}

export const supabaseSatisfactionRepository = new SupabaseSatisfactionRepository();
