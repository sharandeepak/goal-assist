import type { SupabaseTask, SupabaseTaskInsert, SupabaseTaskUpdate } from "@/common/types";

export interface TaskSummaryData {
  completed: number;
  total: number;
}

export interface TaskRepository {
  subscribeTasks(
    startDate: Date,
    endDate: Date,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void;

  subscribeTaskSummary(
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void;

  getTasksForDate(date: Date): Promise<SupabaseTask[]>;

  getTasksByDateRange(startDate: Date, endDate: Date): Promise<SupabaseTask[]>;

  getTasksForMilestone(milestoneId: string): Promise<SupabaseTask[]>;

  getTaskCountsForMilestone(milestoneId: string): Promise<{ total: number; completed: number }>;

  getTodaysTaskSummary(): Promise<TaskSummaryData>;

  addTask(taskData: SupabaseTaskInsert): Promise<SupabaseTask>;

  updateTask(taskId: string, dataToUpdate: SupabaseTaskUpdate): Promise<void>;

  updateTaskCompletion(taskId: string, completed: boolean): Promise<void>;

  deleteTask(taskId: string): Promise<void>;

  deleteTasksForMilestone(milestoneId: string): Promise<void>;

  deleteAllTasks(): Promise<void>;
}
