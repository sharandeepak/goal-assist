import { db } from "@/common/lib/db";
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
import { startOfDay, endOfDay } from "date-fns";
import { Milestone } from "@/common/types";
import {
  MilestoneRepository,
  MilestonePageSummaryData,
} from "./milestoneRepository";
import { calculateDaysLeft } from "../utils";

export class FirebaseMilestoneRepository implements MilestoneRepository {
  subscribeToMilestonesByStatus(
    status: Milestone["status"],
    callback: (milestones: Milestone[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const milestonesCollection = collection(db, "milestones");
    const q = query(
      milestonesCollection,
      where("status", "==", status),
      orderBy("endDate", "asc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedMilestones: Milestone[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedMilestones.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as Milestone);
        });
        callback(fetchedMilestones);
      },
      (error) => {
        console.error(`Error fetching ${status} milestones: `, error);
        onError(error);
      }
    );
  }

  subscribeToActiveMilestonesProgress(
    callback: (milestones: Milestone[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const milestonesCollection = collection(db, "milestones");
    const q = query(
      milestonesCollection,
      where("status", "==", "active"),
      orderBy("endDate", "asc")
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedMilestones: Milestone[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedMilestones.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as Milestone);
        });
        callback(fetchedMilestones);
      },
      (error) => {
        console.error("Error fetching milestones for progress: ", error);
        onError(error);
      }
    );
  }

  async getPageMilestoneSummary(): Promise<MilestonePageSummaryData> {
    const milestonesCollection = collection(db, "milestones");
    const todayStart = Timestamp.fromDate(startOfDay(new Date()));

    const activeMilestonesQuery = query(
      milestonesCollection,
      where("status", "==", "active")
    );

    const upcomingActiveMilestonesQuery = query(
      activeMilestonesQuery,
      where("endDate", ">=", todayStart),
      orderBy("endDate", "asc")
    );

    const [activeCountSnapshot, upcomingSnapshot] = await Promise.all([
      getCountFromServer(activeMilestonesQuery),
      getDocs(upcomingActiveMilestonesQuery),
    ]);

    const activeCount = activeCountSnapshot.data().count;
    let nextDeadlineDays: number | null = null;
    const topUpcoming: MilestonePageSummaryData["topUpcoming"] = [];

    if (!upcomingSnapshot.empty) {
      const firstUpcoming = upcomingSnapshot.docs[0].data() as Milestone;
      nextDeadlineDays = calculateDaysLeft(firstUpcoming.endDate) ?? null;

      upcomingSnapshot.docs.slice(0, 2).forEach((docSnap) => {
        const data = docSnap.data() as Milestone;
        const daysLeft = calculateDaysLeft(data.endDate);
        topUpcoming.push({
          id: docSnap.id,
          title: data.title,
          urgency: data.urgency,
          daysLeft,
        });
      });
    }

    return {
      activeCount,
      nextDeadlineDays,
      topUpcoming,
    };
  }

  async getNextActiveMilestone(date: Date): Promise<Milestone | null> {
    const milestonesCollection = collection(db, "milestones");
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
      milestonesCollection,
      where("status", "==", "active"),
      where("endDate", ">", selectedDayEnd),
      orderBy("endDate", "asc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Milestone;
    }
    return null;
  }

  async getUpcomingActiveMilestones(count: number): Promise<Milestone[]> {
    const milestonesCollection = collection(db, "milestones");
    const todayStart = Timestamp.fromDate(startOfDay(new Date()));

    const q = query(
      milestonesCollection,
      where("status", "==", "active"),
      where("endDate", ">=", todayStart),
      orderBy("endDate", "asc"),
      limit(count)
    );

    const querySnapshot = await getDocs(q);
    const fetchedMilestones: Milestone[] = [];
    querySnapshot.forEach((docSnap) => {
      fetchedMilestones.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Milestone);
    });
    return fetchedMilestones;
  }

  async getMilestonesEndingOnDate(date: Date): Promise<Milestone[]> {
    const milestonesCollection = collection(db, "milestones");
    const selectedDayStart = Timestamp.fromDate(startOfDay(date));
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
      milestonesCollection,
      where("endDate", ">=", selectedDayStart),
      where("endDate", "<=", selectedDayEnd)
    );

    const querySnapshot = await getDocs(q);
    const fetchedMilestones: Milestone[] = [];
    querySnapshot.forEach((docSnap) => {
      fetchedMilestones.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Milestone);
    });
    return fetchedMilestones;
  }

  async getMilestoneById(milestoneId: string): Promise<Milestone | null> {
    const milestoneDocRef = doc(db, "milestones", milestoneId);
    const snapshot = await getDoc(milestoneDocRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Milestone;
  }

  async addMilestone(milestoneData: Omit<Milestone, "id">): Promise<string> {
    const milestonesCollection = collection(db, "milestones");
    const dataToAdd = { ...milestoneData };
    if (!dataToAdd.startDate) {
      dataToAdd.startDate = Timestamp.now();
    }
    if (!dataToAdd.status) {
      dataToAdd.status = "active";
    }
    if (dataToAdd.progress === undefined) {
      dataToAdd.progress = 0;
    }
    if (!dataToAdd.tasks) {
      dataToAdd.tasks = [];
    }

    const docRef = await addDoc(milestonesCollection, dataToAdd);
    return docRef.id;
  }

  async updateMilestone(
    milestoneId: string,
    dataToUpdate: Partial<Omit<Milestone, "id" | "progress" | "startDate" | "tasks">>
  ): Promise<void> {
    if (Object.keys(dataToUpdate).length === 0) return;

    const milestoneDocRef = doc(db, "milestones", milestoneId);
    await updateDoc(milestoneDocRef, dataToUpdate);
  }

  async updateMilestoneProgress(
    milestoneId: string,
    data: { progress: number; status?: Milestone["status"] }
  ): Promise<void> {
    const milestoneDocRef = doc(db, "milestones", milestoneId);
    await updateDoc(milestoneDocRef, data);
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    const milestoneDocRef = doc(db, "milestones", milestoneId);
    await deleteDoc(milestoneDocRef);
  }

  async getAllMilestoneIds(): Promise<string[]> {
    const milestonesCollectionRef = collection(db, "milestones");
    const querySnapshot = await getDocs(milestonesCollectionRef);
    return querySnapshot.docs.map((d) => d.id);
  }

  async deleteAllMilestones(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(db, "milestones", id));
    }
    await batch.commit();
  }
}
