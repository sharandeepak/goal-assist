import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, Timestamp, Unsubscribe, addDoc, getDocs, writeBatch, WriteBatch } from "firebase/firestore";
import { StandupLog } from "@/types";

/**
 * Subscribes to the last 2 standup logs.
 * @param callback - Function to call with the updated logs array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToRecentStandups = (callback: (logs: StandupLog[]) => void, onError: (error: Error) => void): Unsubscribe => {
	const logsCollection = collection(db, "standup_logs");
	const q = query(logsCollection, orderBy("date", "desc"), limit(2));

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
};

/**
 * Adds a new standup log.
 * @param logData - The data for the new standup log.
 * @returns A promise resolving with the ID of the new log.
 * @throws Error if required fields are missing or if adding fails.
 */
export const addStandupLog = async (logData: Omit<StandupLog, "id">): Promise<string> => {
	// Basic validation - extend as needed based on StandupLog type requirements
	if (!logData.date || !logData.completed || !logData.planned || !logData.blockers) {
		throw new Error("Date, completed, planned, and blockers are required for a standup log.");
	}
	const logsCollection = collection(db, "standup_logs");
	try {
		const dataToAdd = {
			...logData,
			date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
			notes: logData.notes ?? "", // Assuming 'notes' is optional in StandupLog
		};
		const docRef = await addDoc(logsCollection, dataToAdd);
		return docRef.id;
	} catch (error) {
		console.error("Error adding standup log: ", error);
		throw new Error("Failed to add standup log.");
	}
};

/**
 * Deletes all standup logs from the Firestore 'standup_logs' collection.
 * WARNING: This permanently deletes all documents in the collection.
 * @returns A promise resolving when the deletion is complete.
 * @throws Error if deletion fails.
 */
export const deleteAllUserStandupLogs = async (): Promise<void> => {
	console.warn("deleteAllUserStandupLogs called. This will delete all documents in the 'standup_logs' collection.");
	const logsCollectionRef = collection(db, "standup_logs");
	try {
		const querySnapshot = await getDocs(logsCollectionRef);
		if (querySnapshot.empty) {
			console.log("No logs found in 'standup_logs' collection to delete.");
			return;
		}
		const batch: WriteBatch = writeBatch(db);
		querySnapshot.forEach((document) => {
			batch.delete(document.ref);
		});
		await batch.commit();
		console.log(`Successfully deleted ${querySnapshot.size} logs from 'standup_logs' collection.`);
	} catch (error) {
		console.error("Error deleting all standup logs: ", error);
		throw new Error("Failed to delete all standup logs.");
	}
}; 