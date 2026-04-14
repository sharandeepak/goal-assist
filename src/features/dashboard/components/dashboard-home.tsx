"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faCircle, faCircleCheck, faClock, faFaceSmile, faPlus, faSpinner, faStop, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { AppError } from "@/common/errors/AppError";
import { cn } from "@/common/lib/utils";
import { useAuth, useRequiredAuth } from "@/common/hooks/use-auth";
import { Badge } from "@/common/ui/badge";
import { Button } from "@/common/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import { Skeleton } from "@/common/ui/skeleton";
import { type DashboardSnapshot, type DashboardTaskItem, getDashboardSnapshot } from "@/features/dashboard/services/dashboardSnapshotService";
import { saveSatisfactionEntry } from "@/features/satisfaction/services/satisfactionService";
import { updateTaskCompletion } from "@/features/tasks/services/taskService";
import { stopRunningTimer } from "@/features/timesheet/services/timeService";

const LazySatisfactionCalendar = dynamic(() => import("@/features/satisfaction/components/satisfaction-calendar"), {
	ssr: false,
	loading: () => (
		<div className="p-6 space-y-3">
			<Skeleton className="h-6 w-48" />
			<Skeleton className="h-72 w-full" />
		</div>
	),
});

type QuickMood = {
	id: "great" | "good" | "okay" | "rough";
	label: string;
	score: number;
};

const QUICK_MOODS: QuickMood[] = [
	{ id: "great", label: "Great", score: 9 },
	{ id: "good", label: "Good", score: 7 },
	{ id: "okay", label: "Okay", score: 5 },
	{ id: "rough", label: "Rough", score: 2 },
];

const formatDurationCompact = (seconds: number): string => {
	if (seconds <= 0) return "0m";

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours === 0) {
		return `${Math.max(1, minutes)}m`;
	}

	return `${hours}h ${minutes}m`;
};

const formatElapsedTime = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatDeadlineLabel = (days: number | null): string => {
	if (days === null) return "No upcoming deadline";
	if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
	if (days === 0) return "Due today";
	return `Due in ${days} day${days === 1 ? "" : "s"}`;
};

const formatMoodDelta = (delta: number | null): string => {
	if (delta === null) return "No prior-day delta";
	if (delta === 0) return "No change vs yesterday";
	if (delta > 0) return `Up ${delta} vs yesterday`;
	return `Down ${Math.abs(delta)} vs yesterday`;
};

const moodIdFromScore = (score: number | null): QuickMood["id"] | null => {
	if (score === null) return null;
	if (score >= 8) return "great";
	if (score >= 6) return "good";
	if (score >= 4) return "okay";
	return "rough";
};

