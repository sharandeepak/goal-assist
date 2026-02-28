import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { TimeEntry } from "@/common/types";
import { createFirebaseTimeRepository } from "../repository/firebaseTimeRepository";

const MOCK_USER_ID = "demo-user"; // Replace with actual auth

const repo = createFirebaseTimeRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions (delegate to repository)
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): () => void {
	return repo.subscribeToEntriesByDateRange(userId, startDay, endDay, callback);
}

export function subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): () => void {
	return repo.subscribeToRunningEntry(userId, callback);
}

// ─────────────────────────────────────────────────────────────────────────────
// Timer Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a timer for a task or ad-hoc entry.
 * Only one timer can run at a time per user.
 */
export async function startTimer(params: { userId: string; taskId?: string; taskTitle: string; emoji?: string; milestoneId?: string; tags?: string[]; note?: string }): Promise<string> {
	const { userId, taskId, taskTitle, emoji, milestoneId, tags, note } = params;

	// Stop any running timer first (one-timer-per-user rule)
	await stopRunningTimer(userId);

	const now = new Date();
	const dayStr = format(now, "yyyy-MM-dd");

	const entry: Omit<TimeEntry, "id"> = {
		userId,
		taskId: taskId || null,
		taskTitleSnapshot: taskTitle,
		emoji: emoji || null,
		milestoneIdSnapshot: milestoneId || null,
		tagsSnapshot: tags || [],
		note: note || null,
		source: "timer",
		startedAt: Timestamp.fromDate(now),
		endedAt: null,
		durationSec: 0,
		day: dayStr,
		createdAt: Timestamp.now(),
		updatedAt: Timestamp.now(),
	};

	return repo.addEntry(entry);
}

/**
 * Stop the currently running timer for a user.
 */
export async function stopRunningTimer(userId: string): Promise<TimeEntry | null> {
	const running = await repo.getRunningEntry(userId);
	if (!running) return null;

	const now = new Date();
	const startDate = running.startedAt?.toDate() ?? running.createdAt.toDate();
	const durationSec = Math.floor((now.getTime() - startDate.getTime()) / 1000);

	await repo.updateEntry(running.id, {
		endedAt: Timestamp.fromDate(now),
		durationSec,
	});

	return {
		...running,
		endedAt: Timestamp.fromDate(now),
		durationSec,
		updatedAt: Timestamp.now(),
	};
}

/**
 * Get the currently running timer entry for a user (if any).
 */
export async function getRunningEntry(userId: string): Promise<TimeEntry | null> {
	return repo.getRunningEntry(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Entry Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a manual time entry (duration-based or time-based).
 */
export async function logManualEntry(params: {
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
}): Promise<string> {
	const { userId, day, taskId, adHocTitle, emoji, milestoneId, tags, note, durationSec, startedAt, endedAt } = params;

	if (!adHocTitle && !taskId) {
		throw new Error("Either adHocTitle or taskId must be provided");
	}

	let finalStartedAt: Timestamp | null;
	let finalEndedAt: Timestamp | null;
	let finalDurationSec: number;

	if (startedAt && endedAt) {
		finalStartedAt = Timestamp.fromDate(startedAt);
		finalEndedAt = Timestamp.fromDate(endedAt);
		finalDurationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
	} else if (durationSec !== undefined) {
		finalStartedAt = null;
		finalEndedAt = null;
		finalDurationSec = durationSec;
	} else {
		throw new Error("Either durationSec or (startedAt and endedAt) must be provided");
	}

	const entry: Omit<TimeEntry, "id"> = {
		userId,
		taskId: taskId || null,
		taskTitleSnapshot: adHocTitle || "Untitled Task",
		emoji: emoji || null,
		milestoneIdSnapshot: milestoneId || null,
		tagsSnapshot: tags || [],
		note: note || null,
		source: "manual",
		startedAt: finalStartedAt,
		endedAt: finalEndedAt,
		durationSec: finalDurationSec,
		day,
		createdAt: Timestamp.now(),
		updatedAt: Timestamp.now(),
	};

	return repo.addEntry(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update an existing time entry.
 */
export async function updateEntry(params: { entryId: string; fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">> }): Promise<void> {
	const { entryId, fields } = params;

	// Recalculate duration if start/end times are updated
	if (fields.startedAt || fields.endedAt) {
		const entry = await repo.getEntryById(entryId);
		if (!entry) throw new Error("Entry not found");

		const newStart = fields.startedAt?.toDate() || entry.startedAt?.toDate();
		const newEnd = fields.endedAt?.toDate() || entry.endedAt?.toDate();

		if (newStart && newEnd) {
			(fields as Record<string, unknown>).durationSec = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
		}

		if (fields.startedAt && newStart) {
			(fields as Record<string, unknown>).day = format(newStart, "yyyy-MM-dd");
		}
	}

	await repo.updateEntry(entryId, fields);
}

/**
 * Delete a time entry.
 */
export async function deleteEntry(entryId: string): Promise<void> {
	await repo.deleteEntry(entryId);
}

/**
 * Get a single time entry by ID.
 */
export async function getEntryById(entryId: string): Promise<TimeEntry | null> {
	return repo.getEntryById(entryId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all time entries for a user within a date range.
 */
export async function getEntriesForDateRange(userId: string, startDay: string, endDay: string): Promise<TimeEntry[]> {
	return repo.getEntriesForDateRange(userId, startDay, endDay);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary & Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get weekly summary for a user.
 */
export async function getWeeklySummary(userId: string, weekStart: string, weekEnd: string) {
	const entries = await repo.getEntriesForDateRange(userId, weekStart, weekEnd);

	const totalSeconds = entries.reduce((sum, e) => sum + e.durationSec, 0);
	const taskBreakdown = entries.reduce(
		(acc, e) => {
			const key = e.taskTitleSnapshot;
			acc[key] = (acc[key] || 0) + e.durationSec;
			return acc;
		},
		{} as Record<string, number>
	);

	return {
		totalSeconds,
		taskBreakdown,
		entryCount: entries.length,
	};
}

export { MOCK_USER_ID };
