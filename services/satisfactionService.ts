// satisfactionService.ts
import { SatisfactionLog, SatisfactionSummary } from "@/types";
import { Unsubscribe, Timestamp } from "firebase/firestore";
import { satisfactionRepository } from "@/repositories";
import { SatisfactionEntry } from "@/repositories/interfaces/ISatisfactionRepository";

export const subscribeToSatisfactionLogs = (callback: (logs: SatisfactionLog[]) => void, onError: (error: Error) => void): Unsubscribe => {
	return satisfactionRepository.subscribeToSatisfactionLogs(callback, onError);
};

export const getSatisfactionSummary = async (): Promise<SatisfactionSummary> => {
    return satisfactionRepository.getSatisfactionSummary();
};

export const addSatisfactionLog = async (logData: Omit<SatisfactionLog, "id">): Promise<string> => {
	if (logData.score === undefined || logData.score === null || !logData.date) {
		throw new Error("Score and Date are required for a satisfaction log.");
	}
    return satisfactionRepository.addSatisfactionLog(logData);
};

export const deleteAllUserSatisfactionLogs = async (): Promise<void> => {
	await satisfactionRepository.deleteAllUserSatisfactionLogs();
};

export const subscribeToSatisfactionForMonth = (year: number, month: number, callback: (entries: SatisfactionEntry[]) => void, onError: (error: Error) => void): Unsubscribe => {
	return satisfactionRepository.subscribeToSatisfactionForMonth(year, month, callback, onError);
};

export const saveSatisfactionEntry = async (entryData: Omit<SatisfactionEntry, "id">): Promise<string> => {
	return satisfactionRepository.saveSatisfactionEntry(entryData);
};
