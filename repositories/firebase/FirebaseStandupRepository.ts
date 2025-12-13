import { IStandupRepository } from "../interfaces/IStandupRepository";
import { StandupLog } from "@/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  addDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";

export class FirebaseStandupRepository implements IStandupRepository {
  private collectionRef = collection(db, "standup_logs");

  subscribeToRecentStandups(
    callback: (logs: StandupLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(this.collectionRef, orderBy("date", "desc"), limit(2));
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedLogs: StandupLog[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push({ id: doc.id, ...doc.data() } as StandupLog);
        });
        callback(fetchedLogs);
      },
      (error) => {
        console.error("Error fetching standup logs: ", error);
        onError(error);
      }
    );
  }

  async addStandupLog(logData: Omit<StandupLog, "id">): Promise<string> {
      try {
          const dataToAdd = {
              ...logData,
              date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
              notes: logData.notes ?? "",
          };
          const docRef = await addDoc(this.collectionRef, dataToAdd);
          return docRef.id;
      } catch (error) {
          console.error("Error adding standup log: ", error);
          throw error;
      }
  }

  async deleteAllUserStandupLogs(): Promise<void> {
      try {
          const querySnapshot = await getDocs(this.collectionRef);
          if (querySnapshot.empty) return;
          const batch = writeBatch(db);
          querySnapshot.forEach((document) => {
              batch.delete(document.ref);
          });
          await batch.commit();
      } catch (error) {
          console.error("Error deleting all standup logs: ", error);
          throw new Error("Failed to delete all standup logs.");
      }
  }
}
