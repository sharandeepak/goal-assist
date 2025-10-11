import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, Timestamp, Unsubscribe, getDocs, addDoc, writeBatch, WriteBatch, where, doc, updateDoc } from "firebase/firestore";
import { SatisfactionLog } from "@/types";

/**
 * Subscribes to the last 7 satisfaction logs.
 * @param callback - Function to call with the updated logs array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToSatisfactionLogs = (callback: (logs: SatisfactionLog[]) => void, onError: (error: Error) => void): Unsubscribe => {
	const logsCollection = collection(db, "satisfaction_logs");
	// Query to get the last 7 logs, ordered by date
	const q = query(logsCollection, orderBy("date", "desc"), limit(7));

	const unsubscribe = onSnapshot(
		q,
		(querySnapshot) => {
			const fetchedLogs: SatisfactionLog[] = [];
			querySnapshot.forEach((doc) => {
				fetchedLogs.push({ id: doc.id, ...doc.data() } as SatisfactionLog);
			});
			callback(fetchedLogs);
		},
		(error) => {
			console.error("Error fetching satisfaction logs: ", error);
			onError(error);
		}
	);

	return unsubscribe;
};

// Interface for the summary data
interface SatisfactionSummaryData {
	currentScore: number | null;
	change: number | null;
}

/**
 * Fetches the latest satisfaction score and the change from the previous one.
 * @returns A promise resolving to SatisfactionSummaryData.
 */
export const getSatisfactionSummary = async (): Promise<SatisfactionSummaryData> => {
	const satisfactionCollection = collection(db, "satisfaction_logs");
	const q = query(
		satisfactionCollection,
		orderBy("date", "desc"),
		limit(2) // Get the latest two logs
	);

	try {
		const querySnapshot = await getDocs(q);
		let currentScore: number | null = null;
		let change: number | null = null;

		if (!querySnapshot.empty) {
			const latestLog = querySnapshot.docs[0].data() as SatisfactionLog;
			currentScore = latestLog.score;

			if (querySnapshot.docs.length > 1) {
				const previousLog = querySnapshot.docs[1].data() as SatisfactionLog;
				// Ensure both scores are numbers before calculating change
				if (typeof currentScore === "number" && typeof previousLog.score === "number") {
					change = currentScore - previousLog.score;
				}
			}
		}
		return {
			currentScore,
			change,
		};
	} catch (error) {
		console.error("Error fetching satisfaction summary: ", error);
		throw error;
	}
};

/**
 * Adds a new satisfaction log.
 * @param logData - The data for the new log (score, comment, date).
 * @returns A promise resolving with the ID of the new log.
 */
export const addSatisfactionLog = async (logData: Omit<SatisfactionLog, "id">): Promise<string> => {
	if (logData.score === undefined || logData.score === null || !logData.date) {
		throw new Error("Score and Date are required for a satisfaction log.");
	}
	const logsCollection = collection(db, "satisfaction_logs");
	try {
		// Ensure date is a Timestamp
		const dataToAdd = {
			...logData,
			date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
			notes: logData.notes ?? "", // Corrected to use 'notes' and default to empty string
		};
		const docRef = await addDoc(logsCollection, dataToAdd);
		return docRef.id;
	} catch (error) {
		console.error("Error adding satisfaction log: ", error);
		throw new Error("Failed to add satisfaction log.");
	}
};

/**
 * Deletes all satisfaction logs from the Firestore 'satisfaction_logs' collection.
 * WARNING: This permanently deletes all documents in the collection.
 * @returns A promise resolving when the deletion is complete.
 * @throws Error if deletion fails.
 */
export const deleteAllUserSatisfactionLogs = async (): Promise<void> => {
	console.warn("deleteAllUserSatisfactionLogs called. This will delete all documents in the 'satisfaction_logs' collection.");
	const logsCollectionRef = collection(db, "satisfaction_logs");
	try {
		const querySnapshot = await getDocs(logsCollectionRef);
		if (querySnapshot.empty) {
			console.log("No logs found in 'satisfaction_logs' collection to delete.");
			return;
		}
		const batch: WriteBatch = writeBatch(db);
		querySnapshot.forEach((document) => {
			batch.delete(document.ref);
		});
		await batch.commit();
		console.log(`Successfully deleted ${querySnapshot.size} logs from 'satisfaction_logs' collection.`);
	} catch (error) {
		console.error("Error deleting all satisfaction logs: ", error);
		throw new Error("Failed to delete all satisfaction logs.");
	}
};

interface SatisfactionEntry {
	id?: string;
	date: Date | Timestamp;
	mood: "happy" | "cool" | "angry" | "okay";
	score: number;
}

/**
 * Subscribes to satisfaction entries for a specific month.
 * @param year - The full year (e.g., 2024).
 * @param month - The month (0-11, where 0 is January).
 * @param callback - Function to call with the updated entries array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToSatisfactionForMonth = (year: number, month: number, callback: (entries: SatisfactionEntry[]) => void, onError: (error: Error) => void): Unsubscribe => {
	const logsCollection = collection(db, "satisfaction_logs");
	const startDate = new Date(year, month, 1);
	const endDate = new Date(year, month + 1, 1);

	const q = query(logsCollection, where("date", ">=", Timestamp.fromDate(startDate)), where("date", "<", Timestamp.fromDate(endDate)));

	const unsubscribe = onSnapshot(
		q,
		(querySnapshot) => {
			const fetchedEntries: SatisfactionEntry[] = [];
			querySnapshot.forEach((doc) => {
				const data = doc.data();
				fetchedEntries.push({
					id: doc.id,
					...data,
					date: (data.date as Timestamp).toDate(), // convert Firestore Timestamp to JS Date
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
};

/**
 * Saves (creates or updates) a satisfaction entry for a specific date.
 * It checks if an entry for the given day already exists. If so, it updates it.
 * Otherwise, it creates a new one.
 * @param entryData - The data for the satisfaction entry.
 * @returns A promise resolving with the ID of the saved document.
 */
export const saveSatisfactionEntry = async (entryData: Omit<SatisfactionEntry, "id">): Promise<string> => {
	const { date } = entryData;
	const logsCollection = collection(db, "satisfaction_logs");

	// We need to check for entries on the same day, not exact timestamp.
	const dayStart = new Date(date as Date);
	dayStart.setHours(0, 0, 0, 0);

	const dayEnd = new Date(date as Date);
	dayEnd.setHours(23, 59, 59, 999);

	const q = query(logsCollection, where("date", ">=", Timestamp.fromDate(dayStart)), where("date", "<=", Timestamp.fromDate(dayEnd)), limit(1));

	try {
		const querySnapshot = await getDocs(q);
		const dataToSave = {
			...entryData,
			date: entryData.date instanceof Timestamp ? entryData.date : Timestamp.fromDate(new Date(entryData.date)),
		};

		if (!querySnapshot.empty) {
			// Entry exists, update it.
			const existingDoc = querySnapshot.docs[0];
			await updateDoc(doc(db, "satisfaction_logs", existingDoc.id), dataToSave);
			return existingDoc.id;
		} else {
			// No entry for this day, create a new one.
			const docRef = await addDoc(logsCollection, dataToSave);
			return docRef.id;
		}
	} catch (error) {
		console.error("Error saving satisfaction entry: ", error);
		throw new Error("Failed to save satisfaction entry.");
	}
};
