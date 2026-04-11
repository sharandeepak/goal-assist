import { format } from "date-fns";
import type {
  SupabaseTimeEntry,
  SupabaseTimeEntryInsert,
  SupabaseTimeEntryUpdate,
} from "@/common/types";
import { supabaseTimeRepository } from "../repository/supabaseTimeRepository";
import type { TimeRepository } from "../repository/timeRepository";
import { AppError } from "@/common/errors/AppError";

const repo: TimeRepository = supabaseTimeRepository;

export function subscribeToEntriesByDateRange(
  userId: string,
  workspaceId: string,
  startDay: string,
  endDay: string,
  callback: (entries: SupabaseTimeEntry[]) => void
): () => void {
  return repo.subscribeToEntriesByDateRange(userId, workspaceId, startDay, endDay, callback);
}

export function subscribeToRunningEntry(
  userId: string,
  workspaceId: string,
  callback: (entry: SupabaseTimeEntry | null) => void
): () => void {
  return repo.subscribeToRunningEntry(userId, workspaceId, callback);
}

export async function startTimer(params: {
  workspaceId: string;
  userId: string;
  taskId?: string;
  taskTitle: string;
  emoji?: string;
  milestoneId?: string;
  tags?: string[];
  note?: string;
}): Promise<SupabaseTimeEntry> {
  const { workspaceId, userId, taskId, taskTitle, emoji, milestoneId, tags, note } = params;

  if (!userId) {
    throw AppError.badRequest("TIME_USER_REQUIRED", "User ID is required to start a timer.");
  }
  if (!taskTitle) {
    throw AppError.badRequest("TIME_TITLE_REQUIRED", "Task title is required to start a timer.");
  }

  try {
    await stopRunningTimer(userId, workspaceId);

    const now = new Date();
    const dayStr = format(now, "yyyy-MM-dd");

    const entry: SupabaseTimeEntryInsert = {
      workspace_id: workspaceId,
      user_id: userId,
      task_id: taskId || null,
      task_title_snapshot: taskTitle,
      emoji: emoji || null,
      milestone_id_snapshot: milestoneId || null,
      tags_snapshot: tags || [],
      note: note || null,
      source: "timer",
      started_at: now.toISOString(),
      ended_at: null,
      duration_sec: 0,
      day: dayStr,
    };

    return await repo.addEntry(entry);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_START_TIMER_ERROR", "Failed to start timer.");
  }
}

