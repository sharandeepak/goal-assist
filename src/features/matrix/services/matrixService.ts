import { Unsubscribe } from "firebase/firestore";
import { Task } from "@/common/types";
import { FirebaseMatrixRepository } from "@/features/matrix/repository/firebaseMatrixRepository";
import type { QuadrantCounts } from "@/features/matrix/repository/matrixRepository";

const repository = new FirebaseMatrixRepository();

export type QuadrantType = "q1" | "q2" | "q3" | "q4" | "all";

export type { QuadrantCounts } from "@/features/matrix/repository/matrixRepository";

export interface MatrixTasksData {
  q1: Task[];
  q2: Task[];
  q3: Task[];
  q4: Task[];
  uncategorized: Task[];
}

/**
 * Determines which quadrant a task belongs to based on priority and urgency
 */
export const getTaskQuadrant = (task: Task): QuadrantType | "uncategorized" => {
  if (!task.priority || !task.urgency) {
    return "uncategorized";
  }

  const isUrgent = task.urgency === "high";
  const isImportant = task.priority === "high";

  if (isUrgent && isImportant) return "q1"; // Do First
  if (!isUrgent && isImportant) return "q2"; // Schedule
  if (isUrgent && !isImportant) return "q3"; // Delegate
  return "q4"; // Eliminate
};

/**
 * Buckets tasks into MatrixTasksData by quadrant
 */
export const bucketTasksByQuadrant = (tasks: Task[]): MatrixTasksData => {
  const data: MatrixTasksData = {
    q1: [],
    q2: [],
    q3: [],
    q4: [],
    uncategorized: [],
  };

  tasks.forEach((task) => {
    const quadrant = getTaskQuadrant(task);
    if (quadrant === "uncategorized") {
      data.uncategorized.push(task);
    } else {
      data[quadrant].push(task);
    }
  });

  return data;
};

/**
 * Subscribes to tasks for the Eisenhower Matrix with optional date filtering
 * @param dateRange - Optional date range { start: Date, end: Date }
 * @param callback - Function called with categorized tasks
 * @param onError - Error handler
 * @returns Unsubscribe function
 */
export const subscribeToMatrixTasks = (
  dateRange: { start: Date; end: Date } | null,
  callback: (data: MatrixTasksData) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return repository.subscribeToTasks(
    dateRange,
    (tasks) => {
      callback(bucketTasksByQuadrant(tasks));
    },
    onError
  );
};

/**
 * Updates a task's priority and urgency (for drag-and-drop between quadrants)
 */
export const updateTaskQuadrant = async (
  taskId: string,
  newPriority: "low" | "medium" | "high",
  newUrgency: "low" | "medium" | "high"
): Promise<void> => {
  return repository.updateTaskQuadrant(taskId, newPriority, newUrgency);
};

/**
 * Gets the count of tasks in each quadrant
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to quadrant counts
 */
export const getTaskCountsByQuadrant = async (
  dateRange: { start: Date; end: Date } | null
): Promise<QuadrantCounts> => {
  const tasks = await repository.getTasks(dateRange);
  const data = bucketTasksByQuadrant(tasks);

  return {
    q1: data.q1.length,
    q2: data.q2.length,
    q3: data.q3.length,
    q4: data.q4.length,
    uncategorized: data.uncategorized.length,
  };
};

/**
 * Bulk update tasks to a new quadrant
 */
export const bulkUpdateTasksQuadrant = async (
  taskIds: string[],
  priority: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high"
): Promise<void> => {
  return repository.bulkUpdateTasksQuadrant(taskIds, priority, urgency);
};

/**
 * Converts quadrant type to priority and urgency values
 */
export const quadrantToValues = (
  quadrant: QuadrantType
): { priority: "low" | "medium" | "high"; urgency: "low" | "medium" | "high" } => {
  switch (quadrant) {
    case "q1": // Urgent + Important
      return { priority: "high", urgency: "high" };
    case "q2": // Not Urgent + Important
      return { priority: "high", urgency: "low" };
    case "q3": // Urgent + Not Important
      return { priority: "low", urgency: "high" };
    case "q4": // Not Urgent + Not Important
      return { priority: "low", urgency: "low" };
    default:
      return { priority: "medium", urgency: "medium" };
  }
};
