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
import { Milestone, MilestoneProgressData, PageMilestoneSummary, Task } from "@/types";
import { startOfDay, differenceInCalendarDays, endOfDay } from "date-fns";
import { getTaskCountsForMilestone, deleteTasksForMilestone } from "./taskService";

// Helper to calculate days left, ensuring non-negative
const calculateDaysLeft = (endDate: Timestamp | undefined): number | undefined => {
  if (!endDate) return undefined;
  const today = startOfDay(new Date());
  const end = startOfDay(endDate.toDate());
  const diff = differenceInCalendarDays(end, today);
  return Math.max(0, diff);
};

/**
 * Subscribes to active milestones for the Milestone Progress component,
 * calculating daysLeft dynamically.
 * @param callback - Function to call with the updated MilestoneProgressData array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToActiveMilestonesProgress = (
  callback: (milestones: MilestoneProgressData[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const milestonesCollection = collection(db, "milestones");
  const q = query(
    milestonesCollection,
    where("status", "==", "active"),
    orderBy("endDate", "asc") // Order by deadline
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const fetchedMilestones: MilestoneProgressData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Milestone; // Assume base Milestone type from DB
        const daysLeft = calculateDaysLeft(data.endDate);

        fetchedMilestones.push({
          ...data, // Spread original milestone data
          id: doc.id,
          daysLeft: daysLeft, // Add calculated daysLeft
        });
      });
      callback(fetchedMilestones);
    },
    (error) => {
      console.error("Error fetching milestones for progress: ", error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Fetches milestones ending on a specific date.
 * @param date - The date to check for milestone end dates.
 * @returns A promise resolving to an array of Milestones.
 */
export const getMilestonesEndingOnDate = async (date: Date): Promise<Milestone[]> => {
  const milestonesCollection = collection(db, "milestones");
  const selectedDayStart = Timestamp.fromDate(startOfDay(date));
  const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

  const q = query(
    milestonesCollection,
    where("endDate", ">=", selectedDayStart),
    where("endDate", "<=", selectedDayEnd)
    // Consider adding where("status", "!=", "completed") if needed
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
};

/**
 * Fetches the next single active milestone occurring after a given date.
 * @param date - The date to find the next milestone after.
 * @returns A promise resolving to the next Milestone or null if none found.
 */
export const getNextActiveMilestone = async (date: Date): Promise<Milestone | null> => {
    const milestonesCollection = collection(db, "milestones");
    // Use end of the *current* day for comparison to find milestones starting *after* today
    const selectedDayEnd = Timestamp.fromDate(endOfDay(date));

    const q = query(
        milestonesCollection,
        where("status", "==", "active"),
        where("endDate", ">", selectedDayEnd), // Milestones ending strictly after the selected date
        orderBy("endDate", "asc"),
        limit(1)
    );

     try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Milestone;
        } else {
            return null; // No upcoming active milestones found
        }
    } catch (error) {
        console.error("Error fetching next active milestone: ", error);
        throw error;
    }
};

// Interface for the page summary data structure
interface MilestonePageSummaryData {
  activeCount: number;
  nextDeadlineDays: number | null;
  topUpcoming: PageMilestoneSummary[];
}

/**
 * Fetches summary data for the main page's milestone card.
 * Includes active count, days until next deadline, and top 2 upcoming active milestones.
 * @returns A promise resolving to MilestonePageSummaryData.
 */
