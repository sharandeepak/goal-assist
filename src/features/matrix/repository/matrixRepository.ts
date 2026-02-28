import { Task } from "@/common/types";
import { Unsubscribe } from "firebase/firestore";

export interface QuadrantCounts {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  uncategorized: number;
}

/** Repository interface for matrix-related Firestore operations on the tasks collection */
export interface MatrixRepository {
  /**
   * Subscribe to tasks with optional date range filter.
   * @param dateRange - Optional { start, end } to filter by task date
   * @param callback - Called with array of tasks on each update
   * @param onError - Error handler
   * @returns Unsubscribe function
   */
  subscribeToTasks(
    dateRange: { start: Date; end: Date } | null,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;

  /**
   * One-time fetch of tasks with optional date range filter.
   * @param dateRange - Optional { start, end } to filter by task date
   */
  getTasks(dateRange: { start: Date; end: Date } | null): Promise<Task[]>;

  /**
   * Update a task's priority and urgency (for drag-and-drop between quadrants).
   */
  updateTaskQuadrant(
    taskId: string,
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void>;

  /**
   * Bulk update tasks to a new quadrant.
   */
  bulkUpdateTasksQuadrant(
    taskIds: string[],
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void>;
}
