import { ITimeEntryRepository } from "../interfaces/ITimeEntryRepository";
import { TimeEntry } from "@/types";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe
} from "firebase/firestore";
import { format } from "date-fns";

const TIME_ENTRIES_COLLECTION = "timeEntries";

export class FirebaseTimeEntryRepository implements ITimeEntryRepository {
  // Helpers
  private collectionRef = collection(db, TIME_ENTRIES_COLLECTION);

  async startTimer(params: { userId: string; taskId?: string; taskTitle: string; emoji?: string; milestoneId?: string; tags?: string[]; note?: string; }): Promise<string> {
      const { userId, taskId, taskTitle, emoji, milestoneId, tags, note } = params;
      
      // Stop running timer first
      await this.stopRunningTimer(userId);
      
      const now = new Date();
      const dayStr = format(now, "yyyy-MM-dd");
      
      const entry: Omit<TimeEntry, "id"> = {
          userId,
          taskId: taskId || null,
          taskTitleSnapshot: taskTitle,
          emoji: emoji || null,
          milestoneIdSnapshot: milestoneId || null,
          tagsSnapshot: tags || [],
          note: note || null,
          source: "timer",
          startedAt: Timestamp.fromDate(now),
          endedAt: null,
          durationSec: 0,
          day: dayStr,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(this.collectionRef, entry);
      return docRef.id;
  }

  async stopRunningTimer(userId: string): Promise<TimeEntry | null> {
      const running = await this.getRunningEntry(userId);
      if (!running) return null;
      
      const now = new Date();
      const startDate = running.createdAt.toDate();
      const durationSec = Math.floor((now.getTime() - startDate.getTime()) / 1000);
      
      const docRef = doc(db, TIME_ENTRIES_COLLECTION, running.id);
      await updateDoc(docRef, {
          endedAt: Timestamp.fromDate(now),
          durationSec,
          updatedAt: Timestamp.now(),
      });
      
      return {
          ...running,
          endedAt: Timestamp.fromDate(now),
          durationSec,
          updatedAt: Timestamp.now(),
      };
  }

  async getRunningEntry(userId: string): Promise<TimeEntry | null> {
      const q = query(this.collectionRef, where("userId", "==", userId), where("endedAt", "==", null));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as TimeEntry;
  }

  subscribeToRunningEntry(userId: string, callback: (entry: TimeEntry | null) => void): Unsubscribe {
      const q = query(this.collectionRef, where("userId", "==", userId), where("source", "==", "timer"), where("endedAt", "==", null));
      return onSnapshot(q, (snapshot) => {
          if (snapshot.empty) {
              callback(null);
          } else {
              const doc = snapshot.docs[0];
              callback({ id: doc.id, ...doc.data() } as TimeEntry);
          }
      });
  }

  async logManualEntry(params: { userId: string; day: string; taskId?: string; adHocTitle?: string; emoji?: string; milestoneId?: string; tags?: string[]; note?: string; durationSec?: number; startedAt?: Date; endedAt?: Date; }): Promise<string> {
      const { userId, day, taskId, adHocTitle, emoji, milestoneId, tags, note, durationSec, startedAt, endedAt } = params;
      
      let finalStartedAt: Timestamp | null;
      let finalEndedAt: Timestamp | null;
      let finalDurationSec: number;
      
      if (startedAt && endedAt) {
          finalStartedAt = Timestamp.fromDate(startedAt);
          finalEndedAt = Timestamp.fromDate(endedAt);
          finalDurationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      } else if (durationSec !== undefined) {
          finalStartedAt = null;
          finalEndedAt = null;
          finalDurationSec = durationSec;
      } else {
          throw new Error("Either durationSec or (startedAt and endedAt) must be provided");
      }
      
      const entry: Omit<TimeEntry, "id"> = {
          userId,
          taskId: taskId || null,
          taskTitleSnapshot: adHocTitle || "Untitled Task",
          emoji: emoji || null,
          milestoneIdSnapshot: milestoneId || null,
          tagsSnapshot: tags || [],
          note: note || null,
          source: "manual",
          startedAt: finalStartedAt,
          endedAt: finalEndedAt,
          durationSec: finalDurationSec,
          day,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(this.collectionRef, entry);
      return docRef.id;
  }
  
  async updateEntry(params: { entryId: string; fields: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">>; }): Promise<void> {
      const { entryId, fields } = params;
      const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
      
      if (fields.startedAt || fields.endedAt) {
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) throw new Error("Entry not found");
          
          const entry = { id: docSnap.id, ...docSnap.data() } as TimeEntry;
          const newStart = fields.startedAt?.toDate() || entry.startedAt?.toDate() || new Date(); // Fallback might need attention if startedAt is null
          const newEnd = fields.endedAt?.toDate() || entry.endedAt?.toDate();
          
          if (newEnd && entry.startedAt) { // Ensure running timer has startedAt
               // This logic in service was: if newEnd...
               // If startedAt was null (duration based), updating to having times changes it to time-based?
               // The logic in service was explicit.
               // I will trust the input fields map logic for now, but I might need to fetch the doc to recalculate duration properly.
               // Rereading service logic:
               /*
                const newStart = fields.startedAt?.toDate() || entry.startedAt.toDate();
                const newEnd = fields.endedAt?.toDate() || entry.endedAt?.toDate();
                if (newEnd) {
                    fields.durationSec = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
                }
               */
               // Yes, I need to fetch.
               // I already fetch in the `if` block.
               
               // Warning: entry.startedAt could be null if it was duration-based.
               // The original code assumed entry.startedAt.toDate() works?
               // Let's check original code:
               // `const newStart = fields.startedAt?.toDate() || entry.startedAt.toDate();`
               // This implies manual entries might have startedAt as null.
               // But `entry.startedAt` is `Timestamp | null`.
               // If it is null, `entry.startedAt.toDate()` throws.
               // The original code might have a bug or assumed implicit types. 
               // I will fix it by checking for null.
               
             if (entry.startedAt) {
                  const start = fields.startedAt?.toDate() || entry.startedAt.toDate();
                  if (newEnd) {
                      fields.durationSec = Math.floor((newEnd.getTime() - start.getTime()) / 1000);
                  }
             }
          }
           if (fields.startedAt) {
               fields.day = format(fields.startedAt.toDate(), "yyyy-MM-dd");
           }
      }
      
      await updateDoc(docRef, { ...fields, updatedAt: Timestamp.now() });
  }

  async deleteEntry(entryId: string): Promise<void> {
      await deleteDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
  }

  async getEntryById(entryId: string): Promise<TimeEntry | null> {
      const docSnap = await getDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as TimeEntry;
  }

  async getEntriesForDateRange(userId: string, startDay: string, endDay: string): Promise<TimeEntry[]> {
      const q = query(this.collectionRef, where("userId", "==", userId), where("day", ">=", startDay), where("day", "<=", endDay), orderBy("day", "asc"), orderBy("startedAt", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  }

  subscribeToEntriesByDateRange(userId: string, startDay: string, endDay: string, callback: (entries: TimeEntry[]) => void): Unsubscribe {
      const q = query(this.collectionRef, where("userId", "==", userId), where("day", ">=", startDay), where("day", "<=", endDay), orderBy("day", "asc"), orderBy("startedAt", "asc"));
      return onSnapshot(q, (snapshot) => {
          const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
          callback(entries);
      });
  }

  async getWeeklySummary(userId: string, weekStart: string, weekEnd: string): Promise<{ totalSeconds: number; taskBreakdown: Record<string, number>; entryCount: number; }> {
      const entries = await this.getEntriesForDateRange(userId, weekStart, weekEnd);
      const totalSeconds = entries.reduce((sum, e) => sum + e.durationSec, 0);
      const taskBreakdown = entries.reduce((acc, e) => {
          const key = e.taskTitleSnapshot;
          acc[key] = (acc[key] || 0) + e.durationSec;
          return acc;
      }, {} as Record<string, number>);
      
      return { totalSeconds, taskBreakdown, entryCount: entries.length };
  }
}
