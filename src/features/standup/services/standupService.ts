import type { SupabaseStandupLog, SupabaseStandupLogInsert } from "@/common/types";
import { supabaseStandupRepository } from "../repository/supabaseStandupRepository";
import type { StandupRepository } from "../repository/standupRepository";
import { AppError } from "@/common/errors/AppError";

const repository: StandupRepository = supabaseStandupRepository;

function validateStandupLog(logData: SupabaseStandupLogInsert): void {
  if (!logData.log_date) {
    throw AppError.badRequest(
      "STANDUP_DATE_REQUIRED",
      "Date is required for a standup log."
    );
  }
  if (!logData.user_id) {
    throw AppError.badRequest(
      "STANDUP_USER_REQUIRED",
      "User ID is required for a standup log."
    );
  }
}

export const subscribeToRecentStandups = (
  callback: (logs: SupabaseStandupLog[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToRecentStandups(2, callback, onError);
};

export const getRecentStandups = async (
  limit: number = 2
): Promise<SupabaseStandupLog[]> => {
  if (limit <= 0) {
    throw AppError.badRequest(
      "STANDUP_LIMIT_INVALID",
      "Standup fetch limit must be greater than zero."
    );
  }

  try {
    return await repository.getRecentStandups(limit);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "STANDUP_FETCH_RECENT_ERROR",
      "Failed to fetch recent standup logs."
    );
  }
};

export const addStandupLog = async (
  logData: SupabaseStandupLogInsert
): Promise<SupabaseStandupLog> => {
  validateStandupLog(logData);

  try {
    return await repository.addStandupLog(logData);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("STANDUP_ADD_ERROR", "Failed to add standup log.");
  }
};

export const deleteAllUserStandupLogs = async (): Promise<void> => {
  try {
    await repository.deleteAllStandupLogs();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "STANDUP_DELETE_ALL_ERROR",
      "Failed to delete all standup logs."
    );
  }
};
