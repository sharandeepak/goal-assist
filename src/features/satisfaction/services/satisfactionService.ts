import type { SupabaseSatisfactionLog, SupabaseSatisfactionLogInsert, SatisfactionSummary } from "@/common/types";
import { supabaseSatisfactionRepository } from "../repository/supabaseSatisfactionRepository";
import { AppError } from "@/common/errors/AppError";

const repository = supabaseSatisfactionRepository;

export const subscribeToSatisfactionLogs = (
  callback: (logs: SupabaseSatisfactionLog[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToRecentLogs(7, callback, onError);
};

export const subscribeToSatisfactionForMonth = (
  year: number,
  month: number,
  callback: (entries: SupabaseSatisfactionLog[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToLogsForMonth(year, month, callback, onError);
};

export const getSatisfactionSummary = async (): Promise<SatisfactionSummary> => {
  try {
    return await repository.getSatisfactionSummary();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "SATISFACTION_SUMMARY_ERROR",
      "Failed to fetch satisfaction summary."
    );
  }
};

export const addSatisfactionLog = async (
  logData: SupabaseSatisfactionLogInsert
): Promise<SupabaseSatisfactionLog> => {
  if (logData.score === undefined || logData.score === null) {
    throw AppError.badRequest(
      "SATISFACTION_SCORE_REQUIRED",
      "Score is required for a satisfaction log."
    );
  }
  if (!logData.log_date) {
    throw AppError.badRequest(
      "SATISFACTION_DATE_REQUIRED",
      "Date is required for a satisfaction log."
    );
  }
  if (logData.score < 1 || logData.score > 10) {
    throw AppError.badRequest(
      "SATISFACTION_SCORE_INVALID",
      "Score must be between 1 and 10."
    );
  }

  try {
    return await repository.addSatisfactionEntry(logData);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "SATISFACTION_ADD_ERROR",
      "Failed to add satisfaction log."
    );
  }
};

export const saveSatisfactionEntry = async (
  entryData: SupabaseSatisfactionLogInsert
): Promise<SupabaseSatisfactionLog> => {
  if (entryData.score === undefined || entryData.score === null) {
    throw AppError.badRequest(
      "SATISFACTION_SCORE_REQUIRED",
      "Score is required for a satisfaction entry."
    );
  }
  if (!entryData.log_date) {
    throw AppError.badRequest(
      "SATISFACTION_DATE_REQUIRED",
      "Date is required for a satisfaction entry."
    );
  }

  try {
    return await repository.saveSatisfactionEntry(entryData);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "SATISFACTION_SAVE_ERROR",
      "Failed to save satisfaction entry."
    );
  }
};

export const deleteAllUserSatisfactionLogs = async (): Promise<void> => {
  try {
    await repository.deleteAllSatisfactionLogs();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "SATISFACTION_DELETE_ALL_ERROR",
      "Failed to delete all satisfaction logs."
    );
  }
};
