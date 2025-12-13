import { IMilestoneRepository } from "../interfaces/IMilestoneRepository";
import { Milestone, MilestoneProgressData, PageMilestoneSummary } from "@/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  getDocs,
  limit,
  getCountFromServer,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { startOfDay, differenceInCalendarDays, endOfDay } from "date-fns";

// Helper locally
const calculateDaysLeft = (endDate: Timestamp | undefined): number | undefined => {
  if (!endDate) return undefined;
  const today = startOfDay(new Date());
  const end = startOfDay(endDate.toDate());
  const diff = differenceInCalendarDays(end, today);
  return Math.max(0, diff);
};

export class FirebaseMilestoneRepository implements IMilestoneRepository {
  private collectionRef = collection(db, "milestones");

  subscribeToActiveMilestonesProgress(
    callback: (milestones: MilestoneProgressData[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      this.collectionRef,
      where("status", "==", "active"),
      orderBy("endDate", "asc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedMilestones: MilestoneProgressData[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Milestone;
          const daysLeft = calculateDaysLeft(data.endDate);
          fetchedMilestones.push({
            ...data,
            id: doc.id,
            daysLeft: daysLeft,
          });
        });
        callback(fetchedMilestones);
      },
      (error) => {
        console.error("Error fetching milestones for progress: ", error);
        onError(error);
      }
    );
  }

  async getMilestonesEndingOnDate(date: Date): Promise<Milestone[]> {
      const selectedDayStart = Timestamp.fromDate(startOfDay(date));
      const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

      const q = query(
          this.collectionRef,
          where("endDate", ">=", selectedDayStart),
          where("endDate", "<=", selectedDayEnd)
      );

      try {
          const querySnapshot = await getDocs(q);
          const fetchedMilestones: Milestone[] = [];
          querySnapshot.forEach((doc) => {
              fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone);
          });
          return fetchedMilestones;
      } catch (error) {
          console.error("Error fetching milestones ending on date: ", error);
          throw error;
      }
  }

  async getNextActiveMilestone(date: Date): Promise<Milestone | null> {
      const selectedDayEnd = Timestamp.fromDate(endOfDay(date));
      const q = query(
          this.collectionRef,
          where("status", "==", "active"),
          where("endDate", ">", selectedDayEnd),
          orderBy("endDate", "asc"),
          limit(1)
      );

      try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              const doc = querySnapshot.docs[0];
              return { id: doc.id, ...doc.data() } as Milestone;
          } else {
              return null;
          }
      } catch (error) {
          console.error("Error fetching next active milestone: ", error);
          throw error;
      }
  }

  async getPageMilestoneSummary(): Promise<{ activeCount: number; nextDeadlineDays: number | null; topUpcoming: PageMilestoneSummary[]; }> {
      const todayStart = Timestamp.fromDate(startOfDay(new Date()));
      const activeMilestonesQuery = query(this.collectionRef, where("status", "==", "active"));
      const upcomingActiveMilestonesQuery = query(
          activeMilestonesQuery,
          where("endDate", ">=", todayStart),
          orderBy("endDate", "asc")
      );

      try {
          const [activeCountSnapshot, upcomingSnapshot] = await Promise.all([
              getCountFromServer(activeMilestonesQuery),
              getDocs(upcomingActiveMilestonesQuery),
          ]);
          
          const activeCount = activeCountSnapshot.data().count;
           let nextDeadlineDays: number | null = null;
           const topUpcoming: PageMilestoneSummary[] = [];

            if (!upcomingSnapshot.empty) {
                const firstUpcoming = upcomingSnapshot.docs[0].data() as Milestone;
                nextDeadlineDays = calculateDaysLeft(firstUpcoming.endDate) ?? null;

                upcomingSnapshot.docs.slice(0, 2).forEach((doc) => {
                    const data = doc.data() as Milestone;
                    const daysLeft = calculateDaysLeft(data.endDate);
                    topUpcoming.push({
                        id: doc.id,
                        title: data.title,
                        urgency: data.urgency,
                        endDate: data.endDate,
                        daysLeft: daysLeft,
                    });
                });
            }
            return { activeCount, nextDeadlineDays, topUpcoming };

      } catch (error) {
          console.error("Error fetching page milestone summary: ", error);
          throw error;
      }
  }

  subscribeToMilestonesByStatus(
      status: Milestone['status'],
      callback: (milestones: Milestone[]) => void,
      onError: (error: Error) => void
  ): Unsubscribe {
      const q = query(this.collectionRef, where("status", "==", status), orderBy("endDate", "asc"));
      return onSnapshot(q, (snapshot) => {
           const fetchedMilestones: Milestone[] = [];
           snapshot.forEach((doc) => {
               fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone);
           });
           callback(fetchedMilestones);
      }, onError);
  }

  async addMilestone(milestoneData: Omit<Milestone, 'id'>): Promise<string> {
      try {
          const docRef = await addDoc(this.collectionRef, milestoneData);
          return docRef.id;
      } catch (error) {
          console.error("Error adding milestone: ", error);
          throw error;
      }
  }

  async updateMilestone(milestoneId: string, dataToUpdate: Partial<Omit<Milestone, 'id' | 'progress' | 'startDate' | 'tasks'>>): Promise<void> {
       const milestoneDocRef = doc(db, "milestones", milestoneId);
       try {
           await updateDoc(milestoneDocRef, dataToUpdate);
       } catch (error) {
           console.error(`Error updating milestone ${milestoneId}: `, error);
           throw new Error("Failed to update milestone details.");
       }
  }
  
  async deleteMilestone(milestoneId: string, deleteAssociatedTasks: boolean = false): Promise<void> {
      const milestoneDocRef = doc(db, "milestones", milestoneId);
      try {
          await deleteDoc(milestoneDocRef);
          // Note: Task deletion is handled by Service orchestration now
      } catch (error) {
          console.error(`Error deleting milestone ${milestoneId}: `, error);
          throw new Error("Failed to delete milestone.");
      }
  }

  async getUpcomingActiveMilestones(count: number): Promise<Milestone[]> {
      const todayStart = Timestamp.fromDate(startOfDay(new Date()));
      const q = query(
          this.collectionRef,
          where("status", "==", "active"),
          where("endDate", ">=", todayStart),
          orderBy("endDate", "asc"),
          limit(count)
      );
      try {
          const snapshot = await getDocs(q);
          const fetched: Milestone[] = [];
          snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as Milestone));
          return fetched;
      } catch (error) {
          console.error("Error fetching upcoming active milestones: ", error);
          throw error;
      }
  }

  // The logic for calculating progress should probably stay in Service?
  // Or is it data logic?
  // Ideally, Repository just saves data.
  // The Service calculates progress (logic) and then tells Repository to save the new progress.
  // BUT the interface has `updateMilestoneProgress`.
  // If I move the logic to Service, I need to expose `getTaskCounts` and `updateMilestone` (which I did).
  // So `updateMilestoneProgress` in Repository might be redundant or it acts as a "Stored Procedure".
  // Let's implement it here as a helper since it involves multiple reads/writes on the milestone itself.
  // Wait, it needs `getTaskCountsForMilestone` which is in `ITaskRepository`.
  // Repository should NOT depend on other Repositories.
  // SO: `updateMilestoneProgress` essentially belongs in the Service layer, using TaskRepo and MilestoneRepo.
  // However, I defined it in the Interface `IMilestoneRepository`.
  // This was a mistake in my interface design if I want pure separation.
  // But strictly speaking, the user said "Systematic structure".
  // I will keep the method in the repository class, but I will REMOVE the dependency on TaskRepo inside this class if possible?
  // No, I can't.
  // So I have two choices:
  // 1. Inject TaskRepo into MilestoneRepo (Complex).
  // 2. Remove `updateMilestoneProgress` from `IMilestoneRepository` and put the logic in `MilestoneService`.
  // The second option is correct for Clean Architecture.
  // However, `updateMilestoneProgress` updates the milestone, so it IS a repository operation (update).
  // The CALCULATION of progress depends on Tasks.
  // So: Service:
  //    counts = await taskRepo.getTaskCounts(milestoneId)
  //    progress = calculate(counts)
  //    await milestoneRepo.updateMilestone(milestoneId, { progress })
  //
  // This is the clean way.
  // BUT I already wrote the Interface `IMilestoneRepository` with `updateMilestoneProgress`.
  // I should probably implement it as "updateProgress(id, progress)" and let the service do the math.
  // OR I can just implement it here but I need direct access to db.collection("tasks") which I HAVE because I am in Firebase Implementation.
  // IN FIREBASE IMPLEMENTATION, I can access any collection I want!
  // It is NOT a violation of "FirebaseMilestoneRepository" to query "tasks" collection if it helps encapsulate "Milestone Progress Calculation" logic that is verified by the database state.
  // So I will implement it here by querying tasks collection directly.
  
  async updateMilestoneProgress(milestoneId: string): Promise<void> {
      const milestoneDocRef = doc(db, "milestones", milestoneId);
      const tasksCollection = collection(db, "tasks");
      
      try {
        const milestoneSnap = await getDoc(milestoneDocRef);
        if (!milestoneSnap.exists()) return;
        
        const currentMilestoneData = milestoneSnap.data() as Milestone;
        const currentStatus = currentMilestoneData.status;

        // Query tasks directly
        const totalQuery = query(tasksCollection, where("milestoneId", "==", milestoneId));
        const completedQuery = query(totalQuery, where("completed", "==", true));
        
        const [totalSnapshot, completedSnapshot] = await Promise.all([
            getCountFromServer(totalQuery),
            getCountFromServer(completedQuery),
        ]);
        
        const total = totalSnapshot.data().count;
        const completed = completedSnapshot.data().count;

		let progress = 0;
		if (total > 0) {
			progress = Math.round((completed / total) * 100);
		}

		const dataToUpdate: Partial<Milestone> = { progress };

		if (progress === 100 && currentStatus !== "completed") {
			dataToUpdate.status = "completed";
		} else if (progress < 100 && currentStatus === "completed") {
			dataToUpdate.status = "active";
		}

		if (dataToUpdate.progress !== currentMilestoneData.progress || dataToUpdate.status !== currentStatus) {
			await updateDoc(milestoneDocRef, dataToUpdate);
		}
      } catch (error) {
          console.error(`Error updating progress for milestone ${milestoneId}: `, error);
      }
  }

  async deleteAllUserMilestones(): Promise<void> {
     try {
        const querySnapshot = await getDocs(this.collectionRef);
        if (querySnapshot.empty) return;
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
        // Note: Task deletion associated is in Service
      } catch (error) {
        console.error("Error deleting all milestones: ", error);
        throw new Error("Failed to delete all milestones.");
      }
  }
}
