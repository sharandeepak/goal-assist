import { Timestamp, Unsubscribe } from "firebase/firestore";
import { Task } from "@/common/types";
import { startOfDay } from "date-fns";
import { updateMilestoneProgress } from "@/features/milestones/services/milestoneService";
import {
  defaultTaskRepository,
  type TaskRepository,
  type TaskSummaryData,
} from "@/features/tasks/repository/firebaseTaskRepository";

const taskRepository: TaskRepository = defaultTaskRepository;

/**
 * Subscribes to the latest tasks for the Task Summary component.
 */
export const subscribeToTaskSummary = (
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return taskRepository.subscribeTaskSummary(callback, onError);
};

/**
 * Fetches tasks scheduled for a specific date.
 */
export const getTasksForDate = async (date: Date): Promise<Task[]> => {
  try {
    return await taskRepository.getTasksForDate(date);
  } catch (error) {
    console.error("Error fetching tasks for date: ", error);
    throw error;
  }
};

/**
 * Fetches the total and completed count of tasks for today.
 */
export const getTodaysTaskSummary = async (): Promise<TaskSummaryData> => {
  try {
    return await taskRepository.getTodaysTaskSummary();
  } catch (error) {
    console.error("Error fetching today's task summary: ", error);
    throw error;
  }
};

/**
 * Subscribes to tasks within a specific date range.
 */
export const subscribeToTasksByDateRange = (
  startDate: Date,
  endDate: Date,
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return taskRepository.subscribeTasks(startDate, endDate, callback, onError);
};

/**
 * Adds a new task. Requires title, date, and priority.
 * Triggers milestone progress update if linked.
 */
export const addTask = async (taskData: Omit<Task, "id">): Promise<string> => {
  if (!taskData.title || !taskData.date || !taskData.priority) {
    throw new Error("Task title, date, and priority are required.");
  }

  try {
    const taskId = await taskRepository.addTask(taskData);

    if (taskData.milestoneId) {
      await updateMilestoneProgress(taskData.milestoneId);
    }
    return taskId;
  } catch (error) {
    console.error("Error adding task: ", error);
    if (error instanceof Error && error.message.includes("required")) {
      throw error;
    }
    throw new Error("Failed to add task.");
  }
};

/**
 * Updates specific fields of an existing task.
 * Does not update completion status (use updateTaskCompletion for that).
 */
export const updateTask = async (
  taskId: string,
  dataToUpdate: Partial<
    Omit<Task, "id" | "completed" | "createdAt" | "milestoneId">
  >
): Promise<void> => {
  if (!taskId) throw new Error("Task ID is required for update.");
  if (Object.keys(dataToUpdate).length === 0) {
    console.warn("updateTask called with no data to update.");
    return;
  }

  const forbiddenFields: (keyof Task)[] = ["id", "completed", "createdAt"];
  for (const field of forbiddenFields) {
    if (field in dataToUpdate) {
      console.warn(
        `Attempted to update forbidden field '${field}' in updateTask. Ignoring.`
      );
      delete dataToUpdate[field as keyof typeof dataToUpdate];
    }
  }
  if (Object.keys(dataToUpdate).length === 0) {
    console.warn(
      "updateTask called with only forbidden fields. No update performed."
    );
    return;
  }

  try {
    await taskRepository.updateTask(taskId, dataToUpdate);
  } catch (error) {
    console.error(`Error updating task ${taskId}: `, error);
    throw new Error("Failed to update task details.");
  }
};

/**
 * Updates the completion status of a task and triggers milestone progress update if linked.
 * Auto-sets completedDate when marking complete, clears when unmarking.
 */
export const updateTaskCompletion = async (
  taskId: string,
  completed: boolean,
  milestoneId?: string
): Promise<void> => {
  const completedDate = completed
    ? Timestamp.fromDate(startOfDay(new Date()))
    : null;

  try {
    await taskRepository.updateTaskCompletion(taskId, completed, completedDate);
    if (milestoneId) {
      await updateMilestoneProgress(milestoneId);
    }
  } catch (error) {
    console.error("Error updating task completion: ", error);
    throw error;
  }
};

/**
 * Deletes a task and triggers milestone progress update if linked.
 */
export const deleteTask = async (
  taskId: string,
  milestoneId?: string
): Promise<void> => {
  try {
    await taskRepository.deleteTask(taskId);
    if (milestoneId) {
      await updateMilestoneProgress(milestoneId);
    }
  } catch (error) {
    console.error("Error deleting task: ", error);
    throw error;
  }
};

/**
 * Fetches all tasks associated with a specific milestone.
 */
export const getTasksForMilestone = async (
  milestoneId: string
): Promise<Task[]> => {
  if (!milestoneId) {
    console.warn("getTasksForMilestone called without milestoneId");
    return [];
  }
  try {
    return await taskRepository.getTasksForMilestone(milestoneId);
  } catch (error) {
    console.error("Error fetching tasks for milestone: ", error);
    throw error;
  }
};

/**
 * Gets the count of total and completed tasks for a specific milestone.
 */
export const getTaskCountsForMilestone = async (
  milestoneId: string
): Promise<{ total: number; completed: number }> => {
  if (!milestoneId) {
    console.warn("getTaskCountsForMilestone called without milestoneId");
    return { total: 0, completed: 0 };
  }
  try {
    return await taskRepository.getTaskCountsForMilestone(milestoneId);
  } catch (error) {
    console.error("Error fetching task counts for milestone: ", error);
    throw error;
  }
};

/**
 * Deletes all tasks associated with a specific milestone.
 */
export const deleteTasksForMilestone = async (
  milestoneId: string
): Promise<void> => {
  if (!milestoneId) {
    console.warn("deleteTasksForMilestone called without milestoneId");
    return;
  }
  try {
    await taskRepository.deleteTasksForMilestone(milestoneId);
  } catch (error) {
    console.error(
      `Error deleting tasks for milestone ${milestoneId}: `,
      error
    );
    throw new Error("Failed to delete associated tasks.");
  }
};

/**
 * Deletes all tasks from the Firestore 'tasks' collection.
 * WARNING: This permanently deletes all documents in the collection.
 */
export const deleteAllUserTasks = async (): Promise<void> => {
  console.warn(
    "deleteAllUserTasks called. This will delete all documents in the 'tasks' collection."
  );
  try {
    await taskRepository.deleteAllTasks();
  } catch (error) {
    console.error("Error deleting all tasks: ", error);
    throw new Error("Failed to delete all tasks.");
  }
};
