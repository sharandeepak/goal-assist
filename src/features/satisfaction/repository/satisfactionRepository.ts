import type { SatisfactionLog, SatisfactionSummary } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";

export interface SatisfactionEntry {
	id?: string;
	date: Date | import("firebase/firestore").Timestamp;
	mood: "happy" | "cool" | "angry" | "okay";
	score: number;
}

export interface SatisfactionRepository {
	subscribeToRecentLogs(
		limit: number,
		callback: (logs: SatisfactionLog[]) => void,
		onError: (error: Error) => void
	): Unsubscribe;

	subscribeToLogsForMonth(
		year: number,
		month: number,
		callback: (entries: SatisfactionEntry[]) => void,
		onError: (error: Error) => void
	): Unsubscribe;

	addSatisfactionEntry(logData: Omit<SatisfactionLog, "id">): Promise<string>;

	saveSatisfactionEntry(entryData: Omit<SatisfactionEntry, "id">): Promise<string>;

	getSatisfactionSummary(): Promise<SatisfactionSummary>;

	deleteAllSatisfactionLogs(): Promise<void>;
}
