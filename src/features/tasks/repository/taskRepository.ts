import { Task } from "@/common/types";
import { Timestamp, Unsubscribe } from "firebase/firestore";

/** Summary data returned by getTodaysTaskSummary */
export interface TaskSummaryData {
  completed: number;
  total: number;
}

/** Repository interface for task persistence operations */
export interface TaskRepository {
  /** Subscribe to tasks within a date range. Returns unsubscribe function. */
  subscribeTasks(
    startDate: Date,
    endDate: Date,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  /** Subscribe to latest tasks for dashboard summary (e.g. latest 8). Returns unsubscribe function. */
  subscribeTaskSummary(
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  /** Fetch tasks for a specific date */
  getTasksForDate(date: Date): Promise<Task[]>;

  /** Fetch all tasks for a milestone */
  getTasksForMilestone(milestoneId: string): Promise<Task[]>;

  /** Get total and completed task counts for a milestone */
  getTaskCountsForMilestone(milestoneId: string): Promise<{ total: number; completed: number }>;

  /** Get today's task summary (total and completed counts) */
  getTodaysTaskSummary(): Promise<TaskSummaryData>;

  /** Create a new task. Returns the new document ID. */
  addTask(taskData: Omit<Task, "id">): Promise<string>;

  /** Update task fields (excludes completion, createdAt, milestoneId) */
  updateTask(
    taskId: string,
    dataToUpdate: Partial<Omit<Task, "id" | "completed" | "createdAt" | "milestoneId">>
  ): Promise<void>;

  /** Update completion status and completedDate */
  updateTaskCompletion(taskId: string, completed: boolean, completedDate: Timestamp | null): Promise<void>;

  /** Delete a task */
  deleteTask(taskId: string): Promise<void>;

  /** Delete all tasks for a milestone */
  deleteTasksForMilestone(milestoneId: string): Promise<void>;

  /** Delete all tasks in the collection */
  deleteAllTasks(): Promise<void>;
}