export default function DashboardHome() {
	const { user, workspace } = useAuth();
	const { userId, workspaceId, isLoading: isAuthLoading } = useRequiredAuth();

	const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
	const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [taskActionId, setTaskActionId] = useState<string | null>(null);
	const [isStoppingTimer, setIsStoppingTimer] = useState(false);
	const [isLoggingMood, setIsLoggingMood] = useState(false);
	const [moodError, setMoodError] = useState<string | null>(null);
	const [showMoodCalendar, setShowMoodCalendar] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	const activeMoodId = useMemo(() => moodIdFromScore(snapshot?.kpis.mood.score ?? null), [snapshot?.kpis.mood.score]);

	const loadSnapshot = useCallback(
		async (options?: { initial?: boolean }) => {
			if (!userId || !workspaceId) return;

			if (options?.initial) {
				setIsLoadingSnapshot(true);
			} else {
				setIsRefreshing(true);
			}

			setErrorMessage(null);

			try {
				const data = await getDashboardSnapshot(userId, workspaceId);
				setSnapshot(data);
			} catch (error) {
				if (error instanceof AppError) {
					setErrorMessage(error.errorMessage);
				} else {
					setErrorMessage("Failed to load dashboard insights.");
				}
			} finally {
				setIsLoadingSnapshot(false);
				setIsRefreshing(false);
			}
		},
		[userId, workspaceId],
	);

	useEffect(() => {
		if (isAuthLoading || !userId || !workspaceId) return;
		void loadSnapshot({ initial: true });
	}, [isAuthLoading, loadSnapshot, userId, workspaceId]);

	useEffect(() => {
		const startedAt = snapshot?.execution.runningTimer?.startedAt;
		if (!startedAt) {
			setElapsedSeconds(0);
			return;
		}

		const startMs = new Date(startedAt).getTime();
		const tick = () => {
			const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
			setElapsedSeconds(elapsed);
		};

		tick();
		const interval = setInterval(tick, 1000);

		return () => clearInterval(interval);
	}, [snapshot?.execution.runningTimer?.startedAt]);

	const updateTaskOptimistically = (taskId: string, nextCompleted: boolean) => {
		setSnapshot((prev) => {
			if (!prev) return prev;

			const updatedTasks = prev.execution.todayTasks.map((task) => (task.id === taskId ? { ...task, completed: nextCompleted } : task));

			const completedCount = updatedTasks.filter((task) => task.completed).length;
			const total = updatedTasks.length;

			return {
				...prev,
				execution: {
					...prev.execution,
					todayTasks: updatedTasks,
				},
				kpis: {
					...prev.kpis,
					todayCompletion: {
						...prev.kpis.todayCompletion,
						completed: completedCount,
						total,
						percentage: total === 0 ? 0 : Math.round((completedCount / total) * 100),
					},
				},
			};
		});
	};

	const handleTaskToggle = async (task: DashboardTaskItem) => {
		const nextCompleted = !task.completed;
		setTaskActionId(task.id);
		updateTaskOptimistically(task.id, nextCompleted);

		try {
			await updateTaskCompletion(task.id, nextCompleted, workspaceId, task.milestoneId ?? undefined);
		} catch {
			await loadSnapshot();
			setErrorMessage("Could not update task status. Please retry.");
		} finally {
			setTaskActionId(null);
		}
	};

	const handleStopTimer = async () => {
		if (!snapshot?.execution.runningTimer) return;

		setIsStoppingTimer(true);
		try {
			await stopRunningTimer(userId, workspaceId);
			await loadSnapshot();
		} catch {
			setErrorMessage("Could not stop the timer. Please retry.");
		} finally {
			setIsStoppingTimer(false);
		}
	};

	const handleLogMood = async (mood: QuickMood) => {
		setIsLoggingMood(true);
		setMoodError(null);

		try {
			await saveSatisfactionEntry({
				workspace_id: workspaceId,
				user_id: userId,
				log_date: format(new Date(), "yyyy-MM-dd"),
				score: mood.score,
				notes: mood.id,
			});

			setSnapshot((prev) => {
				if (!prev) return prev;
				const current = prev.kpis.mood.score;
				return {
					...prev,
					kpis: {
						...prev.kpis,
						mood: {
							score: mood.score,
							dayOverDayDelta: current === null ? null : mood.score - current,
						},
					},
				};
			});
		} catch {
			setMoodError("Could not save mood entry.");
		} finally {
			setIsLoggingMood(false);
		}
	};

	const scrollToMoodLogging = () => {
		const element = document.getElementById("mood-logging");
		element?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	if (isLoadingSnapshot || isAuthLoading) {
		return (
			<div className="max-w-7xl mx-auto w-full space-y-6">
				<div className="space-y-3">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-5 w-full max-w-2xl" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
					{[...Array(4)].map((_, index) => (
						<Skeleton key={index} className="h-32 rounded-2xl" />
					))}
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
					<Skeleton className="h-96 rounded-2xl xl:col-span-2" />
					<Skeleton className="h-96 rounded-2xl" />
				</div>
			</div>
		);
	}

	if (!snapshot) {
		return (
			<div className="max-w-4xl mx-auto w-full">
				<Card className="border-destructive/30">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<FontAwesomeIcon icon={faTriangleExclamation} />
							Dashboard unavailable
						</CardTitle>
						<CardDescription>{errorMessage ?? "We could not load your dashboard right now."}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => loadSnapshot({ initial: true })}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto w-full space-y-6">
			<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-3">
					<div className="space-y-1">
						<h1 className="text-3xl font-display font-bold text-foreground">{`Welcome back${user?.first_name ? `, ${user.first_name}` : ""}`}</h1>
						<p className="text-sm text-muted-foreground">
							{workspace?.name ? `${workspace.name}: ` : ""}
							{snapshot.todayFocusStatement}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button asChild>
						<Link href="/planner?action=add">
							<FontAwesomeIcon icon={faPlus} className="mr-2" />
							Add Task
						</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/milestones?action=add">
							<FontAwesomeIcon icon={faBullseye} className="mr-2" />
							Add Milestone
						</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/?action=start-timer">
							<FontAwesomeIcon icon={faClock} className="mr-2" />
							Start Timer
						</Link>
					</Button>
					<Button variant="outline" onClick={scrollToMoodLogging}>
						<FontAwesomeIcon icon={faFaceSmile} className="mr-2" />
						Log Mood
					</Button>
				</div>
			</header>

			{errorMessage && (
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="py-3 text-sm text-destructive flex items-center gap-2">
						<FontAwesomeIcon icon={faTriangleExclamation} />
						{errorMessage}
					</CardContent>
				</Card>
			)}

			<section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Today completion</CardDescription>
						<CardTitle className="text-2xl">
							{snapshot.kpis.todayCompletion.completed}/{snapshot.kpis.todayCompletion.total}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">{snapshot.kpis.todayCompletion.percentage}% complete</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Active milestones</CardDescription>
						<CardTitle className="text-2xl">{snapshot.kpis.activeMilestones.count}</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">{formatDeadlineLabel(snapshot.kpis.activeMilestones.nearestDeadlineDays)}</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Mood score</CardDescription>
						<CardTitle className="text-2xl">{snapshot.kpis.mood.score ?? "--"}</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">{formatMoodDelta(snapshot.kpis.mood.dayOverDayDelta)}</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription>
							Focus time <span className="lowercase">({snapshot.kpis.focusTime.mode === "today" ? "today" : "week-to-date"})</span>
						</CardDescription>
						<CardTitle className="text-2xl">{formatDurationCompact(snapshot.kpis.focusTime.seconds)}</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">Logged from timesheet entries</CardContent>
				</Card>
			</section>

			<section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
				<Card>
					<CardHeader className="flex flex-row items-start justify-between gap-2">
						<div>
							<CardTitle className="text-lg">Overdue tasks</CardTitle>
							<CardDescription>Items that need immediate attention</CardDescription>
						</div>
						{snapshot.insights.overdueTasks.length > 0 && (
							<Link href="/planner?tab=overdue" className="text-xs text-muted-foreground hover:text-primary shrink-0 mt-0.5">
								View all
							</Link>
						)}
					</CardHeader>
					<CardContent className="space-y-3">
						{snapshot.insights.overdueTasks.length === 0 ? (
							<p className="text-sm text-muted-foreground">No overdue tasks in the recent window.</p>
						) : (
							snapshot.insights.overdueTasks.slice(0, 3).map((task) => (
								<div key={task.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
									<p className="text-sm font-medium">{task.title}</p>
									<p className="text-xs text-muted-foreground mt-1">
										{task.daysOverdue} day{task.daysOverdue === 1 ? "" : "s"} overdue
									</p>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-start justify-between gap-2">
						<div>
							<CardTitle className="text-lg">Upcoming milestones</CardTitle>
							<CardDescription>Next 3 active deadlines</CardDescription>
						</div>
						{snapshot.insights.upcomingMilestones.length > 0 && (
							<Link href="/milestones" className="text-xs text-muted-foreground hover:text-primary shrink-0 mt-0.5">
								View all
							</Link>
						)}
					</CardHeader>
					<CardContent className="space-y-3">
						{snapshot.insights.upcomingMilestones.length === 0 ? (
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">No active milestone deadlines yet.</p>
								<Button asChild size="sm" variant="outline">
									<Link href="/milestones?action=add">Create milestone</Link>
								</Button>
							</div>
						) : (
							snapshot.insights.upcomingMilestones.map((milestone) => (
								<div key={milestone.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{milestone.title}</p>
										<p className="text-xs text-muted-foreground">{formatDeadlineLabel(milestone.daysLeft)}</p>
									</div>
									<Badge variant="outline" className="capitalize">
										{milestone.urgency}
									</Badge>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Standup highlights</CardTitle>
						<CardDescription>Recent blockers and notes</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{snapshot.insights.standup.latestLogDate ? <Badge variant="secondary">Latest: {format(new Date(snapshot.insights.standup.latestLogDate), "MMM d")}</Badge> : <Badge variant="outline">No recent standups</Badge>}

						{snapshot.insights.standup.blockers.length > 0 ? (
							<div className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blockers</p>
								{snapshot.insights.standup.blockers.map((blocker, index) => (
									<p key={`${blocker}-${index}`} className="text-sm">
										- {blocker}
									</p>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No blockers captured.</p>
						)}

						{snapshot.insights.standup.notes.length > 0 && (
							<div className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
								{snapshot.insights.standup.notes.map((note, index) => (
									<p key={`${note}-${index}`} className="text-sm">
										- {note}
									</p>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<CardTitle className="text-lg">Today's tasks</CardTitle>
							<CardDescription>Complete tasks here or continue in the planner</CardDescription>
						</div>
						<Button asChild size="sm" variant="outline">
							<Link href="/planner?tab=today">Open planner</Link>
						</Button>
					</CardHeader>
					<CardContent className="space-y-2">
						{snapshot.execution.todayTasks.length === 0 ? (
							<div className="rounded-lg border border-dashed p-6 text-center">
								<p className="text-sm text-muted-foreground mb-3">No tasks scheduled for today.</p>
								<Button asChild size="sm">
									<Link href="/planner?action=add">Add your first task</Link>
								</Button>
							</div>
						) : (
							snapshot.execution.todayTasks.map((task) => (
								<button key={task.id} type="button" className={cn("w-full rounded-xl border p-3 text-left transition-colors", task.completed ? "bg-muted/40 border-border/60" : "bg-card hover:border-primary/40")} onClick={() => handleTaskToggle(task)} disabled={taskActionId === task.id}>
									<div className="flex items-center gap-3">
										<FontAwesomeIcon icon={task.completed ? faCircleCheck : faCircle} className={cn("h-4 w-4", task.completed ? "text-green-600" : "text-muted-foreground")} />
										<span className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>{task.title}</span>
										{taskActionId === task.id && <FontAwesomeIcon icon={faSpinner} className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
									</div>
								</button>
							))
						)}
					</CardContent>
				</Card>

				<div className="space-y-5">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Timer</CardTitle>
							<CardDescription>Live focus session status</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{snapshot.execution.runningTimer ? (
								<>
									<p className="text-sm text-muted-foreground truncate">
										{snapshot.execution.runningTimer.emoji ? `${snapshot.execution.runningTimer.emoji} ` : ""}
										{snapshot.execution.runningTimer.taskTitle}
									</p>
									<p className="text-3xl font-mono font-semibold tracking-tight">{formatElapsedTime(elapsedSeconds)}</p>
									<Button variant="destructive" onClick={handleStopTimer} disabled={isStoppingTimer}>
										{isStoppingTimer ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : <FontAwesomeIcon icon={faStop} className="mr-2" />}
										Stop Timer
									</Button>
								</>
							) : (
								<>
									<p className="text-sm text-muted-foreground">No active timer. Start one from the quick action to begin tracking.</p>
									<Button asChild>
										<Link href="/?action=start-timer">
											<FontAwesomeIcon icon={faClock} className="mr-2" />
											Start Timer
										</Link>
									</Button>
								</>
							)}
						</CardContent>
					</Card>

					<Card id="mood-logging" className="rounded-[2rem] border-0 shadow-soft p-4 flex flex-col justify-between">
						<CardHeader className="pb-4">
							<CardTitle className="text-lg">Mood Logging</CardTitle>
							<CardDescription>Quick entry now, full calendar when needed</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-wrap gap-2">
								{QUICK_MOODS.map((mood) => (
									<Button key={mood.id} type="button" variant={activeMoodId === mood.id ? "default" : "outline"} size="sm" disabled={isLoggingMood} onClick={() => handleLogMood(mood)} className="rounded-full h-8 px-4 text-xs font-medium">
										{mood.label}
									</Button>
								))}
							</div>

							<p className="text-xs text-muted-foreground">Current score: {snapshot.kpis.mood.score ?? "--"} / 10</p>

							{moodError && <p className="text-xs text-destructive">{moodError}</p>}

							<Button variant="ghost" size="sm" className="w-full text-xs hover:bg-emerald-500/10 hover:text-emerald-600 rounded-full" onClick={() => setShowMoodCalendar((prev) => !prev)}>
								{showMoodCalendar ? "Hide full mood calendar" : "Open full mood calendar"}
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>

			{showMoodCalendar && (
				<Card>
					<CardContent className="p-0">
						<LazySatisfactionCalendar />
					</CardContent>
				</Card>
			)}

			<div className="flex justify-end">
				<Button variant="outline" size="sm" onClick={() => loadSnapshot()} disabled={isRefreshing}>
					{isRefreshing ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : null}
					Refresh
				</Button>
			</div>
		</div>
	);
}
