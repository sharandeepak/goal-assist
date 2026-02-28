import type { SupabaseTask, SupabaseTaskInsert } from "@/common/types";
import { updateMilestoneProgress } from "@/features/milestones/services/milestoneService";
import { supabaseTaskRepository } from "../repository/supabaseTaskRepository";
import type { TaskSummaryData } from "../repository/taskRepository";
import { AppError } from "@/common/errors/AppError";
const taskRepository = supabaseTaskRepository;

export const subscribeToTaskSummary = (
  callback: (tasks: SupabaseTask[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return taskRepository.subscribeTaskSummary(callback, onError);
};

export const getTasksForDate = async (date: Date): Promise<SupabaseTask[]> => {
  try {
    return await taskRepository.getTasksForDate(date);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_FETCH_DATE_ERROR", "Failed to fetch tasks for the selected date.");
  }
};

export const getTasksByDateRange = async (startDate: Date, endDate: Date): Promise<SupabaseTask[]> => {
  try {
    return await taskRepository.getTasksByDateRange(startDate, endDate);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_FETCH_RANGE_ERROR", "Failed to fetch tasks for date range.");
  }
};

export const getTodaysTaskSummary = async (): Promise<TaskSummaryData> => {
  try {
    return await taskRepository.getTodaysTaskSummary();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_TODAY_SUMMARY_ERROR", "Failed to fetch today's task summary.");
  }
};

export const subscribeToTasksByDateRange = (
  startDate: Date,
  endDate: Date,
  callback: (tasks: SupabaseTask[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return taskRepository.subscribeTasks(startDate, endDate, callback, onError);
};

export const addTask = async (taskData: SupabaseTaskInsert): Promise<SupabaseTask> => {
  if (!taskData.title) {
    throw AppError.badRequest("TASK_TITLE_REQUIRED", "Task title is required.");
  }

  try {
    const task = await taskRepository.addTask(taskData);

    if (taskData.milestone_id) {
      await updateMilestoneProgress(taskData.milestone_id);
    }

    return task;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_ADD_ERROR", "Failed to add task.");
  }
};

export const updateTask = async (
  taskId: string,
  dataToUpdate: Partial<Omit<SupabaseTask, "id" | "completed" | "created_at" | "milestone_id">>
): Promise<void> => {
  if (!taskId) {
    throw AppError.badRequest("TASK_ID_REQUIRED", "Task ID is required for update.");
  }
  if (Object.keys(dataToUpdate).length === 0) {
    return;
  }

  const forbiddenFields: (keyof SupabaseTask)[] = ["id", "completed", "created_at"];
  for (const field of forbiddenFields) {
    if (field in dataToUpdate) {
      delete dataToUpdate[field as keyof typeof dataToUpdate];
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return;
  }

  try {
    await taskRepository.updateTask(taskId, dataToUpdate);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_UPDATE_ERROR", "Failed to update task details.");
  }
};

export const updateTaskCompletion = async (
  taskId: string,
  completed: boolean,
  milestoneId?: string
): Promise<void> => {
  try {
    await taskRepository.updateTaskCompletion(taskId, completed);

    if (milestoneId) {
      await updateMilestoneProgress(milestoneId);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_COMPLETION_ERROR", "Failed to update task completion status.");
  }
};

export const deleteTask = async (taskId: string, milestoneId?: string): Promise<void> => {
  try {
    await taskRepository.deleteTask(taskId);

    if (milestoneId) {
      await updateMilestoneProgress(milestoneId);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_DELETE_ERROR", "Failed to delete task.");
  }
};

export const getTasksForMilestone = async (milestoneId: string): Promise<SupabaseTask[]> => {
  if (!milestoneId) {
    return [];
  }

  try {
    return await taskRepository.getTasksForMilestone(milestoneId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_FETCH_MILESTONE_ERROR", "Failed to fetch tasks for milestone.");
  }
};

export const getTaskCountsForMilestone = async (
  milestoneId: string
): Promise<{ total: number; completed: number }> => {
  if (!milestoneId) {
    return { total: 0, completed: 0 };
  }

  try {
    return await taskRepository.getTaskCountsForMilestone(milestoneId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_COUNT_MILESTONE_ERROR", "Failed to fetch task counts for milestone.");
  }
};

export const deleteTasksForMilestone = async (milestoneId: string): Promise<void> => {
  if (!milestoneId) {
    return;
  }

  try {
    await taskRepository.deleteTasksForMilestone(milestoneId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_DELETE_MILESTONE_ERROR", "Failed to delete associated tasks.");
  }
};

export const deleteAllUserTasks = async (): Promise<void> => {
  try {
    await taskRepository.deleteAllTasks();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_DELETE_ALL_ERROR", "Failed to delete all tasks.");
  }
};
