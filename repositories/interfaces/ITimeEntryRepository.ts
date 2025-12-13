import { TimeEntry } from "@/types";
import { Unsubscribe } from "firebase/firestore";

export interface ITimeEntryRepository {
  startTimer(params: {
    userId: string;
    taskId?: string;
    taskTitle: string;
    emoji?: string;
    milestoneId?: string;
    tags?: string[];
    note?: string;
  }): Promise<string>;

  stopRunningTimer(userId: string): Promise<TimeEntry | null>;

  getRunningEntry(userId: string): Promise<TimeEntry | null>;

  subscribeToRunningEntry(
    userId: string,
    callback: (entry: TimeEntry | null) => void
  ): Unsubscribe;

  logManualEntry(params: {
    userId: string;
    day: string;
    taskId?: string;
    adHocTitle?: string;
    emoji?: string;
    milestoneId?: string;
    tags?: string[];
    note?: string;
    durationSec?: number;
    startedAt?: Date;
    endedAt?: Date;
  }): Promise<string>;

  updateEntry(params: {
    entryId: string;
    fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">>;
  }): Promise<void>;

  deleteEntry(entryId: string): Promise<void>;

  getEntryById(entryId: string): Promise<TimeEntry | null>;

  getEntriesForDateRange(
    userId: string,
    startDay: string,
    endDay: string
  ): Promise<TimeEntry[]>;

  subscribeToEntriesByDateRange(
    userId: string,
    startDay: string,
    endDay: string,
    callback: (entries: TimeEntry[]) => void
  ): Unsubscribe;

  getWeeklySummary(
    userId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<{
    totalSeconds: number;
    taskBreakdown: Record<string, number>;
    entryCount: number;
  }>;
}