export const getPageMilestoneSummary = async (): Promise<MilestonePageSummaryData> => {
  const milestonesCollection = collection(db, "milestones");
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));

  // Query for active milestones
  const activeMilestonesQuery = query(
    milestonesCollection,
    where("status", "==", "active")
  );

  // Query for upcoming active milestones (for deadline and top 2 list)
  const upcomingActiveMilestonesQuery = query(
    activeMilestonesQuery,
    where("endDate", ">=", todayStart), // Include milestones ending today
    orderBy("endDate", "asc")
    // Limit is applied *after* fetching, as we need the first for deadline and potentially next two for list
  );

  try {
    // Fetch count and upcoming list concurrently
    const [activeCountSnapshot, upcomingSnapshot] = await Promise.all([
      getCountFromServer(activeMilestonesQuery),
      getDocs(upcomingActiveMilestonesQuery),
    ]);

    const activeCount = activeCountSnapshot.data().count;
    let nextDeadlineDays: number | null = null;
    const topUpcoming: PageMilestoneSummary[] = [];

    if (!upcomingSnapshot.empty) {
      // Calculate next deadline
      const firstUpcoming = upcomingSnapshot.docs[0].data() as Milestone;
      nextDeadlineDays = calculateDaysLeft(firstUpcoming.endDate) ?? null;

      // Get top 2 for display, calculating daysLeft for each
      upcomingSnapshot.docs.slice(0, 2).forEach((doc) => {
        const data = doc.data() as Milestone; // Use base Milestone type
        const daysLeft = calculateDaysLeft(data.endDate);
        topUpcoming.push({
          // Map to PageMilestoneSummary type
          id: doc.id,
          title: data.title,
          urgency: data.urgency,
          endDate: data.endDate,
          daysLeft: daysLeft,
        });
      });
    }

    return {
      activeCount,
      nextDeadlineDays,
      topUpcoming,
    };
  } catch (error) {
    console.error("Error fetching page milestone summary: ", error);
    throw error;
  }
};

/**
 * Subscribes to milestones based on their status.
 * @param status - The status to filter by ('active', 'completed', etc.).
 * @param callback - Function to call with the updated milestones array.
 * @param onError - Function to call if an error occurs.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToMilestonesByStatus = (
  status: Milestone['status'], // Use type from interface
  callback: (milestones: Milestone[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const milestonesCollection = collection(db, "milestones");
  const q = query(
    milestonesCollection,
    where("status", "==", status),
    orderBy("endDate", "asc") // Or other relevant order
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const fetchedMilestones: Milestone[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone);
      });
      callback(fetchedMilestones);
    },
    (error) => {
      console.error(`Error fetching ${status} milestones: `, error);
      onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Adds a new milestone to the Firestore collection.
 * @param milestoneData - Object containing the new milestone data (excluding id).
 * @returns A promise resolving with the ID of the newly created milestone.
 */
export const addMilestone = async (milestoneData: Omit<Milestone, 'id'>): Promise<string> => {
    const milestonesCollection = collection(db, "milestones");
    try {
        // Set default/calculated values if not provided
        const dataToAdd = { ...milestoneData };
        if (!dataToAdd.startDate) {
            dataToAdd.startDate = Timestamp.now();
        }
         if (!dataToAdd.status) {
            dataToAdd.status = "active"; // Default to active
        }
        if (!dataToAdd.progress) {
            dataToAdd.progress = 0; // Default progress
        }
         if (!dataToAdd.tasks) {
            dataToAdd.tasks = []; // Default tasks
        }

        const docRef = await addDoc(milestonesCollection, dataToAdd);
        return docRef.id;
    } catch (error) {
        console.error("Error adding milestone: ", error);
        throw error;
    }
};

/**
 * Updates specific fields of an existing milestone.
 * @param milestoneId - The ID of the milestone to update.
 * @param dataToUpdate - An object containing the fields to update (e.g., { title, description, status, endDate, urgency }).
 *                         Use Firestore Timestamp for dates.
 * @returns A promise resolving when the update is complete.
 * @throws Error if milestoneId is missing or update fails.
 */
