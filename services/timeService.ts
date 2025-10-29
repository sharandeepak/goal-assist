import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, getDocs, getDoc, onSnapshot, Timestamp, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeEntry } from "@/types";
import { format } from "date-fns";

const TIME_ENTRIES_COLLECTION = "timeEntries";
const MOCK_USER_ID = "demo-user"; // Replace with actual auth

// ─────────────────────────────────────────────────────────────────────────────
// Timer Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a timer for a task or ad-hoc entry.
 * Only one timer can run at a time per user.
 */
export async function startTimer(params: { userId: string; taskId?: string; taskTitle: string; milestoneId?: string; tags?: string[]; note?: string }): Promise<string> {
	const { userId, taskId, taskTitle, milestoneId, tags, note } = params;

	// Stop any running timer first
	await stopRunningTimer(userId);

	const now = new Date();
	const dayStr = format(now, "yyyy-MM-dd");

	const entry: Omit<TimeEntry, "id"> = {
		userId,
		taskId: taskId || null,
		taskTitleSnapshot: taskTitle,
		milestoneIdSnapshot: milestoneId || null,
		tagsSnapshot: tags || [],
		note: note || null,
		source: "timer",
		startedAt: Timestamp.fromDate(now),
		endedAt: null, // null = running
		durationSec: 0,
		day: dayStr,
		createdAt: Timestamp.now(),
		updatedAt: Timestamp.now(),
	};

	const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), entry);
	return docRef.id;
}

/**
 * Stop the currently running timer for a user.
 */
export async function stopRunningTimer(userId: string): Promise<TimeEntry | null> {
	const running = await getRunningEntry(userId);
	if (!running) return null;

	const now = new Date();
	const startDate = running.startedAt.toDate();
	const durationSec = Math.floor((now.getTime() - startDate.getTime()) / 1000);

	await updateDoc(doc(db, TIME_ENTRIES_COLLECTION, running.id), {
		endedAt: Timestamp.fromDate(now),
		durationSec,
		updatedAt: Timestamp.now(),
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
	const q = query(collection(db, TIME_ENTRIES_COLLECTION), where("userId", "==", userId), where("endedAt", "==", null));

	const snapshot = await getDocs(q);
	if (snapshot.empty) return null;

	const doc = snapshot.docs[0];
	return { id: doc.id, ...doc.data() } as TimeEntry;
}

/**
 * Subscribe to the running timer entry for real-time updates.
 */
export function subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): () => void {
	const q = query(collection(db, TIME_ENTRIES_COLLECTION), where("userId", "==", userId), where("endedAt", "==", null));

	return onSnapshot(q, (snapshot) => {
		if (snapshot.empty) {
			callback(null);
		} else {
			const doc = snapshot.docs[0];
			callback({ id: doc.id, ...doc.data() } as TimeEntry);
		}
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Entry Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a manual time entry (duration-based or time-based).
 */
export async function logManualEntry(params: {
	userId: string;
	day: string; // YYYY-MM-DD
	taskId?: string;
	adHocTitle?: string;
	milestoneId?: string;
	tags?: string[];
	note?: string;
	durationSec?: number; // For duration-based entry
	startedAt?: Date; // For time-based entry
	endedAt?: Date; // For time-based entry
}): Promise<string> {
	const { userId, day, taskId, adHocTitle, milestoneId, tags, note, durationSec, startedAt, endedAt } = params;

	if (!adHocTitle && !taskId) {
		throw new Error("Either adHocTitle or taskId must be provided");
	}

	let finalStartedAt: Date;
	let finalEndedAt: Date;
	let finalDurationSec: number;

	if (startedAt && endedAt) {
		// Time-based entry
		finalStartedAt = startedAt;
		finalEndedAt = endedAt;
		finalDurationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
	} else if (durationSec !== undefined) {
		// Duration-based entry - set start to beginning of day, end = start + duration
		const dayDate = new Date(day + "T00:00:00");
		finalStartedAt = dayDate;
		finalEndedAt = new Date(dayDate.getTime() + durationSec * 1000);
		finalDurationSec = durationSec;
	} else {
		throw new Error("Either durationSec or (startedAt and endedAt) must be provided");
	}

	const entry: Omit<TimeEntry, "id"> = {
		userId,
		taskId: taskId || null,
		taskTitleSnapshot: adHocTitle || "Untitled Task",
		milestoneIdSnapshot: milestoneId || null,
		tagsSnapshot: tags || [],
		note: note || null,
		source: "manual",
		startedAt: Timestamp.fromDate(finalStartedAt),
		endedAt: Timestamp.fromDate(finalEndedAt),
		durationSec: finalDurationSec,
		day,
		createdAt: Timestamp.now(),
		updatedAt: Timestamp.now(),
	};

	const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), entry);
	return docRef.id;
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
		const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
		const docSnap = await getDoc(docRef);
		if (!docSnap.exists()) throw new Error("Entry not found");

		const entry = { id: docSnap.id, ...docSnap.data() } as TimeEntry;
		const newStart = fields.startedAt?.toDate() || entry.startedAt.toDate();
		const newEnd = fields.endedAt?.toDate() || entry.endedAt?.toDate();

		if (newEnd) {
			fields.durationSec = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
		}

		// Update day if startedAt changed
		if (fields.startedAt) {
			fields.day = format(newStart, "yyyy-MM-dd");
		}
	}

	await updateDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId), {
		...fields,
		updatedAt: Timestamp.now(),
	});
}

/**
 * Delete a time entry.
 */
export async function deleteEntry(entryId: string): Promise<void> {
	await deleteDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
}

/**
 * Get a single time entry by ID.
 */
export async function getEntryById(entryId: string): Promise<TimeEntry | null> {
	const docSnap = await getDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
	if (!docSnap.exists()) return null;
	return { id: docSnap.id, ...docSnap.data() } as TimeEntry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all time entries for a user within a date range.
 */
export async function getEntriesForDateRange(
	userId: string,
	startDay: string, // YYYY-MM-DD
	endDay: string // YYYY-MM-DD
): Promise<TimeEntry[]> {
	const q = query(collection(db, TIME_ENTRIES_COLLECTION), where("userId", "==", userId), where("day", ">=", startDay), where("day", "<=", endDay), orderBy("day", "asc"), orderBy("startedAt", "asc"));

	const snapshot = await getDocs(q);
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimeEntry));
}

/**
 * Subscribe to time entries for a date range (real-time).
 */
export function subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): () => void {
	const q = query(collection(db, TIME_ENTRIES_COLLECTION), where("userId", "==", userId), where("day", ">=", startDay), where("day", "<=", endDay), orderBy("day", "asc"), orderBy("startedAt", "asc"));

	return onSnapshot(q, (snapshot) => {
		const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimeEntry));
		callback(entries);
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary & Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get weekly summary for a user.
 */
export async function getWeeklySummary(userId: string, weekStart: string, weekEnd: string) {
	const entries = await getEntriesForDateRange(userId, weekStart, weekEnd);

	const totalSeconds = entries.reduce((sum, e) => sum + e.durationSec, 0);
	const taskBreakdown = entries.reduce((acc, e) => {
		const key = e.taskTitleSnapshot;
		acc[key] = (acc[key] || 0) + e.durationSec;
		return acc;
	}, {} as Record<string, number>);

	return {
		totalSeconds,
		taskBreakdown,
		entryCount: entries.length,
	};
}

export { MOCK_USER_ID };
