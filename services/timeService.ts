// timeService.ts
import { Unsubscribe } from "firebase/firestore";
import { TimeEntry } from "@/types";
import { timeEntryRepository } from "@/repositories";

export const MOCK_USER_ID = "demo-user";

export async function startTimer(params: { userId: string; taskId?: string; taskTitle: string; emoji?: string; milestoneId?: string; tags?: string[]; note?: string }): Promise<string> {
	return timeEntryRepository.startTimer(params);
}

export async function stopRunningTimer(userId: string): Promise<TimeEntry | null> {
	return timeEntryRepository.stopRunningTimer(userId);
}

export async function getRunningEntry(userId: string): Promise<TimeEntry | null> {
	return timeEntryRepository.getRunningEntry(userId);
}

export function subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): Unsubscribe {
	return timeEntryRepository.subscribeToRunningEntry(userId, callback);
}

export async function logManualEntry(params: {
	userId: string;
	day: string; // YYYY-MM-DD
	taskId?: string;
	adHocTitle?: string;
	emoji?: string;
	milestoneId?: string;
	tags?: string[];
	note?: string;
	durationSec?: number; // For duration-based entry
	startedAt?: Date; // For time-based entry
	endedAt?: Date; // For time-based entry
}): Promise<string> {
	if (!params.adHocTitle && !params.taskId) {
		throw new Error("Either adHocTitle or taskId must be provided");
	}
    return timeEntryRepository.logManualEntry(params);
}

export async function updateEntry(params: { entryId: string; fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">> }): Promise<void> {
    return timeEntryRepository.updateEntry(params);
}

export async function deleteEntry(entryId: string): Promise<void> {
	return timeEntryRepository.deleteEntry(entryId);
}

export async function getEntryById(entryId: string): Promise<TimeEntry | null> {
	return timeEntryRepository.getEntryById(entryId);
}

export async function getEntriesForDateRange(
	userId: string,
	startDay: string, // YYYY-MM-DD
	endDay: string // YYYY-MM-DD
): Promise<TimeEntry[]> {
	return timeEntryRepository.getEntriesForDateRange(userId, startDay, endDay);
}

export function subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): Unsubscribe {
	return timeEntryRepository.subscribeToEntriesByDateRange(userId, startDay, endDay, callback);
}

export async function getWeeklySummary(userId: string, weekStart: string, weekEnd: string) {
	return timeEntryRepository.getWeeklySummary(userId, weekStart, weekEnd);
}
