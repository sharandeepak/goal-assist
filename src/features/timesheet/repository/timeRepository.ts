import type { SupabaseTimeEntry, SupabaseTimeEntryInsert, SupabaseTimeEntryUpdate } from "@/common/types";

export interface TimeRepository {
  subscribeToEntriesByDateRange(
    userId: string,
    workspaceId: string,
    startDay: string,
    endDay: string,
    callback: (entries: SupabaseTimeEntry[]) => void
  ): () => void;

  subscribeToRunningEntry(
    userId: string,
    workspaceId: string,
    callback: (entry: SupabaseTimeEntry | null) => void
  ): () => void;

  addEntry(entry: SupabaseTimeEntryInsert): Promise<SupabaseTimeEntry>;

  updateEntry(entryId: string, fields: SupabaseTimeEntryUpdate): Promise<void>;

  deleteEntry(entryId: string): Promise<void>;

  getEntryById(entryId: string, workspaceId: string): Promise<SupabaseTimeEntry | null>;

  getEntriesForDateRange(
    userId: string,
    workspaceId: string,
    startDay: string,
    endDay: string
  ): Promise<SupabaseTimeEntry[]>;

  getRunningEntry(userId: string, workspaceId: string): Promise<SupabaseTimeEntry | null>;
}
