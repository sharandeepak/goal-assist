import type { SupabaseTask } from "@/common/types";
import { supabaseMatrixRepository } from "@/features/matrix/repository/supabaseMatrixRepository";
import type { MatrixRepository, QuadrantCounts } from "@/features/matrix/repository/matrixRepository";
import { AppError } from "@/common/errors/AppError";

const repository: MatrixRepository = supabaseMatrixRepository;

export type QuadrantType = "q1" | "q2" | "q3" | "q4" | "all";

export type { QuadrantCounts } from "@/features/matrix/repository/matrixRepository";

export interface MatrixTasksData {
  q1: SupabaseTask[];
  q2: SupabaseTask[];
  q3: SupabaseTask[];
  q4: SupabaseTask[];
  uncategorized: SupabaseTask[];
}

export const getTaskQuadrant = (task: SupabaseTask): QuadrantType | "uncategorized" => {
  if (!task.priority || !task.urgency) {
    return "uncategorized";
  }

  const isUrgent = task.urgency === "high";
  const isImportant = task.priority === "high";

  if (isUrgent && isImportant) return "q1";
  if (!isUrgent && isImportant) return "q2";
  if (isUrgent && !isImportant) return "q3";
  return "q4";
};

export const bucketTasksByQuadrant = (tasks: SupabaseTask[]): MatrixTasksData => {
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
    } else if (quadrant in data) {
      data[quadrant as keyof Omit<MatrixTasksData, "uncategorized">].push(task);
    }
  });

  return data;
};

export const subscribeToMatrixTasks = (
  dateRange: { start: Date; end: Date } | null,
  callback: (data: MatrixTasksData) => void,
  onError: (error: Error) => void
): (() => void) => {
  return repository.subscribeToTasks(
    dateRange,
    (tasks) => {
      callback(bucketTasksByQuadrant(tasks));
    },
    onError
  );
};

export const updateTaskQuadrant = async (
  taskId: string,
  newPriority: "low" | "medium" | "high",
  newUrgency: "low" | "medium" | "high"
): Promise<void> => {
  if (!taskId) {
    throw AppError.badRequest("TASK_ID_REQUIRED", "Task ID is required to update quadrant.");
  }

  try {
    await repository.updateTaskQuadrant(taskId, newPriority, newUrgency);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MATRIX_UPDATE_ERROR", "Failed to update task quadrant.");
  }
};

export const getTaskCountsByQuadrant = async (
  dateRange: { start: Date; end: Date } | null
): Promise<QuadrantCounts> => {
  try {
    const tasks = await repository.getTasks(dateRange);
    const data = bucketTasksByQuadrant(tasks);

    return {
      q1: data.q1.length,
      q2: data.q2.length,
      q3: data.q3.length,
      q4: data.q4.length,
      uncategorized: data.uncategorized.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MATRIX_COUNT_ERROR", "Failed to get task counts by quadrant.");
  }
};

export const bulkUpdateTasksQuadrant = async (
  taskIds: string[],
  priority: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high"
): Promise<void> => {
  if (taskIds.length === 0) {
    return;
  }

  try {
    await repository.bulkUpdateTasksQuadrant(taskIds, priority, urgency);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("MATRIX_BULK_UPDATE_ERROR", "Failed to bulk update tasks.");
  }
};

export const quadrantToValues = (
  quadrant: QuadrantType
): { priority: "low" | "medium" | "high"; urgency: "low" | "medium" | "high" } => {
  switch (quadrant) {
    case "q1":
      return { priority: "high", urgency: "high" };
    case "q2":
      return { priority: "high", urgency: "low" };
    case "q3":
      return { priority: "low", urgency: "high" };
    case "q4":
      return { priority: "low", urgency: "low" };
    default:
      return { priority: "medium", urgency: "medium" };
  }
};