export async function stopRunningTimer(
  userId: string,
  workspaceId: string
): Promise<SupabaseTimeEntry | null> {
  try {
    const running = await repo.getRunningEntry(userId, workspaceId);
    if (!running) return null;

    const now = new Date();
    const startDate = running.started_at
      ? new Date(running.started_at)
      : new Date(running.created_at);
    const durationSec = Math.floor(
      (now.getTime() - startDate.getTime()) / 1000
    );

    await repo.updateEntry(running.id, {
      ended_at: now.toISOString(),
      duration_sec: durationSec,
    });

    return {
      ...running,
      ended_at: now.toISOString(),
      duration_sec: durationSec,
      updated_at: now.toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_STOP_TIMER_ERROR", "Failed to stop running timer.");
  }
}

export async function getRunningEntry(
  userId: string,
  workspaceId: string
): Promise<SupabaseTimeEntry | null> {
  try {
    return await repo.getRunningEntry(userId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_RUNNING_ENTRY_ERROR", "Failed to fetch running entry.");
  }
}

export async function logManualEntry(params: {
  workspaceId: string;
  userId: string;
  day: string;
  taskId?: string;
  adHocTitle?: string;
  emoji?: string;
  milestoneId?: string;
  tags?: string[];
  note?: string;
  durationSec?: number;
  startedAt?: Date;
  endedAt?: Date;
}): Promise<SupabaseTimeEntry> {
  const {
    workspaceId,
    userId,
    day,
    taskId,
    adHocTitle,
    emoji,
    milestoneId,
    tags,
    note,
    durationSec,
    startedAt,
    endedAt,
  } = params;

  if (!adHocTitle && !taskId) {
    throw AppError.badRequest(
      "TIME_TITLE_OR_TASK_REQUIRED",
      "Either adHocTitle or taskId must be provided."
    );
  }

  if (!userId) {
    throw AppError.badRequest("TIME_USER_REQUIRED", "User ID is required.");
  }

  let finalStartedAt: string | null;
  let finalEndedAt: string | null;
  let finalDurationSec: number;

  if (startedAt && endedAt) {
    finalStartedAt = startedAt.toISOString();
    finalEndedAt = endedAt.toISOString();
    finalDurationSec = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000
    );
  } else if (durationSec !== undefined) {
    finalStartedAt = null;
    finalEndedAt = null;
    finalDurationSec = durationSec;
  } else {
    throw AppError.badRequest(
      "TIME_DURATION_REQUIRED",
      "Either durationSec or (startedAt and endedAt) must be provided."
    );
  }

  try {
    const entry: SupabaseTimeEntryInsert = {
      workspace_id: workspaceId,
      user_id: userId,
      task_id: taskId || null,
      task_title_snapshot: adHocTitle || "Untitled Task",
      emoji: emoji || null,
      milestone_id_snapshot: milestoneId || null,
      tags_snapshot: tags || [],
      note: note || null,
      source: "manual",
      started_at: finalStartedAt,
      ended_at: finalEndedAt,
      duration_sec: finalDurationSec,
      day,
    };

    return await repo.addEntry(entry);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_MANUAL_ENTRY_ERROR", "Failed to log manual time entry.");
  }
}

export async function updateEntry(params: {
  entryId: string;
  workspaceId: string;
  fields: SupabaseTimeEntryUpdate;
}): Promise<void> {
  const { entryId, workspaceId, fields } = params;

  if (!entryId) {
    throw AppError.badRequest("TIME_ENTRY_ID_REQUIRED", "Entry ID is required for update.");
  }

  try {
    if (fields.started_at || fields.ended_at) {
      const entry = await repo.getEntryById(entryId, workspaceId);
      if (!entry) {
        throw AppError.notFound("TIME_ENTRY_NOT_FOUND", "Time entry not found.");
      }

      const newStart = fields.started_at
        ? new Date(fields.started_at)
        : entry.started_at
          ? new Date(entry.started_at)
          : null;
      const newEnd = fields.ended_at
        ? new Date(fields.ended_at)
        : entry.ended_at
          ? new Date(entry.ended_at)
          : null;

      if (newStart && newEnd) {
        fields.duration_sec = Math.floor(
          (newEnd.getTime() - newStart.getTime()) / 1000
        );
      }

      if (fields.started_at && newStart) {
        fields.day = format(newStart, "yyyy-MM-dd");
      }
    }

    await repo.updateEntry(entryId, fields);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_UPDATE_ERROR", "Failed to update time entry.");
  }
}

export async function deleteEntry(entryId: string, workspaceId: string): Promise<void> {
  if (!entryId) {
    throw AppError.badRequest("TIME_ENTRY_ID_REQUIRED", "Entry ID is required for deletion.");
  }

  try {
    const entry = await repo.getEntryById(entryId, workspaceId);
    if (!entry) {
      throw AppError.notFound("TIME_ENTRY_NOT_FOUND", `Time entry ${entryId} not found.`);
    }
    await repo.deleteEntry(entryId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_DELETE_ERROR", "Failed to delete time entry.");
  }
}

export async function getEntryById(
  entryId: string,
  workspaceId: string
): Promise<SupabaseTimeEntry | null> {
  try {
    return await repo.getEntryById(entryId, workspaceId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TIME_FIND_ERROR", "Failed to find time entry.");
  }
}

export async function getEntriesForDateRange(
  userId: string,
  workspaceId: string,
  startDay: string,
  endDay: string
): Promise<SupabaseTimeEntry[]> {
  try {
    return await repo.getEntriesForDateRange(userId, workspaceId, startDay, endDay);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "TIME_FETCH_RANGE_ERROR",
      "Failed to fetch time entries for date range."
    );
  }
}

export async function getWeeklySummary(
  userId: string,
  workspaceId: string,
  weekStart: string,
  weekEnd: string
) {
  try {
    const entries = await repo.getEntriesForDateRange(userId, workspaceId, weekStart, weekEnd);

    const totalSeconds = entries.reduce((sum, e) => sum + e.duration_sec, 0);
    const taskBreakdown = entries.reduce(
      (acc, e) => {
        const key = e.task_title_snapshot;
        acc[key] = (acc[key] || 0) + e.duration_sec;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalSeconds,
      taskBreakdown,
      entryCount: entries.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(
      "TIME_WEEKLY_SUMMARY_ERROR",
      "Failed to fetch weekly summary."
    );
  }
}
