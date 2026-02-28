import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, getDocs, getDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/common/lib/db";
import { TimeEntry } from "@/common/types";
import type { TimeRepository } from "./timeRepository";

const TIME_ENTRIES_COLLECTION = "timeEntries";

export function createFirebaseTimeRepository(): TimeRepository {
	return {
		subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): () => void {
			const q = query(
				collection(db, TIME_ENTRIES_COLLECTION),
				where("userId", "==", userId),
				where("day", ">=", startDay),
				where("day", "<=", endDay),
				orderBy("day", "asc"),
				orderBy("startedAt", "asc")
			);
			return onSnapshot(q, (snapshot) => {
				const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TimeEntry));
				callback(entries);
			});
		},

		subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): () => void {
			const q = query(
				collection(db, TIME_ENTRIES_COLLECTION),
				where("userId", "==", userId),
				where("source", "==", "timer"),
				where("endedAt", "==", null)
			);
			return onSnapshot(q, (snapshot) => {
				if (snapshot.empty) {
					callback(null);
				} else {
					const d = snapshot.docs[0];
					callback({ id: d.id, ...d.data() } as TimeEntry);
				}
			});
		},

		async addEntry(entry: Omit<TimeEntry, "id">): Promise<string> {
			const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), entry);
			return docRef.id;
		},

		async updateEntry(entryId: string, fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">>): Promise<void> {
			await updateDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId), {
				...fields,
				updatedAt: Timestamp.now(),
			});
		},

		async deleteEntry(entryId: string): Promise<void> {
			await deleteDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
		},

		async getEntryById(entryId: string): Promise<TimeEntry | null> {
			const docSnap = await getDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
			if (!docSnap.exists()) return null;
			return { id: docSnap.id, ...docSnap.data() } as TimeEntry;
		},

		async getEntriesForDateRange(userId: string, startDay: string, endDay: string): Promise<TimeEntry[]> {
			const q = query(
				collection(db, TIME_ENTRIES_COLLECTION),
				where("userId", "==", userId),
				where("day", ">=", startDay),
				where("day", "<=", endDay),
				orderBy("day", "asc"),
				orderBy("startedAt", "asc")
			);
			const snapshot = await getDocs(q);
			return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TimeEntry));
		},

		async getRunningEntry(userId: string): Promise<TimeEntry | null> {
			const q = query(
				collection(db, TIME_ENTRIES_COLLECTION),
				where("userId", "==", userId),
				where("endedAt", "==", null)
			);
			const snapshot = await getDocs(q);
			if (snapshot.empty) return null;
			const d = snapshot.docs[0];
			return { id: d.id, ...d.data() } as TimeEntry;
		},
	};
}
