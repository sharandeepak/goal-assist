// Service for managing user settings, including reminders and account deletion.

import { deleteAllUserTasks } from "./taskService";
import { deleteAllUserMilestones } from "./milestoneService";
import { deleteAllUserSatisfactionLogs } from "./satisfactionService";
import { deleteAllUserStandupLogs } from "./standupService";

class SettingsService {
	private reminderTimeoutId: number | null = null;

	async scheduleReminder(time: string) {
		console.log("Scheduling reminder for:", time);

		if (!("Notification" in window)) {
			alert("This browser does not support desktop notification");
			return;
		}

		if (Notification.permission === "granted") {
			this.createNotification(time);
		} else if (Notification.permission !== "denied") {
			Notification.requestPermission().then((permission) => {
				if (permission === "granted") {
					this.createNotification(time);
				} else {
					alert("Notification permission denied.");
				}
			});
		}
	}

	private createNotification(time: string) {
		this.clearReminder(); // Clear any existing reminder before setting a new one

		const [hours, minutes] = time.split(":").map(Number);
		const now = new Date();
		let reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

		if (reminderDate <= now) {
			// If the time has already passed for today, schedule it for tomorrow
			reminderDate.setDate(reminderDate.getDate() + 1);
		}

		const delay = reminderDate.getTime() - now.getTime();

		if (delay < 0) {
			// Should not happen with the above logic, but as a safeguard
			console.error("Cannot schedule reminder in the past.");
			return;
		}

		this.reminderTimeoutId = window.setTimeout(() => {
			new Notification("Daily Log Reminder", {
				body: "Time to fill in your daily logs!",
				// icon: '/path/to/icon.png' // Optional: Add an icon
			});
			// For a true recurring daily reminder, we would need to reschedule here for the next day.
			// For simplicity, this is a one-off notification after permission is granted and time is set.
			// To make it somewhat persistent for the next day, the app would need to reschedule on load if enabled.
		}, delay);

		console.log(`Notification scheduled for ${reminderDate}`);
	}

	clearReminder() {
		if (this.reminderTimeoutId !== null) {
			window.clearTimeout(this.reminderTimeoutId);
			this.reminderTimeoutId = null;
			console.log("Reminder cleared.");
		}
	}

	async deleteAccount() {
		console.warn("Attempting to delete all user data. This will clear tasks, milestones, satisfaction logs, and standup logs.");
		try {
			// It's generally safer to delete dependent data first (e.g., tasks of milestones before milestones)
			// but since milestones deletion already handles its tasks, the order here is less critical for those two.
			await deleteAllUserTasks();
			console.log("All tasks deleted.");

			await deleteAllUserMilestones(); // This also deletes tasks linked to milestones again, which is okay.
			console.log("All milestones and their associated tasks deleted.");

			await deleteAllUserSatisfactionLogs();
			console.log("All satisfaction logs deleted.");

			await deleteAllUserStandupLogs();
			console.log("All standup logs deleted.");

			// Clear any other client-side storage related to the user (e.g. reminder settings)
			localStorage.removeItem("reminderTime");
			localStorage.removeItem("reminderEnabled");
			this.clearReminder(); // Ensure any scheduled notification is also cleared

			console.log("All user data has been successfully deleted from the services and local storage.");
		} catch (error) {
			console.error("Error during account deletion process:", error);
			// Depending on the error, might want to inform the user that some data might not have been cleared.
			throw new Error("Failed to delete all account data. Some data may still remain.");
		}
	}
}

export const settingsService = new SettingsService();
