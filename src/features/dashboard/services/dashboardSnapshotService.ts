import { AppError } from "@/common/errors/AppError";
import { getPageMilestoneSummary } from "@/features/milestones/services/milestoneService";
import { getSatisfactionSummary } from "@/features/satisfaction/services/satisfactionService";
import { getRecentStandups } from "@/features/standup/services/standupService";
import { getTasksByDateRange } from "@/features/tasks/services/taskService";
import {
  getEntriesForDateRange,
  getRunningEntry,
} from "@/features/timesheet/services/timeService";
import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";

type DashboardFocusMode = "today" | "week_to_date";

export interface DashboardTaskItem {
  id: string;
  title: string;
  completed: boolean;
  date: string | null;
  milestoneId: string | null;
}

export interface DashboardOverdueTask {
  id: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
}

export interface DashboardUpcomingMilestone {
  id: string;
  title: string;
  urgency: "high" | "medium" | "low";
  daysLeft: number | null;
}

export interface DashboardTimerState {
  id: string;
  taskTitle: string;
  emoji: string | null;
  startedAt: string | null;
}

export interface DashboardSnapshot {
  generatedAt: string;
  todayFocusStatement: string;
  kpis: {
    todayCompletion: {
      completed: number;
      total: number;
      percentage: number;
    };
    activeMilestones: {
      count: number;
      nearestDeadlineDays: number | null;
    };
    mood: {
      score: number | null;
      dayOverDayDelta: number | null;
    };
    focusTime: {
      seconds: number;
      mode: DashboardFocusMode;
    };
  };
  insights: {
    overdueTasks: DashboardOverdueTask[];
    upcomingMilestones: DashboardUpcomingMilestone[];
    standup: {
      latestLogDate: string | null;
      blockers: string[];
      notes: string[];
    };
  };
  execution: {
    todayTasks: DashboardTaskItem[];
    runningTimer: DashboardTimerState | null;
  };
}

const OVERDUE_LOOKBACK_DAYS = 180;

const toDayBoundary = (dateStr: string): Date => startOfDay(new Date(dateStr));

const normalizeText = (value: string): string => value.trim();

const createTodayFocusStatement = (
  todayTaskTotal: number,
  todayTaskCompleted: number,
  nearestDeadlineDays: number | null
): string => {
  if (todayTaskTotal === 0) {
    return "No tasks planned for today yet. Add one to define your focus.";
  }

  if (todayTaskCompleted === todayTaskTotal) {
    return "All scheduled tasks are complete. You can pull in upcoming work.";
  }

  const remaining = todayTaskTotal - todayTaskCompleted;
  const remainingTaskText = `${remaining} task${remaining === 1 ? "" : "s"} left today`;

  if (nearestDeadlineDays === null) {
    return `${remainingTaskText}.`;
  }

  if (nearestDeadlineDays < 0) {
    return `${remainingTaskText}. A milestone is overdue by ${Math.abs(
      nearestDeadlineDays
    )} day${Math.abs(nearestDeadlineDays) === 1 ? "" : "s"}.`;
  }

  if (nearestDeadlineDays === 0) {
    return `${remainingTaskText}. Your next milestone is due today.`;
  }

  return `${remainingTaskText}. Next milestone deadline in ${nearestDeadlineDays} day${
    nearestDeadlineDays === 1 ? "" : "s"
  }.`;
};

export const getDashboardSnapshot = async (
  userId: string
): Promise<DashboardSnapshot> => {
  if (!userId) {
    throw AppError.badRequest(
      "DASHBOARD_USER_REQUIRED",
      "User ID is required to load dashboard insights."
    );
  }

  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const lookbackStart = startOfDay(subDays(now, OVERDUE_LOOKBACK_DAYS));
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    const todayKey = format(now, "yyyy-MM-dd");

    const [
      tasksInWindow,
      milestoneSummary,
      satisfactionSummary,
      standups,
      weekEntries,
      runningEntry,
    ] = await Promise.all([
      getTasksByDateRange(lookbackStart, todayEnd),
      getPageMilestoneSummary(),
      getSatisfactionSummary(),
      getRecentStandups(2),
      getEntriesForDateRange(userId, weekStartKey, todayKey),
      getRunningEntry(userId),
    ]);

    const todayTasks = tasksInWindow
      .filter((task) => task.date && isSameDay(new Date(task.date), todayStart))
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return Number(a.completed) - Number(b.completed);
        }
        const aDate = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

    const todayCompleted = todayTasks.filter((task) => task.completed).length;
    const todayTotal = todayTasks.length;

    const overdueTasks = tasksInWindow
      .filter(
        (task) =>
          !task.completed &&
          Boolean(task.date) &&
          toDayBoundary(task.date as string) < todayStart
      )
      .map((task) => {
        const dueDate = task.date as string;
        const dueDay = toDayBoundary(dueDate);
        return {
          id: task.id,
          title: task.title,
          dueDate,
          daysOverdue: Math.max(1, differenceInCalendarDays(todayStart, dueDay)),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    const weekToDateSeconds = weekEntries.reduce(
      (sum, entry) => sum + entry.duration_sec,
      0
    );
    const todayFocusSeconds = weekEntries
      .filter((entry) => entry.day === todayKey)
      .reduce((sum, entry) => sum + entry.duration_sec, 0);
    const focusMode: DashboardFocusMode =
      todayFocusSeconds > 0 ? "today" : "week_to_date";

    const standupBlockers = standups
      .flatMap((log) => log.blockers ?? [])
      .map(normalizeText)
      .filter(Boolean)
      .slice(0, 3);
    const standupNotes = standups
      .flatMap((log) => (log.notes ? [log.notes] : []))
      .map(normalizeText)
      .filter(Boolean)
      .slice(0, 3);

    return {
      generatedAt: now.toISOString(),
      todayFocusStatement: createTodayFocusStatement(
        todayTotal,
        todayCompleted,
        milestoneSummary.nextDeadlineDays
      ),
      kpis: {
        todayCompletion: {
          completed: todayCompleted,
          total: todayTotal,
          percentage:
            todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100),
        },
        activeMilestones: {
          count: milestoneSummary.activeCount,
          nearestDeadlineDays: milestoneSummary.nextDeadlineDays,
        },
        mood: {
          score: satisfactionSummary.currentScore,
          dayOverDayDelta: satisfactionSummary.change,
        },
        focusTime: {
          seconds:
            focusMode === "today" ? todayFocusSeconds : weekToDateSeconds,
          mode: focusMode,
        },
      },
      insights: {
        overdueTasks,
        upcomingMilestones: milestoneSummary.topUpcoming.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          urgency: milestone.urgency,
          daysLeft: milestone.daysLeft ?? null,
        })),
        standup: {
          latestLogDate: standups[0]?.log_date ?? null,
          blockers: standupBlockers,
          notes: standupNotes,
        },
      },
      execution: {
        todayTasks: todayTasks.map((task) => ({
          id: task.id,
          title: task.title,
          completed: task.completed,
          date: task.date,
          milestoneId: task.milestone_id,
        })),
        runningTimer: runningEntry
          ? {
              id: runningEntry.id,
              taskTitle: runningEntry.task_title_snapshot,
              emoji: runningEntry.emoji,
              startedAt: runningEntry.started_at ?? runningEntry.created_at,
            }
          : null,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.internal(
      "DASHBOARD_SNAPSHOT_ERROR",
      "Failed to load dashboard snapshot."
    );
  }
};
