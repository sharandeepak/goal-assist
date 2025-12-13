import { SatisfactionLog, SatisfactionSummary } from "@/types";
import { Unsubscribe, Timestamp } from "firebase/firestore";

export interface SatisfactionEntry {
	id?: string;
	date: Date | Timestamp;
	mood: "happy" | "cool" | "angry" | "okay";
	score: number;
}

export interface ISatisfactionRepository {
  subscribeToSatisfactionLogs(
    callback: (logs: SatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  getSatisfactionSummary(): Promise<{ currentScore: number | null; change: number | null }>;

  addSatisfactionLog(logData: Omit<SatisfactionLog, "id">): Promise<string>;

  deleteAllUserSatisfactionLogs(): Promise<void>;

  subscribeToSatisfactionForMonth(
    year: number,
    month: number,
    callback: (entries: SatisfactionEntry[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  saveSatisfactionEntry(entryData: Omit<SatisfactionEntry, "id">): Promise<string>;
}