export const updateMilestone = async (
    milestoneId: string,
    dataToUpdate: Partial<Omit<Milestone, 'id' | 'progress' | 'startDate' | 'tasks'>>
): Promise<void> => {
    if (!milestoneId) throw new Error("Milestone ID is required for update.");
    if (Object.keys(dataToUpdate).length === 0) {
        console.warn("updateMilestone called with no data to update.");
        return; // No changes needed
    }

    // Validate status if provided
    if (dataToUpdate.status && !['active', 'completed', 'archived'].includes(dataToUpdate.status)) {
        throw new Error(`Invalid milestone status provided: ${dataToUpdate.status}`);
    }

    // Prevent updating forbidden fields explicitly (though type system helps)
    const forbiddenFields: (keyof Milestone)[] = ['id', 'progress', 'startDate', 'tasks'];
    for (const field of forbiddenFields) {
        if (field in dataToUpdate) {
            console.warn(`Attempted to update forbidden field '${field}' in updateMilestone. Ignoring.`);
            delete dataToUpdate[field as keyof typeof dataToUpdate];
        }
    }
    if (Object.keys(dataToUpdate).length === 0) {
         console.warn("updateMilestone called with only forbidden fields. No update performed.");
         return;
    }

    const milestoneDocRef = doc(db, "milestones", milestoneId);
    try {
        await updateDoc(milestoneDocRef, dataToUpdate);
    } catch (error) {
        console.error(`Error updating milestone ${milestoneId}: `, error);
        throw new Error("Failed to update milestone details.");
    }
};

/**
 * Deletes a specific milestone. Optionally deletes associated tasks.
 * @param milestoneId - The ID of the milestone to delete.
 * @param deleteAssociatedTasks - If true, deletes all tasks linked via milestoneId. Defaults to false.
 * @returns A promise resolving when the deletion is complete.
 */
export const deleteMilestone = async (milestoneId: string, deleteAssociatedTasks: boolean = false): Promise<void> => {
    if (!milestoneId) throw new Error("Milestone ID is required for deletion.");
    const milestoneDocRef = doc(db, "milestones", milestoneId);

    try {
        // If requested, delete associated tasks first
        if (deleteAssociatedTasks) {
             console.log(`Attempting to delete tasks associated with milestone ${milestoneId}...`);
            await deleteTasksForMilestone(milestoneId); // Call the dedicated task deletion function
             console.log(`Finished deleting tasks for milestone ${milestoneId}.`);
        }

        // Delete the milestone itself
        await deleteDoc(milestoneDocRef); // Simplified deletion, no batch needed if only deleting one doc
        console.log(`Milestone ${milestoneId} deleted successfully${deleteAssociatedTasks ? ' after associated tasks' : ''}.`);

    } catch (error) {
        // Catch errors from both task deletion (if applicable) and milestone deletion
        console.error(`Error during deletion process for milestone ${milestoneId}: `, error);
        // Re-throw a more specific error or handle it based on where it originated if needed
        throw new Error(`Failed to delete milestone ${milestoneId}${deleteAssociatedTasks ? ' or its associated tasks' : ''}.`);
    }
};

/**
 * Fetches a list of upcoming active milestones.
 * @param count - The maximum number of upcoming milestones to fetch.
 * @returns A promise resolving to an array of Milestones, ordered by end date.
 */
export const getUpcomingActiveMilestones = async (count: number): Promise<Milestone[]> => {
  const milestonesCollection = collection(db, "milestones");
  const todayStart = Timestamp.fromDate(startOfDay(new Date()));

  const q = query(
    milestonesCollection,
    where("status", "==", "active"),
    where("endDate", ">=", todayStart), // Starting from today
    orderBy("endDate", "asc"),
    limit(count)
  );

  try {
    const querySnapshot = await getDocs(q);
    const fetchedMilestones: Milestone[] = [];
    querySnapshot.forEach((doc) => {
      fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone);
    });
    return fetchedMilestones;
  } catch (error) {
    console.error("Error fetching upcoming active milestones: ", error);
    throw error;
  }
};

/**
 * Calculates and updates the progress percentage for a given milestone based on its associated tasks.
 * Automatically updates the milestone status to 'completed' if progress reaches 100%,
 * or back to 'active' if it was 'completed' and progress drops below 100%.
 * @param milestoneId - The ID of the milestone to update.
 * @returns A promise resolving when the milestone progress and potentially status are updated.
 */
