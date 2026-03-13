import { db } from "@/common/lib/db";
import {
	collection,
	query,
	orderBy,
	limit,
	onSnapshot,
	Timestamp,
	addDoc,
	getDocs,
	writeBatch,
} from "firebase/firestore";
import type { StandupLog } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";
/** @deprecated Legacy Firebase implementation — not used. Supabase is the active backend. */
export class FirebaseStandupRepository {
	subscribeToRecentStandups(
		limitCount: number,
		callback: (logs: StandupLog[]) => void,
		onError: (error: Error) => void
	): Unsubscribe {
		const logsCollection = collection(db, "standup_logs");
		const q = query(logsCollection, orderBy("date", "desc"), limit(limitCount));

		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const fetchedLogs: StandupLog[] = [];
				querySnapshot.forEach((doc) => {
					fetchedLogs.push({ id: doc.id, ...doc.data() } as StandupLog);
				});
				callback(fetchedLogs);
			},
			(error) => {
				console.error("Error fetching standup logs: ", error);
				onError(error);
			}
		);

		return unsubscribe;
	}

	async addStandupLog(logData: Record<string, unknown>): Promise<string> {
		const logsCollection = collection(db, "standup_logs");
		const rawDate = logData.date ?? logData.log_date;
		const dataToAdd = {
			...logData,
			date: rawDate instanceof Timestamp ? rawDate : Timestamp.fromDate(new Date(rawDate as string)),
			notes: (logData.notes as string) ?? "",
		};
		const docRef = await addDoc(logsCollection, dataToAdd);
		return docRef.id;
	}

	async deleteAllStandupLogs(): Promise<void> {
		console.warn("deleteAllStandupLogs called. This will delete all documents in the 'standup_logs' collection.");
		const logsCollectionRef = collection(db, "standup_logs");
		const querySnapshot = await getDocs(logsCollectionRef);
		if (querySnapshot.empty) {
			console.log("No logs found in 'standup_logs' collection to delete.");
			return;
		}
		const batch = writeBatch(db);
		querySnapshot.forEach((document) => {
			batch.delete(document.ref);
		});
		await batch.commit();
		console.log(`Successfully deleted ${querySnapshot.size} logs from 'standup_logs' collection.`);
	}
}
