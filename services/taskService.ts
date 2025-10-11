import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  getDocs,
  where,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from "firebase/firestore";
import { Task, Milestone } from "@/types"; // Import the shared Task interface
import { startOfDay, endOfDay } from "date-fns";
import { updateMilestoneProgress } from "./milestoneService"; // Import milestone progress updater

/**
 * Subscribes to the latest tasks for the Task Summary component.
 * @param callback - Function to call with the updated tasks array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToTaskSummary = (
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const tasksCollection = collection(db, "tasks");
  // Query to get the latest 8 tasks, ordered by creation time (adjust if needed)
  // Consider adding a filter for tasks relevant to the summary (e.g., today's, incomplete)
  const q = query(tasksCollection, orderBy("createdAt", "desc"), limit(8));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const fetchedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        // Ensure data conforms to the Task interface
        fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      callback(fetchedTasks);
    },
    (error) => {
      console.error("Error fetching tasks: ", error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Fetches tasks scheduled for a specific date.
 * @param date - The date to fetch tasks for.
 * @returns A promise resolving to an array of Tasks.
 */
export const getTasksForDate = async (date: Date): Promise<Task[]> => {
    const tasksCollection = collection(db, "tasks");
    const selectedDayStart = Timestamp.fromDate(startOfDay(date));
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
        tasksCollection,
        where("date", ">=", selectedDayStart),
        where("date", "<=", selectedDayEnd),
        orderBy("date") // Or orderBy("createdAt") if preferred
    );

    try {
        const querySnapshot = await getDocs(q);
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
            fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        return fetchedTasks;
    } catch (error) {
        console.error("Error fetching tasks for date: ", error);
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Interface for the summary data
interface TaskSummaryData {
  completed: number;
  total: number;
}

/**
 * Fetches the total and completed count of tasks for today.
 * Assumes tasks have a 'date' field.
 * @returns A promise resolving to TaskSummaryData.
 */
export const getTodaysTaskSummary = async (): Promise<TaskSummaryData> => {
  const tasksCollection = collection(db, "tasks");
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));
  const todayEnd = Timestamp.fromDate(endOfDay(new Date()));

  // Query for tasks within today
  const tasksTodayQuery = query(
    tasksCollection,
    where("date", ">=", todayStart),
    where("date", "<=", todayEnd)
  );

  // Query for completed tasks within today
  const completedTasksTodayQuery = query(tasksTodayQuery, where("completed", "==", true));

  try {
    // Fetch counts concurrently
    const [totalSnapshot, completedSnapshot] = await Promise.all([
      getCountFromServer(tasksTodayQuery),
      getCountFromServer(completedTasksTodayQuery),
    ]);

    return {
      total: totalSnapshot.data().count,
      completed: completedSnapshot.data().count,
    };
  } catch (error) {
    console.error("Error fetching today's task summary: ", error);
    throw error; // Re-throw for the caller
  }
};

/**
 * Subscribes to tasks within a specific date range.
 * @param startDate - The start date of the range.
 * @param endDate - The end date of the range.
 * @param callback - Function to call with the updated tasks array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToTasksByDateRange = (
  startDate: Date,
  endDate: Date,
  callback: (tasks: Task[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const tasksCollection = collection(db, "tasks");
  const rangeStart = Timestamp.fromDate(startOfDay(startDate));
  const rangeEnd = Timestamp.fromDate(endOfDay(endDate));

  const q = query(
    tasksCollection,
    where("date", ">=", rangeStart),
    where("date", "<=", rangeEnd),
    orderBy("date", "asc") // Order chronologically
    // Add orderBy("createdAt") as a secondary sort if needed
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const fetchedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      callback(fetchedTasks);
    },
    (error) => {
      console.error(`Error fetching tasks from ${startDate.toISOString()} to ${endDate.toISOString()}: `, error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Adds a new task to the Firestore collection.
 * Requires title, date, and priority.
 * Can optionally link the task to a milestone.
 * @param taskData - Object containing the new task data (excluding id). MUST include title, date, priority.
 * @returns A promise resolving with the ID of the newly created task.
 * @throws Error if required fields (title, date, priority) are missing.
 */
export const addTask = async (taskData: Omit<Task, 'id'>): Promise<string> => {
    if (!taskData.title || !taskData.date || !taskData.priority) {
        throw new Error("Task title, date, and priority are required.");
    }

    const tasksCollection = collection(db, "tasks");
    try {
        const dataToAdd: Omit<Task, 'id'> & { createdAt: Timestamp } = {
            ...taskData,
            completed: taskData.completed ?? false, // Default completed to false
            tags: taskData.tags ?? [],         // Default tags to empty array
            createdAt: taskData.createdAt ?? Timestamp.now(), // Add createdAt
            // milestoneId is optional and comes from taskData if provided
        };

        const docRef = await addDoc(tasksCollection, dataToAdd);

        // If the task is linked to a milestone (check original input), update the milestone's progress
        if (taskData.milestoneId) {
            await updateMilestoneProgress(taskData.milestoneId);
        }
        return docRef.id;
    } catch (error) {
        console.error("Error adding task: ", error);
        // Re-throw the specific error or a generic one
        if (error instanceof Error && error.message.includes("required")) {
            throw error;
        }
        throw new Error("Failed to add task."); // Generic error for other issues
    }
};

/**
 * Updates specific fields of an existing task.
 * Does not update completion status (use updateTaskCompletion for that).
 * @param taskId - The ID of the task to update.
 * @param dataToUpdate - An object containing the fields to update (e.g., { title, priority, date, tags, description }).
 * @returns A promise resolving when the update is complete.
 */
