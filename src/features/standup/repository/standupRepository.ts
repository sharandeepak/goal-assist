import type { StandupLog } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";

export interface StandupRepository {
	subscribeToRecentStandups(
		limit: number,
		callback: (logs: StandupLog[]) => void,
		onError: (error: Error) => void
	): Unsubscribe;
	addStandupLog(logData: Omit<StandupLog, "id">): Promise<string>;
	deleteAllStandupLogs(): Promise<void>;
}
