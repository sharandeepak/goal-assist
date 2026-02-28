import type { SupabaseStandupLog, SupabaseStandupLogInsert } from "@/common/types";

export interface StandupRepository {
  subscribeToRecentStandups(
    limit: number,
    callback: (logs: SupabaseStandupLog[]) => void,
    onError: (error: Error) => void
  ): () => void;

  addStandupLog(logData: SupabaseStandupLogInsert): Promise<SupabaseStandupLog>;

  deleteAllStandupLogs(): Promise<void>;
}
