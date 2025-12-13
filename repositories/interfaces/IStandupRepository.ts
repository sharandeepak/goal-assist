import { StandupLog } from "@/types";
import { Unsubscribe } from "firebase/firestore";

export interface IStandupRepository {
  subscribeToRecentStandups(
    callback: (logs: StandupLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  addStandupLog(logData: Omit<StandupLog, "id">): Promise<string>;

  deleteAllUserStandupLogs(): Promise<void>;
}
