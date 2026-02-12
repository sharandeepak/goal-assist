"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StandupLog, Task } from "@/types";
import { subscribeToRecentStandups } from "@/services/standupService";
import { formatRelative, format, subDays, startOfDay, endOfDay } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Timestamp, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

// Helper to format relative date
const formatRelativeDate = (date: Date) => {
	const relative = formatRelative(date, new Date());
	return relative.charAt(0).toUpperCase() + relative.slice(1).split(" at")[0];
};

export default function StandupSummary() {
	const [standupLogs, setStandupLogs] = useState<StandupLog[]>([]);
	const [loadingStandups, setLoadingStandups] = useState(true);
	const [errorStandups, setErrorStandups] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<string>("");

	// State for Completed Tasks
	const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(true);
	const [errorTasks, setErrorTasks] = useState<string | null>(null);

	// State for Quick Notes
	const [quickNote, setQuickNote] = useState<string>("");
	const [isSavingNote, setIsSavingNote] = useState(false);

	// Effect for Standups
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

	// Effect for Completed Tasks
	useEffect(() => {
		const fetchCompletedTasks = async () => {
			setLoadingTasks(true);
			setErrorTasks(null);
			try {
				const today = new Date();
				const twoDaysAgo = startOfDay(subDays(today, 1));
				const now = endOfDay(today);

				const tasksRef = collection(db, "tasks");
				const q = query(
					tasksRef,
					where("completed", "==", true),
					where("date", ">=", Timestamp.fromDate(twoDaysAgo)),
					where("date", "<=", Timestamp.fromDate(now)),
					orderBy("date", "desc")
				);

				const querySnapshot = await getDocs(q);
				const fetchedTasks = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Task));
				setCompletedTasks(fetchedTasks);
			} catch (err) {
				console.error("Failed to fetch completed tasks:", err);
				setErrorTasks("Could not load completed tasks.");
			} finally {
				setLoadingTasks(false);
			}
		};
		fetchCompletedTasks();
	}, []);

	// Effect for Quick Notes
	useEffect(() => {
		const savedNote = localStorage.getItem("quickStandupNote");
		if (savedNote) {
			setQuickNote(savedNote);
		}
	}, []);

	// Handlers
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

	// Render Completed Tasks
	const renderCompletedTasks = () => {
		return (
			<Card variant="elevated" className="h-full">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-3 text-base">
						<div className="p-2 rounded-lg bg-green-500/10">
							<ListChecks className="h-4 w-4 text-green-600 dark:text-green-400" />
						</div>
						<span>Completed Tasks (Last 2 Days)</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0">
					{loadingTasks ? (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
									<Skeleton className="h-5 w-5 rounded-full" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					) : errorTasks ? (
						<div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
							<AlertCircle className="h-4 w-4" />
							<p className="text-sm">{errorTasks}</p>
						</div>
					) : completedTasks.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<div className="p-3 rounded-full bg-muted/50 mb-3">
								<CalendarCheck className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-sm text-muted-foreground">No tasks completed recently.</p>
						</div>
					) : (
						<ul className="space-y-2">
							{completedTasks.map((task, index) => (
								<li
									key={task.id}
									className={cn(
										"flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors",
										"animate-fade-up"
									)}
									style={{ animationDelay: `${index * 50}ms` }}
								>
									<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
									<span className="flex-grow text-sm font-medium truncate">{task.title}</span>
									<span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-background">
										{task.date ? format(task.date.toDate(), "MMM d") : "N/A"}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		);
	};

	// Render Quick Notes
	const renderQuickNotes = () => {
		return (
			<Card variant="elevated" className="h-full">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-3 text-base">
						<div className="p-2 rounded-lg bg-primary/10">
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
				<CardFooter className="flex justify-end gap-2 pt-3">
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
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
				{renderCompletedTasks()}
			</div>
			<div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
				{renderQuickNotes()}
			</div>
		</div>
	);
}
