import { BaseRepository } from "@/common/repository/base.repository";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type {
  SupabaseTask,
  SupabaseTaskInsert,
  SupabaseTaskUpdate,
} from "@/common/types";
import type { TaskRepository, TaskSummaryData } from "./taskRepository";
import { AppError } from "@/common/errors/AppError";
import { startOfDay, endOfDay } from "date-fns";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseTaskRepository
  extends BaseRepository<"tasks">
  implements TaskRepository
{
  constructor() {
    super("tasks", getClient);
  }

  subscribeTasks(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const tasks = await this.getTasksByDateRange(workspaceId, startDate, endDate);
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

  subscribeTaskSummary(
    workspaceId: string,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const fetchAndCallback = async () => {
      try {
        const { data, error } = await this.table
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(8);
        if (error) throw AppError.internal("TASK_SUMMARY_FETCH_ERROR", error.message);
        callback((data ?? []) as SupabaseTask[]);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    fetchAndCallback();
    return this.subscribe("*", () => {
      fetchAndCallback();
    });
  }

  async getTasksForDate(workspaceId: string, date: Date): Promise<SupabaseTask[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("date", startOfDay(date).toISOString())
        .lte("date", endOfDay(date).toISOString())
        .order("date", { ascending: true });
      if (error) throw AppError.internal("TASK_FETCH_BY_DATE_ERROR", error.message);
      return (data ?? []) as SupabaseTask[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_FETCH_BY_DATE_ERROR", "Failed to fetch tasks for date.");
    }
  }

  async getTasksByDateRange(workspaceId: string, startDate: Date, endDate: Date): Promise<SupabaseTask[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("date", startOfDay(startDate).toISOString())
        .lte("date", endOfDay(endDate).toISOString())
        .order("date", { ascending: true });
      if (error)
        throw AppError.internal("TASK_FETCH_BY_RANGE_ERROR", error.message);
      return (data ?? []) as SupabaseTask[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "TASK_FETCH_BY_RANGE_ERROR",
        "Failed to fetch tasks for date range."
      );
    }
  }

  async searchTasksByTitle(workspaceId: string, query: string): Promise<SupabaseTask[]> {
    try {
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .ilike("title", `%${query}%`)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw AppError.internal("TASK_SEARCH_ERROR", error.message);
      return (data ?? []) as SupabaseTask[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_SEARCH_ERROR", "Failed to search tasks.");
    }
  }

  async getTasksForMilestone(workspaceId: string, milestoneId: string): Promise<SupabaseTask[]> {
    try {
      if (!milestoneId) return [];
      const { data, error } = await this.table
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("milestone_id", milestoneId)
        .order("date", { ascending: true });
      if (error)
        throw AppError.internal("TASK_FETCH_BY_MILESTONE_ERROR", error.message);
      return (data ?? []) as SupabaseTask[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "TASK_FETCH_BY_MILESTONE_ERROR",
        "Failed to fetch tasks for milestone."
      );
    }
  }

  async getTaskCountsForMilestone(
    workspaceId: string,
    milestoneId: string
  ): Promise<{ total: number; completed: number }> {
    try {
      if (!milestoneId) return { total: 0, completed: 0 };

      const [totalResult, completedResult] = await Promise.all([
        this.table
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("milestone_id", milestoneId),
        this.table
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("milestone_id", milestoneId)
          .eq("completed", true),
      ]);

      if (totalResult.error)
        throw AppError.internal("TASK_COUNT_BY_MILESTONE_ERROR", totalResult.error.message);
      if (completedResult.error)
        throw AppError.internal("TASK_COUNT_BY_MILESTONE_ERROR", completedResult.error.message);

      return {
        total: totalResult.count ?? 0,
        completed: completedResult.count ?? 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "TASK_COUNT_BY_MILESTONE_ERROR",
        "Failed to count tasks for milestone."
      );
    }
  }

  async getTodaysTaskSummary(workspaceId: string): Promise<TaskSummaryData> {
    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const [totalResult, completedResult] = await Promise.all([
        this.table
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .gte("date", todayStart.toISOString())
          .lte("date", todayEnd.toISOString()),
        this.table
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .gte("date", todayStart.toISOString())
          .lte("date", todayEnd.toISOString())
          .eq("completed", true),
      ]);

      if (totalResult.error)
        throw AppError.internal("TASK_TODAY_SUMMARY_ERROR", totalResult.error.message);
      if (completedResult.error)
        throw AppError.internal("TASK_TODAY_SUMMARY_ERROR", completedResult.error.message);

      return {
        total: totalResult.count ?? 0,
        completed: completedResult.count ?? 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "TASK_TODAY_SUMMARY_ERROR",
        "Failed to fetch today's task summary."
      );
    }
  }

  async addTask(taskData: SupabaseTaskInsert): Promise<SupabaseTask> {
    try {
      const { data, error } = await this.table.insert(taskData as never).select().single();
      if (error) throw AppError.internal("TASK_CREATE_ERROR", error.message);
      if (!data) throw AppError.internal("TASK_CREATE_ERROR", "No data returned on insert.");
      return data as SupabaseTask;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_CREATE_ERROR", "Failed to create task.");
    }
  }

  async updateTask(taskId: string, dataToUpdate: SupabaseTaskUpdate): Promise<void> {
    try {
      const { data, error } = await this.table
        .update(dataToUpdate as never)
        .eq("id", taskId)
        .select("id");
      if (error) throw AppError.internal("TASK_UPDATE_ERROR", error.message);
      if (!data || data.length === 0)
        throw AppError.notFound("TASK_NOT_FOUND", `Task ${taskId} not found.`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_UPDATE_ERROR", "Failed to update task.");
    }
  }

  async updateTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    try {
      const completedDate = completed ? startOfDay(new Date()).toISOString() : null;
      const { data, error } = await this.table
        .update({ completed, completed_date: completedDate } as never)
        .eq("id", taskId)
        .select("id");
      if (error)
        throw AppError.internal("TASK_COMPLETION_ERROR", error.message);
      if (!data || data.length === 0)
        throw AppError.notFound("TASK_NOT_FOUND", `Task ${taskId} not found.`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_COMPLETION_ERROR", "Failed to update task completion.");
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const { data, error } = await this.table.delete().eq("id", taskId).select("id");
      if (error) throw AppError.internal("TASK_DELETE_ERROR", error.message);
      if (!data || data.length === 0)
        throw AppError.notFound("TASK_NOT_FOUND", `Task ${taskId} not found.`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_DELETE_ERROR", "Failed to delete task.");
    }
  }

  async deleteTasksForMilestone(milestoneId: string): Promise<void> {
    try {
      if (!milestoneId) return;
      const { error } = await this.table.delete().eq("milestone_id", milestoneId);
      if (error)
        throw AppError.internal(
          "TASK_DELETE_BY_MILESTONE_ERROR",
          error.message
        );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "TASK_DELETE_BY_MILESTONE_ERROR",
        "Failed to delete tasks for milestone."
      );
    }
  }

  async deleteAllTasks(): Promise<void> {
    try {
      const { error } = await this.table.delete().neq("id", "");
      if (error) throw AppError.internal("TASK_DELETE_ALL_ERROR", error.message);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("TASK_DELETE_ALL_ERROR", "Failed to delete all tasks.");
    }
  }
}

export const supabaseTaskRepository = new SupabaseTaskRepository();
