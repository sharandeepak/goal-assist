import type { SupabaseTimeEntry, SupabaseTimeEntryInsert, SupabaseTimeEntryUpdate } from "@/common/types";

export interface TimeRepository {
  subscribeToEntriesByDateRange(
    employeeId: string,
    startDay: string,
    endDay: string,
    callback: (entries: SupabaseTimeEntry[]) => void
  ): () => void;

  subscribeToRunningEntry(
    employeeId: string,
    callback: (entry: SupabaseTimeEntry | null) => void
  ): () => void;

  addEntry(entry: SupabaseTimeEntryInsert): Promise<SupabaseTimeEntry>;

  updateEntry(entryId: string, fields: SupabaseTimeEntryUpdate): Promise<void>;

  deleteEntry(entryId: string): Promise<void>;

  getEntryById(entryId: string): Promise<SupabaseTimeEntry | null>;

  getEntriesForDateRange(
    employeeId: string,
    startDay: string,
    endDay: string
  ): Promise<SupabaseTimeEntry[]>;

  getRunningEntry(employeeId: string): Promise<SupabaseTimeEntry | null>;
}
