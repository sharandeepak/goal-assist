import { ITaskRepository } from "../interfaces/ITaskRepository";
import { Task } from "@/types";
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
import { startOfDay, endOfDay } from "date-fns";
import { milestoneRepository } from "../index"; // Circular dependency potentially if I am not careful.
// Wait, task service calls updateMilestoneProgress.
// Ideally, the repository should NOT know about other repositories.
// The service layer orchestrates this.
// BUT, the current taskService implementation DOES call updateMilestoneProgress.
// If I move the logic to Repository, should the Repository call another Repository?
// Generally NO. The Service should call TaskRepo.add and then MilestoneRepo.updateProgress.
// The Plan said: "Service log remains here".
// So, the Repository should ONLY do DB operations for its domain.
// The "Service logic (e.g., business rules, combining data) remains here."
// So, addTask in Repository should ONLY add the task.
// The Service's addTask will call TaskRepo.addTask and then MilestoneRepo.updateProgress.
// THIS IS CRITICAL. I need to strip the business logic (orchestration) from the DB logic.

export class FirebaseTaskRepository implements ITaskRepository {
  private collectionRef = collection(db, "tasks");

  subscribeToTaskSummary(
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(this.collectionRef, orderBy("createdAt", "desc"), limit(8));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
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
    const selectedDayStart = Timestamp.fromDate(startOfDay(date));
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
      this.collectionRef,
      where("date", ">=", selectedDayStart),
      where("date", "<=", selectedDayEnd),
      orderBy("date")
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
      throw error;
    }
  }

  async getTodaysTaskSummary(): Promise<{ completed: number; total: number }> {
    const todayStart = Timestamp.fromDate(startOfDay(new Date()));
    const todayEnd = Timestamp.fromDate(endOfDay(new Date()));

    const tasksTodayQuery = query(
      this.collectionRef,
      where("date", ">=", todayStart),
      where("date", "<=", todayEnd)
    );

    const completedTasksTodayQuery = query(tasksTodayQuery, where("completed", "==", true));

    try {
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
      throw error;
    }
  }

  subscribeToTasksByDateRange(
    startDate: Date,
    endDate: Date,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const rangeStart = Timestamp.fromDate(startOfDay(startDate));
    const rangeEnd = Timestamp.fromDate(endOfDay(endDate));

    const q = query(
      this.collectionRef,
      where("date", ">=", rangeStart),
      where("date", "<=", rangeEnd),
      orderBy("date", "asc")
    );

    return onSnapshot(
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
  }

  async addTask(taskData: Omit<Task, 'id'>): Promise<string> {
    // Basic validation should probably be in Service, but DB constraints here?
    // The original code had validation. I'll keep generic validation here or assume service handles it.
    // I will include the transformation logic (createdAt, defaults).
    
    // NOTE: The original service updated milestone progress. checking the orchestration note above.
    // I will ONLY add the doc here.
    
    try {
       const dataToAdd: any = {
            ...taskData,
            completed: taskData.completed ?? false,
            tags: taskData.tags ?? [],
            createdAt: taskData.createdAt ?? Timestamp.now(),
        };
        const docRef = await addDoc(this.collectionRef, dataToAdd);
        return docRef.id;
    } catch (error) {
        console.error("Error adding task: ", error);
        throw error;
    }
  }

  async updateTask(
    taskId: string,
    dataToUpdate: Partial<Omit<Task, 'id' | 'completed' | 'createdAt' | 'milestoneId'>>
  ): Promise<void> {
      const taskDocRef = doc(db, "tasks", taskId);
      try {
          await updateDoc(taskDocRef, dataToUpdate);
      } catch (error) {
          console.error(`Error updating task ${taskId}: `, error);
          throw new Error("Failed to update task details.");
      }
  }

  async updateTaskCompletion(taskId: string, completed: boolean, milestoneId?: string): Promise<void> {
      const taskDocRef = doc(db, "tasks", taskId);
      try {
          await updateDoc(taskDocRef, { completed });
          // Note: milestone progress update is removed from here and moved to service orchestration
      } catch (error) {
          console.error("Error updating task completion: ", error);
          throw error;
      }
  }

  async deleteTask(taskId: string, milestoneId?: string): Promise<void> {
      const taskDocRef = doc(db, "tasks", taskId);
      try {
          await deleteDoc(taskDocRef);
          // Note: milestone progress update is removed from here
      } catch (error) {
          console.error("Error deleting task: ", error);
          throw error;
      }
  }

  async getTasksForMilestone(milestoneId: string): Promise<Task[]> {
      const q = query(
          this.collectionRef,
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
  }

  async getTaskCountsForMilestone(milestoneId: string): Promise<{ total: number; completed: number }> {
      const totalQuery = query(this.collectionRef, where("milestoneId", "==", milestoneId));
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
  }

  async deleteTasksForMilestone(milestoneId: string): Promise<void> {
      const q = query(this.collectionRef, where("milestoneId", "==", milestoneId));
      try {
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) return;

          const batch = writeBatch(db);
          querySnapshot.forEach((doc) => {
              batch.delete(doc.ref);
          });
          await batch.commit();
      } catch (error) {
          console.error(`Error deleting tasks for milestone ${milestoneId}: `, error);
          throw new Error("Failed to delete associated tasks.");
      }
  }

  async deleteAllUserTasks(): Promise<void> {
      try {
        const querySnapshot = await getDocs(this.collectionRef);
        if (querySnapshot.empty) return;
        
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error deleting all tasks: ", error);
        throw new Error("Failed to delete all tasks.");
      }
  }
}
