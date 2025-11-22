import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  where,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { Task } from "@/types";
import { startOfDay, endOfDay } from "date-fns";

export type QuadrantType = "q1" | "q2" | "q3" | "q4" | "all";

export interface QuadrantCounts {
  q1: number; // Urgent + Important
  q2: number; // Not Urgent + Important
  q3: number; // Urgent + Not Important
  q4: number; // Not Urgent + Not Important
  uncategorized: number; // Missing priority or urgency
}

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
  const tasksCollection = collection(db, "tasks");
  
  let q = query(tasksCollection, orderBy("createdAt", "desc"));

  // Add date filter if provided
  if (dateRange) {
    const rangeStart = Timestamp.fromDate(startOfDay(dateRange.start));
    const rangeEnd = Timestamp.fromDate(endOfDay(dateRange.end));
    q = query(
      tasksCollection,
      where("date", ">=", rangeStart),
      where("date", "<=", rangeEnd),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const data: MatrixTasksData = {
        q1: [],
        q2: [],
        q3: [],
        q4: [],
        uncategorized: [],
      };

      querySnapshot.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() } as Task;
        const quadrant = getTaskQuadrant(task);

        if (quadrant === "uncategorized") {
          data.uncategorized.push(task);
        } else {
          data[quadrant].push(task);
        }
      });

      callback(data);
    },
    (error) => {
      console.error("Error fetching matrix tasks: ", error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Updates a task's priority and urgency (for drag-and-drop between quadrants)
 * @param taskId - Task ID to update
 * @param newPriority - New priority level
 * @param newUrgency - New urgency level
 */
export const updateTaskQuadrant = async (
  taskId: string,
  newPriority: "low" | "medium" | "high",
  newUrgency: "low" | "medium" | "high"
): Promise<void> => {
  if (!taskId) throw new Error("Task ID is required");

  const taskDocRef = doc(db, "tasks", taskId);
  
  try {
    await updateDoc(taskDocRef, {
      priority: newPriority,
      urgency: newUrgency,
    });
  } catch (error) {
    console.error(`Error updating task quadrant for ${taskId}: `, error);
    throw new Error("Failed to update task quadrant.");
  }
};

/**
 * Gets the count of tasks in each quadrant
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to quadrant counts
 */
export const getTaskCountsByQuadrant = async (
  dateRange: { start: Date; end: Date } | null
): Promise<QuadrantCounts> => {
  const tasksCollection = collection(db, "tasks");
  
  try {
    let baseQuery = query(tasksCollection);
    
    if (dateRange) {
      const rangeStart = Timestamp.fromDate(startOfDay(dateRange.start));
      const rangeEnd = Timestamp.fromDate(endOfDay(dateRange.end));
      baseQuery = query(
        tasksCollection,
        where("date", ">=", rangeStart),
        where("date", "<=", rangeEnd)
      );
    }

    const snapshot = await getDocs(baseQuery);
    const counts: QuadrantCounts = {
      q1: 0,
      q2: 0,
      q3: 0,
      q4: 0,
      uncategorized: 0,
    };

    snapshot.forEach((doc) => {
      const task = doc.data() as Task;
      const quadrant = getTaskQuadrant(task);
      
      if (quadrant === "uncategorized") {
        counts.uncategorized++;
      } else {
        counts[quadrant]++;
      }
    });

    return counts;
  } catch (error) {
    console.error("Error fetching task counts by quadrant: ", error);
    throw error;
  }
};

/**
 * Bulk update tasks to a new quadrant (useful for batch operations)
 * @param taskIds - Array of task IDs
 * @param priority - New priority
 * @param urgency - New urgency
 */
export const bulkUpdateTasksQuadrant = async (
  taskIds: string[],
  priority: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high"
): Promise<void> => {
  if (taskIds.length === 0) {
    console.warn("bulkUpdateTasksQuadrant called with empty array");
    return;
  }

  const batch = writeBatch(db);

  taskIds.forEach((taskId) => {
    const taskRef = doc(db, "tasks", taskId);
    batch.update(taskRef, { priority, urgency });
  });

  try {
    await batch.commit();
    console.log(`Successfully updated ${taskIds.length} tasks to new quadrant`);
  } catch (error) {
    console.error("Error in bulk update: ", error);
    throw new Error("Failed to bulk update tasks.");
  }
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

