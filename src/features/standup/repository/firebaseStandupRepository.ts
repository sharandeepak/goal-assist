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
import type { StandupRepository } from "./standupRepository";

export class FirebaseStandupRepository implements StandupRepository {
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

	async addStandupLog(logData: Omit<StandupLog, "id">): Promise<string> {
		const logsCollection = collection(db, "standup_logs");
		const dataToAdd = {
			...logData,
			date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
			notes: logData.notes ?? "",
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
