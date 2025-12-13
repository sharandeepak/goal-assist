import { ISatisfactionRepository, SatisfactionEntry } from "../interfaces/ISatisfactionRepository";
import { SatisfactionLog } from "@/types";
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
  addDoc,
  writeBatch,
  where,
  updateDoc,
  doc
} from "firebase/firestore";

export class FirebaseSatisfactionRepository implements ISatisfactionRepository {
  private collectionRef = collection(db, "satisfaction_logs");

  subscribeToSatisfactionLogs(
    callback: (logs: SatisfactionLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(this.collectionRef, orderBy("date", "desc"), limit(7));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedLogs: SatisfactionLog[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push({ id: doc.id, ...doc.data() } as SatisfactionLog);
        });
        callback(fetchedLogs);
      },
      (error) => {
        console.error("Error fetching satisfaction logs: ", error);
        onError(error);
      }
    );
  }

  async getSatisfactionSummary(): Promise<{ currentScore: number | null; change: number | null }> {
      const q = query(this.collectionRef, orderBy("date", "desc"), limit(2));
      try {
          const querySnapshot = await getDocs(q);
          let currentScore: number | null = null;
          let change: number | null = null;

           if (!querySnapshot.empty) {
            const latestLog = querySnapshot.docs[0].data() as SatisfactionLog;
            currentScore = latestLog.score;

            if (querySnapshot.docs.length > 1) {
                const previousLog = querySnapshot.docs[1].data() as SatisfactionLog;
                if (typeof currentScore === "number" && typeof previousLog.score === "number") {
                    change = currentScore - previousLog.score;
                }
            }
        }
        return { currentScore, change };
      } catch (error) {
          console.error("Error fetching satisfaction summary: ", error);
          throw error;
      }
  }

  async addSatisfactionLog(logData: Omit<SatisfactionLog, "id">): Promise<string> {
      try {
           const dataToAdd = {
            ...logData,
            date: logData.date instanceof Timestamp ? logData.date : Timestamp.fromDate(new Date(logData.date)),
            notes: logData.notes ?? "",
        };
        const docRef = await addDoc(this.collectionRef, dataToAdd);
        return docRef.id;
      } catch (error) {
           console.error("Error adding satisfaction log: ", error);
           throw error;
      }
  }

  async deleteAllUserSatisfactionLogs(): Promise<void> {
      try {
          const querySnapshot = await getDocs(this.collectionRef);
          if (querySnapshot.empty) return;
          const batch = writeBatch(db);
          querySnapshot.forEach((document) => {
              batch.delete(document.ref);
          });
          await batch.commit();
      } catch (error) {
          console.error("Error deleting all satisfaction logs: ", error);
          throw new Error("Failed to delete all satisfaction logs.");
      }
  }

  subscribeToSatisfactionForMonth(
    year: number,
    month: number,
    callback: (entries: SatisfactionEntry[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);
      
      const q = query(
          this.collectionRef, 
          where("date", ">=", Timestamp.fromDate(startDate)), 
          where("date", "<", Timestamp.fromDate(endDate))
      );
      
      return onSnapshot(q, (querySnapshot) => {
          const fetchedEntries: SatisfactionEntry[] = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              fetchedEntries.push({
                  id: doc.id,
                  ...data,
                  date: (data.date as Timestamp).toDate(),
              } as SatisfactionEntry);
          });
          callback(fetchedEntries);
      }, (error) => {
          console.error(`Error fetching satisfaction data for ${year}-${month + 1}: `, error);
          onError(error);
      });
  }

  async saveSatisfactionEntry(entryData: Omit<SatisfactionEntry, "id">): Promise<string> {
      const { date } = entryData;
      const dayStart = new Date(date as Date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date as Date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const q = query(this.collectionRef, where("date", ">=", Timestamp.fromDate(dayStart)), where("date", "<=", Timestamp.fromDate(dayEnd)), limit(1));
      
      try {
          const querySnapshot = await getDocs(q);
          const dataToSave = {
              ...entryData,
              date: entryData.date instanceof Timestamp ? entryData.date : Timestamp.fromDate(new Date(entryData.date)),
          };

          if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              await updateDoc(doc(db, "satisfaction_logs", existingDoc.id), dataToSave);
              return existingDoc.id;
          } else {
              const docRef = await addDoc(this.collectionRef, dataToSave);
              return docRef.id;
          }
      } catch (error) {
          console.error("Error saving satisfaction entry: ", error);
          throw error;
      }
  }
}
