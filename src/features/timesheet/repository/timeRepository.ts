import { TimeEntry } from "@/common/types";

/**
 * Repository interface for time entries.
 * Abstracts all Firestore/DB operations for the timesheet feature.
 */
export interface TimeRepository {
	subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): () => void;

	subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): () => void;

	/** Add a new time entry. Returns the document ID. */
	addEntry(entry: Omit<TimeEntry, "id">): Promise<string>;

	/** Update an existing time entry. */
	updateEntry(entryId: string, fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">>): Promise<void>;

	/** Delete a time entry. */
	deleteEntry(entryId: string): Promise<void>;

	/** Get a single time entry by ID. */
	getEntryById(entryId: string): Promise<TimeEntry | null>;

	/** Get entries within a date range (YYYY-MM-DD). */
	getEntriesForDateRange(userId: string, startDay: string, endDay: string): Promise<TimeEntry[]>;

	/** Get the currently running timer entry for a user, if any. */
	getRunningEntry(userId: string): Promise<TimeEntry | null>;
}
