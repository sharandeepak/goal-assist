import { db } from "@/common/lib/db";
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
  writeBatch,
} from "firebase/firestore";
import { Task } from "@/common/types";
import { startOfDay, endOfDay } from "date-fns";
import { TaskRepository, TaskSummaryData } from "./taskRepository";

export class FirebaseTaskRepository implements TaskRepository {
  subscribeTasks(
    startDate: Date,
    endDate: Date,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const tasksCollection = collection(db, "tasks");
    const rangeStart = Timestamp.fromDate(startOfDay(startDate));
    const rangeEnd = Timestamp.fromDate(endOfDay(endDate));

    const q = query(
      tasksCollection,
      where("date", ">=", rangeStart),
      where("date", "<=", rangeEnd),
      orderBy("date", "asc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
        });
        callback(fetchedTasks);
      },
      (error) => {
        console.error(
          `Error fetching tasks from ${startDate.toISOString()} to ${endDate.toISOString()}: `,
          error
        );
        onError(error);
      }
    );
  }

  subscribeTaskSummary(
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const tasksCollection = collection(db, "tasks");
    const q = query(tasksCollection, orderBy("createdAt", "desc"), limit(8));

    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
        });
        callback(fetchedTasks);
      },
      (error) => {
        console.error("Error fetching tasks: ", error);
        onError(error);
      }
    );
  }

  async getTasksForDate(date: Date): Promise<Task[]> {
    const tasksCollection = collection(db, "tasks");
    const selectedDayStart = Timestamp.fromDate(startOfDay(date));
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
      tasksCollection,
      where("date", ">=", selectedDayStart),
      where("date", "<=", selectedDayEnd),
      orderBy("date")
    );

    const querySnapshot = await getDocs(q);
    const fetchedTasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    return fetchedTasks;
  }

  async getTasksForMilestone(milestoneId: string): Promise<Task[]> {
    if (!milestoneId) return [];

    const tasksCollection = collection(db, "tasks");
    const q = query(
      tasksCollection,
      where("milestoneId", "==", milestoneId),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const fetchedTasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    return fetchedTasks;
  }

  async getTaskCountsForMilestone(
    milestoneId: string
  ): Promise<{ total: number; completed: number }> {
    if (!milestoneId) return { total: 0, completed: 0 };

    const tasksCollection = collection(db, "tasks");
    const totalQuery = query(
      tasksCollection,
      where("milestoneId", "==", milestoneId)
    );
    const completedQuery = query(totalQuery, where("completed", "==", true));

    const [totalSnapshot, completedSnapshot] = await Promise.all([
      getCountFromServer(totalQuery),
      getCountFromServer(completedQuery),
    ]);

    return {
      total: totalSnapshot.data().count,
      completed: completedSnapshot.data().count,
    };
  }

  async getTodaysTaskSummary(): Promise<TaskSummaryData> {
    const tasksCollection = collection(db, "tasks");
    const todayStart = Timestamp.fromDate(startOfDay(new Date()));
    const todayEnd = Timestamp.fromDate(endOfDay(new Date()));

    const tasksTodayQuery = query(
      tasksCollection,
      where("date", ">=", todayStart),
      where("date", "<=", todayEnd)
    );
    const completedTasksTodayQuery = query(
      tasksTodayQuery,
      where("completed", "==", true)
    );

    const [totalSnapshot, completedSnapshot] = await Promise.all([
      getCountFromServer(tasksTodayQuery),
      getCountFromServer(completedTasksTodayQuery),
    ]);

    return {
      total: totalSnapshot.data().count,
      completed: completedSnapshot.data().count,
    };
  }

  async addTask(taskData: Omit<Task, "id">): Promise<string> {
    const tasksCollection = collection(db, "tasks");
    const dataToAdd: Omit<Task, "id"> & { createdAt: Timestamp } = {
      ...taskData,
      completed: taskData.completed ?? false,
      tags: taskData.tags ?? [],
      createdAt: taskData.createdAt ?? Timestamp.now(),
    };

    const docRef = await addDoc(tasksCollection, dataToAdd);
    return docRef.id;
  }

  async updateTask(
    taskId: string,
    dataToUpdate: Partial<
      Omit<Task, "id" | "completed" | "createdAt" | "milestoneId">
    >
  ): Promise<void> {
    if (Object.keys(dataToUpdate).length === 0) return;

    const taskDocRef = doc(db, "tasks", taskId);
    await updateDoc(taskDocRef, dataToUpdate);
  }

  async updateTaskCompletion(
    taskId: string,
    completed: boolean,
    completedDate: Timestamp | null
  ): Promise<void> {
    const taskDocRef = doc(db, "tasks", taskId);
    const updateData: Record<string, boolean | typeof completedDate> = {
      completed,
      completedDate,
    };
    await updateDoc(taskDocRef, updateData);
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskDocRef = doc(db, "tasks", taskId);
    await deleteDoc(taskDocRef);
  }

  async deleteTasksForMilestone(milestoneId: string): Promise<void> {
    if (!milestoneId) return;

    const tasksCollection = collection(db, "tasks");
    const q = query(
      tasksCollection,
      where("milestoneId", "==", milestoneId)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  async deleteAllTasks(): Promise<void> {
    const tasksCollectionRef = collection(db, "tasks");
    const querySnapshot = await getDocs(tasksCollectionRef);
    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });
    await batch.commit();
  }
}

export const defaultTaskRepository = new FirebaseTaskRepository();
