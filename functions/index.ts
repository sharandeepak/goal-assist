import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import { startOfDay, endOfDay } from "date-fns";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const tasksCollection = db.collection("tasks");
const milestonesCollection = db.collection("milestones"); // Assuming collection name

// Configure CORS middleware
// Adjust origin policy as needed for production
const corsHandler = cors({ origin: true });

// --- Helper Function: Update Milestone Progress ---
// This replicates the logic needed to update milestone progress
// based on task completion changes, as seen in taskService.ts
const updateMilestoneProgress = async (milestoneId: string): Promise<void> => {
	if (!milestoneId) {
		functions.logger.warn("updateMilestoneProgress called without milestoneId");
		return;
	}

	try {
		const tasksQuery = tasksCollection.where("milestoneId", "==", milestoneId);
		const completedTasksQuery = tasksQuery.where("completed", "==", true);

		const [totalSnapshot, completedSnapshot] = await Promise.all([tasksQuery.count().get(), completedTasksQuery.count().get()]);

		const totalTasks = totalSnapshot.data().count;
		const completedTasks = completedSnapshot.data().count;

		let progress = 0;
		if (totalTasks > 0) {
			progress = Math.round((completedTasks / totalTasks) * 100);
		}

		const milestoneRef = milestonesCollection.doc(milestoneId);
		await milestoneRef.update({ progress }); // Assuming 'progress' field exists
		functions.logger.log(`Updated milestone ${milestoneId} progress to ${progress}%`);
	} catch (error) {
		functions.logger.error(`Error updating milestone ${milestoneId} progress:`, error);
		// Decide if this error should be surfaced to the client
		// throw new functions.https.HttpsError("internal", "Failed to update milestone progress.");
	}
};

// --- API Endpoint: GET /tasks ---
export const getTasks = functions.https.onRequest((request, response) => {
	corsHandler(request, response, async () => {
		if (request.method !== "GET") {
			response.status(405).send("Method Not Allowed");
			return;
		}

		try {
			const status = request.query.status as string | undefined; // 'open' or 'completed'
			const dateFilter = request.query.date as string | undefined; // 'today'

			let query: admin.firestore.Query = tasksCollection;

			// Apply date filter
			if (dateFilter === "today") {
				const todayStart = admin.firestore.Timestamp.fromDate(startOfDay(new Date()));
				const todayEnd = admin.firestore.Timestamp.fromDate(endOfDay(new Date()));
				query = query.where("date", ">=", todayStart).where("date", "<=", todayEnd);
			}

			// Apply status filter
			if (status === "completed") {
				query = query.where("completed", "==", true);
			} else if (status === "open") {
				query = query.where("completed", "==", false);
			}

			// Add ordering (optional, adjust as needed)
			query = query.orderBy("createdAt", "desc"); // Or orderBy('date')

			const snapshot = await query.get();
			const tasks: any[] = [];
			snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
				tasks.push({ id: doc.id, ...doc.data() });
			});

			response.status(200).json(tasks);
		} catch (error) {
			functions.logger.error("Error fetching tasks:", error);
			response.status(500).send("Internal Server Error");
		}
	});
});

// --- API Endpoint: PATCH /tasks/{taskId} ---
export const updateTaskStatus = functions.https.onRequest((request, response) => {
	corsHandler(request, response, async () => {
		if (request.method !== "PATCH") {
			response.status(405).send("Method Not Allowed");
			return;
		}

		// Extract task ID from URL path, e.g., /tasks/abc123xyz
		const taskId = request.path.split("/").pop();
		if (!taskId) {
			response.status(400).send("Task ID is missing in the URL path.");
			return;
		}

		const { completed } = request.body; // Expecting { "completed": boolean }

		if (typeof completed !== "boolean") {
			response.status(400).send("Invalid request body: 'completed' field must be a boolean.");
			return;
		}

		try {
			const taskDocRef = tasksCollection.doc(taskId);
			const taskDoc = await taskDocRef.get();

			if (!taskDoc.exists) {
				response.status(404).send("Task not found.");
				return;
			}

			// Update the task completion status
			await taskDocRef.update({ completed });

			// Check if the task is linked to a milestone and update progress
			const taskData = taskDoc.data();
			if (taskData?.milestoneId) {
				await updateMilestoneProgress(taskData.milestoneId);
			}

			response.status(200).json({ id: taskId, completed }); // Or send 204 No Content
		} catch (error) {
			functions.logger.error(`Error updating task ${taskId}:`, error);
			response.status(500).send("Internal Server Error");
		}
	});
});

// --- Optional: Grouping under a single API entry point ---
// If you prefer a single entry point like /api/tasks and /api/tasks/:taskId
// you can use Express within the cloud function.
// For simplicity, the above approach uses separate function exports.

// --- Note on Deployment ---
// Remember to run `npm install` (or `yarn`) in the `functions` directory
// and then deploy using `firebase deploy --only functions`.
// You might also need to configure billing for your Firebase project if not already done.
