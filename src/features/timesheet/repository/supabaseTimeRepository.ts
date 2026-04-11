import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type {
  SupabaseTimeEntry,
  SupabaseTimeEntryInsert,
  SupabaseTimeEntryUpdate,
} from "@/common/types";
import type { TimeRepository } from "./timeRepository";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseTimeRepository
  extends BaseRepository<"time_entries">
  implements TimeRepository
{
  constructor() {
    super("time_entries", getClient);
  }

  subscribeToEntriesByDateRange(
    userId: string,
    workspaceId: string,
    startDay: string,
    endDay: string,
    callback: (entries: SupabaseTimeEntry[]) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("user_id", userId)
          .eq("workspace_id", workspaceId)
          .gte("day", startDay)
          .lte("day", endDay)
          .order("started_at", { ascending: false });
        if (error) throw error;
        callback((data ?? []) as SupabaseTimeEntry[]);
      } catch {
        callback([]);
      }
    };
    fetchAndCallback();
    return this.subscribe("*", () => fetchAndCallback(), `user_id=eq.${userId}`);
  }

  subscribeToRunningEntry(
    userId: string,
    workspaceId: string,
    callback: (entry: SupabaseTimeEntry | null) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("user_id", userId)
          .eq("workspace_id", workspaceId)
          .is("ended_at", null)
          .eq("source", "timer")
          .maybeSingle();
        if (error) throw error;
        callback(data as SupabaseTimeEntry | null);
      } catch {
        callback(null);
      }
    };
    fetchAndCallback();
    return this.subscribe("*", () => fetchAndCallback(), `user_id=eq.${userId}`);
  }

  async getEntriesForDateRange(
    userId: string,
    workspaceId: string,
    startDay: string,
    endDay: string
  ): Promise<SupabaseTimeEntry[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .gte("day", startDay)
        .lte("day", endDay)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupabaseTimeEntry[];
    } catch (error) {
      throw AppError.internal(
        "TIME_FETCH_RANGE_ERROR",
        "Failed to fetch time entries for date range."
      );
    }
  }

  async getRunningEntry(userId: string, workspaceId: string): Promise<SupabaseTimeEntry | null> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .is("ended_at", null)
        .eq("source", "timer")
        .maybeSingle();
      if (error) throw error;
      return data as SupabaseTimeEntry | null;
    } catch (error) {
      throw AppError.internal(
        "TIME_RUNNING_ENTRY_ERROR",
        "Failed to fetch running entry."
      );
    }
  }

  async getEntryById(entryId: string, workspaceId: string): Promise<SupabaseTimeEntry | null> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", entryId)
        .maybeSingle();
      if (error) throw error;
      return data as SupabaseTimeEntry | null;
    } catch (error) {
      throw AppError.internal(
        "TIME_FIND_BY_ID_ERROR",
        "Failed to fetch time entry."
      );
    }
  }

  async addEntry(entry: SupabaseTimeEntryInsert): Promise<SupabaseTimeEntry> {
    try {
      const { data, error } = await this.table.insert(entry as never).select().single();
      if (error) throw error;
      return data as SupabaseTimeEntry;
    } catch (error) {
      throw AppError.internal("TIME_CREATE_ERROR", "Failed to create time entry.");
    }
  }

  async updateEntry(
    entryId: string,
    fields: SupabaseTimeEntryUpdate
  ): Promise<void> {
    try {
      const { data, error } = await this.table
        .update(fields as never)
        .eq("id", entryId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw AppError.notFound(
          "TIME_ENTRY_NOT_FOUND",
          `Time entry ${entryId} not found.`
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TIME_UPDATE_ERROR", "Failed to update time entry.");
    }
  }

  async deleteEntry(entryId: string): Promise<void> {
    try {
      const { data, error } = await this.table
        .delete()
        .eq("id", entryId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw AppError.notFound(
          "TIME_ENTRY_NOT_FOUND",
          `Time entry ${entryId} not found.`
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TIME_DELETE_ERROR", "Failed to delete time entry.");
    }
  }
}

export const supabaseTimeRepository = new SupabaseTimeRepository();
