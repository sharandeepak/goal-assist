"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/common/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/ui/tabs";
import {
	CheckCircle2,
	AlertCircle,
	Clock,
	Loader2,
	ListChecks,
	NotebookPen,
	Save,
	Trash2,
	CalendarCheck,
	Sparkles,
} from "lucide-react";
import { Skeleton } from "@/common/ui/skeleton";
import { StandupLog, Task } from "@/common/types";
import { subscribeToRecentStandups } from "@/features/standup/services/standupService";
import { getTasksForDate } from "@/features/tasks/services/taskService";
import { formatRelative, format, subDays, startOfDay, endOfDay } from "date-fns";
import { Textarea } from "@/common/ui/textarea";
import { Button } from "@/common/ui/button";
import { cn } from "@/common/lib/utils";
import { styles } from "@/features/standup/styles/StandupSummary.styles";

const formatRelativeDate = (dateStr: string) => {
	const date = new Date(dateStr);
	const relative = formatRelative(date, new Date());
	return relative.charAt(0).toUpperCase() + relative.slice(1).split(" at")[0];
};

export default function StandupSummary() {
	const [standupLogs, setStandupLogs] = useState<StandupLog[]>([]);
	const [loadingStandups, setLoadingStandups] = useState(true);
	const [errorStandups, setErrorStandups] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<string>("");

	const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(true);
	const [errorTasks, setErrorTasks] = useState<string | null>(null);

	const [quickNote, setQuickNote] = useState<string>("");
	const [isSavingNote, setIsSavingNote] = useState(false);

	useEffect(() => {
		setLoadingStandups(true);
		setErrorStandups(null);

		const unsubscribe = subscribeToRecentStandups(
			(fetchedLogs) => {
				setStandupLogs(fetchedLogs);
				if (fetchedLogs.length > 0 && (!activeTab || !fetchedLogs.some((log) => log.id === activeTab))) {
					setActiveTab(fetchedLogs[0].id);
				} else if (fetchedLogs.length === 0) {
					setActiveTab("");
				}
				setLoadingStandups(false);
			},
			(err) => {
				console.error(err);
				setErrorStandups("Failed to load standup summaries.");
				setLoadingStandups(false);
			}
		);
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		const fetchCompletedTasks = async () => {
			setLoadingTasks(true);
			setErrorTasks(null);
			try {
				const today = new Date();
				const yesterday = subDays(today, 1);
				const [todayTasks, yesterdayTasks] = await Promise.all([
					getTasksForDate(today),
					getTasksForDate(yesterday),
				]);

				const allTasks = [...todayTasks, ...yesterdayTasks];
				const completed = allTasks.filter((t) => t.completed);
				setCompletedTasks(completed);
			} catch (err) {
				console.error("Failed to fetch completed tasks:", err);
				setErrorTasks("Could not load completed tasks.");
			} finally {
				setLoadingTasks(false);
			}
		};
		fetchCompletedTasks();
	}, []);

	useEffect(() => {
		const savedNote = localStorage.getItem("quickStandupNote");
		if (savedNote) {
			setQuickNote(savedNote);
		}
	}, []);

	const handleSaveNote = () => {
		setIsSavingNote(true);
		try {
			localStorage.setItem("quickStandupNote", quickNote);
			setTimeout(() => {
				setIsSavingNote(false);
			}, 500);
		} catch (error) {
			console.error("Failed to save note to local storage:", error);
			setIsSavingNote(false);
		}
	};

	const handleClearNote = () => {
		setQuickNote("");
		localStorage.removeItem("quickStandupNote");
	};

	const renderCompletedTasks = () => {
		return (
			<Card variant="elevated" className={styles.cardFullHeight}>
				<CardHeader className={styles.cardHeader}>
					<CardTitle className={styles.cardTitleRow}>
						<div className={styles.iconBadgeGreen}>
							<ListChecks className="h-4 w-4 text-green-600 dark:text-green-400" />
						</div>
						<span>Completed Tasks (Last 2 Days)</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					{loadingTasks ? (
						<div className={styles.skeletonList}>
							{[...Array(3)].map((_, i) => (
								<div key={i} className={styles.skeletonItem}>
									<Skeleton className="h-5 w-5 rounded-full" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					) : errorTasks ? (
						<div className={styles.errorState}>
							<AlertCircle className="h-4 w-4" />
							<p className="text-sm">{errorTasks}</p>
						</div>
					) : completedTasks.length === 0 ? (
						<div className={styles.emptyState}>
							<div className={styles.emptyStateIcon}>
								<CalendarCheck className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-sm text-muted-foreground">No tasks completed recently.</p>
						</div>
					) : (
						<ul className={styles.taskList}>
							{completedTasks.map((task, index) => (
								<li
									key={task.id}
									className={cn(styles.taskItem, "animate-fade-up")}
									style={{ animationDelay: `${index * 50}ms` }}
								>
									<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
									<span className="flex-grow text-sm font-medium truncate">{task.title}</span>
									<span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-background">
										{task.date ? format(new Date(task.date), "MMM d") : "N/A"}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		);
	};

	const renderQuickNotes = () => {
		return (
			<Card variant="elevated" className={styles.cardFullHeight}>
				<CardHeader className={styles.cardHeader}>
					<CardTitle className={styles.cardTitleRow}>
						<div className={styles.iconBadgePrimary}>
							<NotebookPen className="h-4 w-4 text-primary" />
						</div>
						<span>Quick Notes</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					<Textarea
						placeholder="Jot down quick thoughts or reminders..."
						value={quickNote}
						onChange={(e) => setQuickNote(e.target.value)}
						rows={4}
						className="resize-none bg-muted/30 border-0 focus-visible:ring-1"
					/>
				</CardContent>
				<CardFooter className={styles.cardFooterActions}>
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearNote}
						disabled={!quickNote}
						className="gap-2"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Clear
					</Button>
					<Button
						size="sm"
						onClick={handleSaveNote}
						disabled={isSavingNote || !quickNote}
						className="gap-2"
					>
						{isSavingNote ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Save className="h-3.5 w-3.5" />
						)}
						{isSavingNote ? "Saving..." : "Save"}
					</Button>
				</CardFooter>
			</Card>
		);
	};

	return (
		<div className={styles.gridLayout}>
			<div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
				{renderCompletedTasks()}
			</div>
			<div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
				{renderQuickNotes()}
			</div>
		</div>
	);
}
