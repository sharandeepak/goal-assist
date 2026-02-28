import { deleteAllUserTasks } from "@/features/tasks/services/taskService";
import { deleteAllUserMilestones } from "@/features/milestones/services/milestoneService";
import { deleteAllUserSatisfactionLogs } from "@/features/satisfaction/services/satisfactionService";
import { deleteAllUserStandupLogs } from "@/features/standup/services/standupService";
import { AppError } from "@/common/errors/AppError";

class SettingsService {
  private reminderTimeoutId: number | null = null;

  async scheduleReminder(time: string) {
    if (!("Notification" in window)) {
      throw AppError.badRequest(
        "NOTIFICATION_NOT_SUPPORTED",
        "This browser does not support desktop notifications."
      );
    }

    if (Notification.permission === "granted") {
      this.createNotification(time);
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        this.createNotification(time);
      } else {
        throw AppError.badRequest(
          "NOTIFICATION_DENIED",
          "Notification permission was denied."
        );
      }
    }
  }

  private createNotification(time: string) {
    this.clearReminder();

    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const reminderDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );

    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    const delay = reminderDate.getTime() - now.getTime();
    if (delay < 0) return;

    this.reminderTimeoutId = window.setTimeout(() => {
      new Notification("Daily Log Reminder", {
        body: "Time to fill in your daily logs!",
      });
    }, delay);
  }

  clearReminder() {
    if (this.reminderTimeoutId !== null) {
      window.clearTimeout(this.reminderTimeoutId);
      this.reminderTimeoutId = null;
    }
  }

  async deleteAccount() {
    try {
      await deleteAllUserTasks();
      await deleteAllUserMilestones();
      await deleteAllUserSatisfactionLogs();
      await deleteAllUserStandupLogs();

      localStorage.removeItem("reminderTime");
      localStorage.removeItem("reminderEnabled");
      this.clearReminder();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "ACCOUNT_DELETE_ERROR",
        "Failed to delete all account data. Some data may still remain."
      );
    }
  }
}

export const settingsService = new SettingsService();
