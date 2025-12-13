// taskService.ts
import { Task } from "@/types";
import { Unsubscribe } from "firebase/firestore";
import { taskRepository, milestoneRepository } from "@/repositories";

export const subscribeToTaskSummary = (
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return taskRepository.subscribeToTaskSummary(callback, onError);
};

export const getTasksForDate = async (date: Date): Promise<Task[]> => {
  return taskRepository.getTasksForDate(date);
};

interface TaskSummaryData {
  completed: number;
  total: number;
}

export const getTodaysTaskSummary = async (): Promise<TaskSummaryData> => {
  return taskRepository.getTodaysTaskSummary();
};

export const subscribeToTasksByDateRange = (
  startDate: Date,
  endDate: Date,
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  return taskRepository.subscribeToTasksByDateRange(startDate, endDate, callback, onError);
};

export const addTask = async (taskData: Omit<Task, 'id'>): Promise<string> => {
    if (!taskData.title || !taskData.date || !taskData.priority) {
        throw new Error("Task title, date, and priority are required.");
    }

    try {
        const taskId = await taskRepository.addTask(taskData);

        if (taskData.milestoneId) {
            await milestoneRepository.updateMilestoneProgress(taskData.milestoneId);
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

export const updateTask = async (taskId: string, dataToUpdate: Partial<Omit<Task, 'id' | 'completed' | 'createdAt' | 'milestoneId'>>) => {
    if (!taskId) throw new Error("Task ID is required for update.");
    if (Object.keys(dataToUpdate).length === 0) {
        console.warn("updateTask called with no data to update.");
        return;
    }
    const forbiddenFields: (keyof Task)[] = ['id', 'completed', 'createdAt'];
    for (const field of forbiddenFields) {
        if (field in dataToUpdate) {
            console.warn(`Attempted to update forbidden field '${field}' in updateTask. Ignoring.`);
            delete dataToUpdate[field as keyof typeof dataToUpdate];
        }
    }
    if (Object.keys(dataToUpdate).length === 0) {
         console.warn("updateTask called with only forbidden fields. No update performed.");
         return;
    }

    await taskRepository.updateTask(taskId, dataToUpdate);
};

export const updateTaskCompletion = async (taskId: string, completed: boolean, milestoneId?: string): Promise<void> => {
    try {
        await taskRepository.updateTaskCompletion(taskId, completed, milestoneId);
        if (milestoneId) {
            await milestoneRepository.updateMilestoneProgress(milestoneId);
        }
    } catch (error) {
        console.error("Error updating task completion: ", error);
        throw error;
    }
};

export const deleteTask = async (taskId: string, milestoneId?: string): Promise<void> => {
    try {
        await taskRepository.deleteTask(taskId, milestoneId);
         if (milestoneId) {
            await milestoneRepository.updateMilestoneProgress(milestoneId);
        }
    } catch (error) {
        console.error("Error deleting task: ", error);
        throw error;
    }
};

export const getTasksForMilestone = async (milestoneId: string): Promise<Task[]> => {
    if (!milestoneId) {
        console.warn("getTasksForMilestone called without milestoneId");
        return [];
    }
    return taskRepository.getTasksForMilestone(milestoneId);
};

export const getTaskCountsForMilestone = async (milestoneId: string): Promise<{ total: number; completed: number }> => {
    if (!milestoneId) {
         console.warn("getTaskCountsForMilestone called without milestoneId");
         return { total: 0, completed: 0 };
    }
    return taskRepository.getTaskCountsForMilestone(milestoneId);
};

export const deleteTasksForMilestone = async (milestoneId: string): Promise<void> => {
	if (!milestoneId) {
		console.warn("deleteTasksForMilestone called without milestoneId");
		return;
	}
    await taskRepository.deleteTasksForMilestone(milestoneId);
};

export const deleteAllUserTasks = async (): Promise<void> => {
  await taskRepository.deleteAllUserTasks();
};