export const updateTask = async (taskId: string, dataToUpdate: Partial<Omit<Task, 'id' | 'completed' | 'createdAt' | 'milestoneId'>>) => {
    if (!taskId) throw new Error("Task ID is required for update.");
    if (Object.keys(dataToUpdate).length === 0) {
        console.warn("updateTask called with no data to update.");
        return; // No changes needed
    }
    // Prevent accidentally updating forbidden fields
    const forbiddenFields: (keyof Task)[] = ['id', 'completed', 'createdAt']; // Remove milestoneId
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

    const taskDocRef = doc(db, "tasks", taskId);
    try {
        await updateDoc(taskDocRef, dataToUpdate);
    } catch (error) {
        console.error(`Error updating task ${taskId}: `, error);
        throw new Error("Failed to update task details.");
    }
};

/**
 * Updates the completion status of a task and triggers milestone progress update if linked.
 * @param taskId - The ID of the task to update.
 * @param completed - The new completion status (boolean).
 * @param milestoneId - Optional ID of the milestone this task belongs to.
 * @returns A promise resolving when the update is complete.
 */
export const updateTaskCompletion = async (taskId: string, completed: boolean, milestoneId?: string): Promise<void> => {
    const taskDocRef = doc(db, "tasks", taskId);
    try {
        await updateDoc(taskDocRef, { completed });
        if (milestoneId) {
            await updateMilestoneProgress(milestoneId);
        }
    } catch (error) {
        console.error("Error updating task completion: ", error);
        throw error;
    }
};

/**
 * Deletes a task from Firestore and triggers milestone progress update if linked.
 * @param taskId - The ID of the task to delete.
 * @param milestoneId - Optional ID of the milestone this task belongs to.
 * @returns A promise resolving when the task is deleted.
 */
export const deleteTask = async (taskId: string, milestoneId?: string): Promise<void> => {
    const taskDocRef = doc(db, "tasks", taskId);
    try {
        await deleteDoc(taskDocRef);
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
 * @param milestoneId - The ID of the milestone.
 * @returns A promise resolving to an array of Tasks.
 */
export const getTasksForMilestone = async (milestoneId: string): Promise<Task[]> => {
    if (!milestoneId) {
        console.warn("getTasksForMilestone called without milestoneId");
        return [];
    }
    const tasksCollection = collection(db, "tasks");
    const q = query(
        tasksCollection,
        where("milestoneId", "==", milestoneId),
        orderBy("createdAt", "asc")
    );

    try {
        const querySnapshot = await getDocs(q);
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
            fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        return fetchedTasks;
    } catch (error) {
        console.error("Error fetching tasks for milestone: ", error);
        throw error;
    }
};

/**
 * Gets the count of total and completed tasks for a specific milestone.
 * @param milestoneId - The ID of the milestone.
 * @returns A promise resolving to an object with total and completed counts.
 */
export const getTaskCountsForMilestone = async (milestoneId: string): Promise<{ total: number; completed: number }> => {
    if (!milestoneId) {
         console.warn("getTaskCountsForMilestone called without milestoneId");
         return { total: 0, completed: 0 };
    }
    const tasksCollection = collection(db, "tasks");
    const totalQuery = query(tasksCollection, where("milestoneId", "==", milestoneId));
    const completedQuery = query(totalQuery, where("completed", "==", true));

    try {
        const [totalSnapshot, completedSnapshot] = await Promise.all([
            getCountFromServer(totalQuery),
            getCountFromServer(completedQuery),
        ]);

        return {
            total: totalSnapshot.data().count,
            completed: completedSnapshot.data().count,
        };
    } catch (error) {
        console.error("Error fetching task counts for milestone: ", error);
        throw error;
    }
};

/**
 * Deletes all tasks associated with a specific milestone.
 * @param milestoneId - The ID of the milestone whose tasks should be deleted.
 * @returns A promise resolving when the batch deletion is complete.
 */
export const deleteTasksForMilestone = async (milestoneId: string): Promise<void> => {
	if (!milestoneId) {
		console.warn("deleteTasksForMilestone called without milestoneId");
		return;
	}
	const tasksCollection = collection(db, "tasks");
	const q = query(tasksCollection, where("milestoneId", "==", milestoneId));

	try {
		const querySnapshot = await getDocs(q);
		if (querySnapshot.empty) {
			console.log(`No tasks found for milestone ${milestoneId} to delete.`);
			return; // Nothing to delete
		}

		const batch = writeBatch(db);
		querySnapshot.forEach((doc) => {
			batch.delete(doc.ref); // Add each task deletion to the batch
		});

		await batch.commit(); // Commit the batch deletion
		console.log(`Successfully deleted ${querySnapshot.size} tasks for milestone ${milestoneId}.`);
	} catch (error) {
		console.error(`Error deleting tasks for milestone ${milestoneId}: `, error);
		throw new Error("Failed to delete associated tasks."); // Re-throw or handle as needed
	}
};

/**
 * Deletes all tasks from the Firestore 'tasks' collection.
 * WARNING: This permanently deletes all documents in the collection.
 * @returns A promise resolving when the deletion is complete.
 * @throws Error if deletion fails.
 */
export const deleteAllUserTasks = async (): Promise<void> => {
  console.warn(
    "deleteAllUserTasks called. This will delete all documents in the 'tasks' collection."
  );
  const tasksCollectionRef = collection(db, "tasks");
  try {
    const querySnapshot = await getDocs(tasksCollectionRef);
    if (querySnapshot.empty) {
      console.log("No tasks found in 'tasks' collection to delete.");
      return;
    }
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });
    await batch.commit();
    console.log(`Successfully deleted ${querySnapshot.size} tasks from 'tasks' collection.`);
  } catch (error) {
    console.error("Error deleting all tasks: ", error);
    throw new Error("Failed to delete all tasks.");
  }
}; 