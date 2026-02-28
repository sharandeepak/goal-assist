import { db } from "@/common/lib/db";
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
} from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import { Task } from "@/common/types";
import { MatrixRepository } from "./matrixRepository";

export class FirebaseMatrixRepository implements MatrixRepository {
  subscribeToTasks(
    dateRange: { start: Date; end: Date } | null,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const tasksCollection = collection(db, "tasks");

    let q = query(tasksCollection, orderBy("createdAt", "desc"));

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

    return onSnapshot(
      q,
      (querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((docSnap) => {
          tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
        });
        callback(tasks);
      },
      (error) => {
        console.error("Error fetching matrix tasks: ", error);
        onError(error);
      }
    );
  }

  async getTasks(dateRange: { start: Date; end: Date } | null): Promise<Task[]> {
    const tasksCollection = collection(db, "tasks");

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
    const tasks: Task[] = [];
    snapshot.forEach((docSnap) => {
      tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    return tasks;
  }

  async updateTaskQuadrant(
    taskId: string,
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void> {
    if (!taskId) throw new Error("Task ID is required");

    const taskDocRef = doc(db, "tasks", taskId);

    try {
      await updateDoc(taskDocRef, {
        priority,
        urgency,
      });
    } catch (error) {
      console.error(`Error updating task quadrant for ${taskId}: `, error);
      throw new Error("Failed to update task quadrant.");
    }
  }

  async bulkUpdateTasksQuadrant(
    taskIds: string[],
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void> {
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
  }
}
