import { Task } from "@/types";
import { Unsubscribe, Timestamp } from "firebase/firestore";

export interface ITaskRepository {
  subscribeToTaskSummary(
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  getTasksForDate(date: Date): Promise<Task[]>;

  getTodaysTaskSummary(): Promise<{ completed: number; total: number }>;

  subscribeToTasksByDateRange(
    startDate: Date,
    endDate: Date,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  addTask(taskData: Omit<Task, 'id'>): Promise<string>;

  updateTask(
    taskId: string,
    dataToUpdate: Partial<Omit<Task, 'id' | 'completed' | 'createdAt' | 'milestoneId'>>
  ): Promise<void>;

  updateTaskCompletion(taskId: string, completed: boolean, milestoneId?: string): Promise<void>;

  deleteTask(taskId: string, milestoneId?: string): Promise<void>;

  getTasksForMilestone(milestoneId: string): Promise<Task[]>;

  getTaskCountsForMilestone(milestoneId: string): Promise<{ total: number; completed: number }>;

  deleteTasksForMilestone(milestoneId: string): Promise<void>;

  deleteAllUserTasks(): Promise<void>;
}
