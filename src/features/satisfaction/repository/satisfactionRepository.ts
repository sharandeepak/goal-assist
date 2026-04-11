import type { SupabaseSatisfactionLog, SupabaseSatisfactionLogInsert, SatisfactionSummary } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";

export interface SatisfactionEntry {
  id?: string;
  date: Date | string;
  mood: "happy" | "cool" | "angry" | "okay";
  score: number;
}

export interface SatisfactionRepository {
  subscribeToRecentLogs(
    workspaceId: string,
    limit: number,
    callback: (logs: SupabaseSatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  subscribeToLogsForMonth(
    workspaceId: string,
    year: number,
    month: number,
    callback: (logs: SupabaseSatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  addSatisfactionEntry(logData: SupabaseSatisfactionLogInsert): Promise<SupabaseSatisfactionLog>;

  saveSatisfactionEntry(entryData: SupabaseSatisfactionLogInsert): Promise<SupabaseSatisfactionLog>;

  getSatisfactionSummary(workspaceId: string): Promise<SatisfactionSummary>;

  deleteAllSatisfactionLogs(): Promise<void>;
}