export const updateMilestoneProgress = async (milestoneId: string): Promise<void> => {
	if (!milestoneId) {
		console.warn("updateMilestoneProgress called without milestoneId");
		return;
	}
	const milestoneDocRef = doc(db, "milestones", milestoneId);
	try {
		// Get current milestone data first to check current status
		const milestoneSnap = await getDoc(milestoneDocRef);
		if (!milestoneSnap.exists()) {
			console.error(`Milestone ${milestoneId} not found for progress update.`);
			return;
		}
		const currentMilestoneData = milestoneSnap.data() as Milestone;
		const currentStatus = currentMilestoneData.status;

		// Get task counts
		const { total, completed } = await getTaskCountsForMilestone(milestoneId);
		let progress = 0;
		if (total > 0) {
			progress = Math.round((completed / total) * 100);
		} else {
			progress = 0; // Or 100 if no tasks means completed? Defaulting to 0.
		}

		const dataToUpdate: Partial<Milestone> = { progress };

		// Automatic status update logic
		if (progress === 100 && currentStatus !== "completed") {
			dataToUpdate.status = "completed";
			console.log(`Milestone ${milestoneId} automatically marked as completed.`);
		} else if (progress < 100 && currentStatus === "completed") {
			dataToUpdate.status = "active"; // Revert to active if progress drops
			console.log(`Milestone ${milestoneId} automatically reverted to active due to progress drop.`);
		}

		// Only update if there are changes
		if (dataToUpdate.progress !== currentMilestoneData.progress || dataToUpdate.status !== currentStatus) {
			await updateDoc(milestoneDocRef, dataToUpdate);
		}
	} catch (error) {
		console.error(`Error updating progress for milestone ${milestoneId}: `, error);
		// Log but don't necessarily block other operations
	}
};

/**
 * Deletes all milestones from the Firestore 'milestones' collection.
 * Also attempts to delete associated tasks for each milestone by calling taskService.deleteTasksForMilestone.
 * WARNING: This permanently deletes all documents in the 'milestones' collection and their linked tasks.
 * @returns A promise resolving when the deletion of milestones and their associated tasks is complete.
 * @throws Error if deletion of milestones or their tasks fails.
 */
export const deleteAllUserMilestones = async (): Promise<void> => {
  console.warn(
    "deleteAllUserMilestones called. This will delete all documents in the 'milestones' collection and their associated tasks."
  );
  const milestonesCollectionRef = collection(db, "milestones");
  try {
    const querySnapshot = await getDocs(milestonesCollectionRef);
    if (querySnapshot.empty) {
      console.log("No milestones found in 'milestones' collection to delete.");
      return;
    }

    const batch = writeBatch(db);
    const milestoneIds: string[] = [];

    querySnapshot.forEach((document) => {
      milestoneIds.push(document.id);
      batch.delete(document.ref);
    });

    // First, delete all tasks associated with these milestones
    // This is important to do before deleting the milestones themselves if task deletion logic depends on milestone existence
    // or if there are triggers/rules. For simplicity, we call it per milestone.
    // A more optimized way might be to gather all task IDs and do a larger batch delete in taskService if possible.
    console.log(`Attempting to delete tasks for ${milestoneIds.length} milestones.`);
    for (const milestoneId of milestoneIds) {
      try {
        await deleteTasksForMilestone(milestoneId); // This function is already in taskService.ts
        console.log(`Successfully deleted tasks for milestone ${milestoneId}.`);
      } catch (taskError) {
        console.error(`Error deleting tasks for milestone ${milestoneId}:`, taskError);
        // Decide if we should continue or re-throw. For now, log and continue.
      }
    }

    // Then, delete all milestones
    await batch.commit();
    console.log(
      `Successfully deleted ${querySnapshot.size} milestones from 'milestones' collection.`
    );
  } catch (error) {
    console.error("Error deleting all milestones: ", error);
    throw new Error("Failed to delete all milestones.");
  }
}; 