// standupService.ts
import { StandupLog } from "@/types";
import { Unsubscribe, Timestamp } from "firebase/firestore";
import { standupRepository } from "@/repositories";

export const subscribeToRecentStandups = (callback: (logs: StandupLog[]) => void, onError: (error: Error) => void): Unsubscribe => {
	return standupRepository.subscribeToRecentStandups(callback, onError);
};

export const addStandupLog = async (logData: Omit<StandupLog, "id">): Promise<string> => {
	if (!logData.date || !logData.completed || !logData.planned || !logData.blockers) {
		throw new Error("Date, completed, planned, and blockers are required for a standup log.");
	}
    return standupRepository.addStandupLog(logData);
};

export const deleteAllUserStandupLogs = async (): Promise<void> => {
	await standupRepository.deleteAllUserStandupLogs();
};