import type { SupabaseTimeEntry, SupabaseTimeEntryInsert, SupabaseTimeEntryUpdate } from "@/common/types";

export interface TimeRepository {
  subscribeToEntriesByDateRange(
    userId: string,
    startDay: string,
    endDay: string,
    callback: (entries: SupabaseTimeEntry[]) => void
  ): () => void;

  subscribeToRunningEntry(
    userId: string,
    callback: (entry: SupabaseTimeEntry | null) => void
  ): () => void;

  addEntry(entry: SupabaseTimeEntryInsert): Promise<SupabaseTimeEntry>;

  updateEntry(entryId: string, fields: SupabaseTimeEntryUpdate): Promise<void>;

  deleteEntry(entryId: string): Promise<void>;

  getEntryById(entryId: string): Promise<SupabaseTimeEntry | null>;

  getEntriesForDateRange(
    userId: string,
    startDay: string,
    endDay: string
  ): Promise<SupabaseTimeEntry[]>;

  getRunningEntry(userId: string): Promise<SupabaseTimeEntry | null>;
}
