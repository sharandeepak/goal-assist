import { db } from "@/common/lib/db";
import {
	collection,
	query,
	orderBy,
	limit,
	onSnapshot,
	Timestamp,
	getDocs,
	addDoc,
	writeBatch,
	where,
	doc,
	updateDoc,
} from "firebase/firestore";
import type { SatisfactionLog, SatisfactionSummary } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";
import type { SatisfactionRepository, SatisfactionEntry } from "./satisfactionRepository";

const COLLECTION = "satisfaction_logs";

export class FirebaseSatisfactionRepository implements SatisfactionRepository {
	subscribeToRecentLogs(
		limitCount: number,
		callback: (logs: SatisfactionLog[]) => void,
		onError: (error: Error) => void
	): Unsubscribe {
		const logsCollection = collection(db, COLLECTION);
		const q = query(logsCollection, orderBy("date", "desc"), limit(limitCount));

		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const fetchedLogs: SatisfactionLog[] = [];
				querySnapshot.forEach((docSnap) => {
					fetchedLogs.push({ id: docSnap.id, ...docSnap.data() } as SatisfactionLog);
				});
				callback(fetchedLogs);
			},
			(error) => {
				console.error("Error fetching satisfaction logs: ", error);
				onError(error);
			}
		);

		return unsubscribe;
	}

	subscribeToLogsForMonth(
		year: number,
		month: number,
		callback: (entries: SatisfactionEntry[]) => void,
		onError: (error: Error) => void
	): Unsubscribe {
		const logsCollection = collection(db, COLLECTION);
		const startDate = new Date(year, month, 1);
		const endDate = new Date(year, month + 1, 1);

		const q = query(
			logsCollection,
			where("date", ">=", Timestamp.fromDate(startDate)),
			where("date", "<", Timestamp.fromDate(endDate))
		);

		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const fetchedEntries: SatisfactionEntry[] = [];
				querySnapshot.forEach((docSnap) => {
					const data = docSnap.data();
					fetchedEntries.push({
						id: docSnap.id,
						...data,
						date: (data.date as Timestamp).toDate(),
					} as SatisfactionEntry);
				});
				callback(fetchedEntries);
			},
			(error) => {
				console.error(`Error fetching satisfaction data for ${year}-${month + 1}: `, error);
				onError(error);
			}
		);

		return unsubscribe;
	}

	async addSatisfactionEntry(logData: Omit<SatisfactionLog, "id">): Promise<string> {
		const logsCollection = collection(db, COLLECTION);
		const dataToAdd = {
			...logData,
			date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
			notes: logData.notes ?? "",
		};
		const docRef = await addDoc(logsCollection, dataToAdd);
		return docRef.id;
	}

	async saveSatisfactionEntry(entryData: Omit<SatisfactionEntry, "id">): Promise<string> {
		const logsCollection = collection(db, COLLECTION);
		const date = entryData.date as Date;

		const dayStart = new Date(date);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(date);
		dayEnd.setHours(23, 59, 59, 999);

		const q = query(
			logsCollection,
			where("date", ">=", Timestamp.fromDate(dayStart)),
			where("date", "<=", Timestamp.fromDate(dayEnd)),
			limit(1)
		);

		const querySnapshot = await getDocs(q);
		const dataToSave = {
			...entryData,
			date: entryData.date instanceof Timestamp ? entryData.date : Timestamp.fromDate(new Date(entryData.date)),
		};

		if (!querySnapshot.empty) {
			const existingDoc = querySnapshot.docs[0];
			await updateDoc(doc(db, COLLECTION, existingDoc.id), dataToSave);
			return existingDoc.id;
		} else {
			const docRef = await addDoc(logsCollection, dataToSave);
			return docRef.id;
		}
	}

	async getSatisfactionSummary(): Promise<SatisfactionSummary> {
		const satisfactionCollection = collection(db, COLLECTION);
		const q = query(satisfactionCollection, orderBy("date", "desc"), limit(2));

		const querySnapshot = await getDocs(q);
		let currentScore: number | null = null;
		let change: number | null = null;

		if (!querySnapshot.empty) {
			const latestLog = querySnapshot.docs[0].data() as SatisfactionLog;
			currentScore = latestLog.score;

			if (querySnapshot.docs.length > 1) {
				const previousLog = querySnapshot.docs[1].data() as SatisfactionLog;
				if (typeof currentScore === "number" && typeof previousLog.score === "number") {
					change = currentScore - previousLog.score;
				}
			}
		}
		return { currentScore, change };
	}

	async deleteAllSatisfactionLogs(): Promise<void> {
		console.warn(`deleteAllSatisfactionLogs called. This will delete all documents in the '${COLLECTION}' collection.`);
		const logsCollectionRef = collection(db, COLLECTION);
		const querySnapshot = await getDocs(logsCollectionRef);
		if (querySnapshot.empty) {
			console.log(`No logs found in '${COLLECTION}' collection to delete.`);
			return;
		}
		const batch = writeBatch(db);
		querySnapshot.forEach((document) => {
			batch.delete(document.ref);
		});
		await batch.commit();
		console.log(`Successfully deleted ${querySnapshot.size} logs from '${COLLECTION}' collection.`);
	}
}
