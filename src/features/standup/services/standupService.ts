import type { StandupLog } from "@/common/types";
import type { Unsubscribe } from "@/common/repository/types";
import { FirebaseStandupRepository } from "../repository/firebaseStandupRepository";

const defaultRepository = new FirebaseStandupRepository();

function validateStandupLog(logData: Omit<StandupLog, "id">): void {
	if (!logData.date || !logData.completed || !logData.planned || !logData.blockers) {
		throw new Error("Date, completed, planned, and blockers are required for a standup log.");
	}
}

/**
 * Subscribes to the last 2 standup logs.
 * @param callback - Function to call with the updated logs array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToRecentStandups = (
	callback: (logs: StandupLog[]) => void,
	onError: (error: Error) => void
): Unsubscribe => {
	return defaultRepository.subscribeToRecentStandups(2, callback, onError);
};

/**
 * Adds a new standup log.
 * @param logData - The data for the new standup log.
 * @returns A promise resolving with the ID of the new log.
 * @throws Error if required fields are missing or if adding fails.
 */
export const addStandupLog = async (logData: Omit<StandupLog, "id">): Promise<string> => {
	validateStandupLog(logData);
	try {
		return await defaultRepository.addStandupLog(logData);
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
	try {
		await defaultRepository.deleteAllStandupLogs();
	} catch (error) {
		console.error("Error deleting all standup logs: ", error);
		throw new Error("Failed to delete all standup logs.");
	}
};
