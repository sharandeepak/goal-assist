import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type { SupabaseStandupLog, SupabaseStandupLogInsert } from "@/common/types";
import type { StandupRepository } from "./standupRepository";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseStandupRepository
  extends BaseRepository<"standup_logs">
  implements StandupRepository
{
  constructor() {
    super("standup_logs", getClient);
  }

  subscribeToRecentStandups(
    limit: number,
    callback: (logs: SupabaseStandupLog[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .order("log_date", { ascending: false })
          .limit(limit);
        if (error) throw error;
        callback((data ?? []) as SupabaseStandupLog[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  async getRecentStandups(limit: number): Promise<SupabaseStandupLog[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .order("log_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as SupabaseStandupLog[];
    } catch (error) {
      throw AppError.internal(
        "STANDUP_FETCH_RECENT_ERROR",
        "Failed to fetch recent standup logs."
      );
    }
  }

  async addStandupLog(logData: SupabaseStandupLogInsert): Promise<SupabaseStandupLog> {
    try {
      const { data, error } = await this.table
        .insert(logData as never)
        .select()
        .single();
      if (error) throw error;
      return data as SupabaseStandupLog;
    } catch (error) {
      throw AppError.internal("STANDUP_CREATE_ERROR", "Failed to add standup log.");
    }
  }

  async deleteAllStandupLogs(): Promise<void> {
    try {
      const { error } = await this.table.delete().neq("id", "");
      if (error) throw error;
    } catch (error) {
      throw AppError.internal(
        "STANDUP_DELETE_ALL_ERROR",
        "Failed to delete all standup logs."
      );
    }
  }
}

export const supabaseStandupRepository = new SupabaseStandupRepository();
