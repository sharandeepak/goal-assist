import type { SupabaseTask, SupabaseTaskInsert, SupabaseTaskUpdate } from "@/common/types";

export interface TaskSummaryData {
  completed: number;
  total: number;
}

export interface TaskRepository {
  subscribeTasks(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void;

  subscribeTaskSummary(
    workspaceId: string,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void;

  getTasksForDate(workspaceId: string, date: Date): Promise<SupabaseTask[]>;

  getTasksByDateRange(workspaceId: string, startDate: Date, endDate: Date): Promise<SupabaseTask[]>;

  searchTasksByTitle(workspaceId: string, query: string): Promise<SupabaseTask[]>;

  getTasksForMilestone(workspaceId: string, milestoneId: string): Promise<SupabaseTask[]>;

  getTaskCountsForMilestone(workspaceId: string, milestoneId: string): Promise<{ total: number; completed: number }>;

  getTodaysTaskSummary(workspaceId: string): Promise<TaskSummaryData>;

  addTask(taskData: SupabaseTaskInsert): Promise<SupabaseTask>;

  updateTask(taskId: string, dataToUpdate: SupabaseTaskUpdate): Promise<void>;

  updateTaskCompletion(taskId: string, completed: boolean): Promise<void>;

  deleteTask(taskId: string): Promise<void>;

  deleteTasksForMilestone(milestoneId: string): Promise<void>;

  deleteAllTasks(): Promise<void>;
}
