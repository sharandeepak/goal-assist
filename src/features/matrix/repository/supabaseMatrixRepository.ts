import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseTask } from "@/common/types";
import type { MatrixRepository } from "./matrixRepository";
import { AppError } from "@/common/errors/AppError";
import { startOfDay, endOfDay } from "date-fns";

function getClient() {
  return createClient();
}

export class SupabaseMatrixRepository extends BaseRepository<"tasks"> implements MatrixRepository {
  constructor() {
    super("tasks", getClient);
  }

  subscribeToTasks(
    dateRange: { start: Date; end: Date } | null,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const tasks = await this.getTasks(dateRange);
        callback(tasks);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  async getTasks(dateRange: { start: Date; end: Date } | null): Promise<SupabaseTask[]> {
    try {
      if (dateRange) {
        const start = startOfDay(dateRange.start).toISOString();
        const end = endOfDay(dateRange.end).toISOString();
        const { data, error } = await this.table
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });
        if (error) throw AppError.internal("MATRIX_FETCH_TASKS_ERROR", "Failed to fetch matrix tasks.");
        return (data ?? []) as SupabaseTask[];
      }
      const { data, error } = await this.table.select("*").order("date", { ascending: true });
      if (error) throw AppError.internal("MATRIX_FETCH_TASKS_ERROR", "Failed to fetch matrix tasks.");
      return (data ?? []) as SupabaseTask[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("MATRIX_FETCH_TASKS_ERROR", "Failed to fetch matrix tasks.");
    }
  }

  async updateTaskQuadrant(
    taskId: string,
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void> {
    try {
      const { data, error } = await this.table
        .update({ priority, urgency })
        .eq("id", taskId)
        .select("id");
      if (error) throw AppError.internal("MATRIX_UPDATE_QUADRANT_ERROR", "Failed to update task quadrant.");
      if (!data || data.length === 0) throw AppError.notFound("TASK_NOT_FOUND", `Task ${taskId} not found.`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("MATRIX_UPDATE_QUADRANT_ERROR", "Failed to update task quadrant.");
    }
  }

  async bulkUpdateTasksQuadrant(
    taskIds: string[],
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void> {
    try {
      if (taskIds.length === 0) return;
      const { error } = await this.table.update({ priority, urgency }).in("id", taskIds);
      if (error) throw AppError.internal("MATRIX_BULK_UPDATE_ERROR", "Failed to bulk update tasks quadrant.");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("MATRIX_BULK_UPDATE_ERROR", "Failed to bulk update tasks quadrant.");
    }
  }
}

export const supabaseMatrixRepository = new SupabaseMatrixRepository();
