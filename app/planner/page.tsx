"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, CheckCircle2, Clock, Plus, Tag, Trash2, Loader2, Edit, Flag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/types";
import { subscribeToTasksByDateRange, addTask, updateTaskCompletion, deleteTask, updateTask } from "@/services/taskService";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { AlertTriangle } from "lucide-react";
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog";
import { useSearchParams } from "next/navigation";

const getPriorityColor = (priority?: Task["priority"]) => {
	switch (priority) {
		case "high":
			return "text-red-600 dark:text-red-500";
		case "medium":
			return "text-yellow-600 dark:text-yellow-500";
		case "low":
			return "text-green-600 dark:text-green-500";
		default:
			return "text-muted-foreground";
	}
};

const getPriorityLabel = (priority?: Task["priority"]) => {
	switch (priority) {
		case "high":
			return "High";
		case "medium":
			return "Medium";
		case "low":
			return "Low";
		default:
			return "None";
	}
};

const formatDate = (timestamp?: Timestamp): string => {
	if (!timestamp) return "N/A";
	try {
		const date = timestamp.toDate();
		if (isNaN(date.getTime())) {
			throw new Error("Invalid Date object from Timestamp");
		}
		return format(date, "MMM d, yyyy");
	} catch (e) {
		console.error("Error formatting timestamp:", timestamp, e);
		return "Invalid Date";
	}
};

const formatDateForInput = (timestamp?: Timestamp): string => {
	if (!timestamp) return "";
	try {
		return format(timestamp.toDate(), "yyyy-MM-dd");
	} catch {
		return "";
	}
};

function DayPlannerContent() {
	const [todayTasks, setTodayTasks] = useState<Task[]>([]);
	const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [loadingToday, setLoadingToday] = useState(true);
	const [loadingUpcoming, setLoadingUpcoming] = useState(true);
	const [loadingAll, setLoadingAll] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// --- State for Dialogs ---
	const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
	const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);

	const todayStart = startOfDay(new Date());
	const todayEnd = endOfDay(new Date());
	const tomorrowStart = startOfDay(addDays(new Date(), 1));
	const upcomingEnd = endOfDay(addDays(new Date(), 7));
	const allTasksStartDate = new Date(0);
	const allTasksEndDate = new Date(new Date().setFullYear(new Date().getFullYear() + 100));

	const searchParams = useSearchParams();
	const initialTab = searchParams?.get("tab") || "today";

	useEffect(() => {
		if (searchParams?.get("action") === "add") {
			setIsAddTaskDialogOpen(true);
		}
	}, [searchParams]);

	useEffect(() => {
		setLoadingToday(true);
		const unsubscribe = subscribeToTasksByDateRange(
			todayStart,
			todayEnd,
			(fetchedTasks) => {
				setTodayTasks(fetchedTasks);
				setLoadingToday(false);
				setError((prev) => (prev === "Failed to load today's tasks." ? null : prev));
			},
			(err) => {
				console.error("Error loading today's tasks:", err);
				setError("Failed to load today's tasks.");
				setLoadingToday(false);
			}
		);
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		setLoadingUpcoming(true);
		const unsubscribe = subscribeToTasksByDateRange(
			tomorrowStart,
			upcomingEnd,
			(fetchedTasks) => {
				setUpcomingTasks(fetchedTasks);
				setLoadingUpcoming(false);
				setError((prev) => (prev === "Failed to load upcoming tasks." ? null : prev));
			},
			(err) => {
				console.error("Error loading upcoming tasks:", err);
				setError((prev) => (prev ? prev + " Failed to load upcoming tasks." : "Failed to load upcoming tasks."));
				setLoadingUpcoming(false);
			}
		);
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		setLoadingAll(true);
		const unsubscribe = subscribeToTasksByDateRange(
			allTasksStartDate,
			allTasksEndDate,
			(fetchedTasks) => {
				setAllTasks(fetchedTasks.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)));
				setLoadingAll(false);
				setError((prev) => (prev === "Failed to load all tasks." ? null : prev));
			},
			(err) => {
				console.error("Error loading all tasks:", err);
				setError((prev) => (prev ? prev + " Failed to load all tasks." : "Failed to load all tasks."));
				setLoadingAll(false);
			}
		);
		return () => unsubscribe();
	}, []);

	const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
		try {
			await updateTaskCompletion(taskId, !currentCompleted, undefined);
		} catch (err) {
			console.error("Failed to update task completion:", err);
			setError("Failed to update task status.");
		}
	};

	const handleDeleteTask = async (taskId: string) => {
		if (!confirm("Are you sure you want to delete this task?")) return;
		try {
			await deleteTask(taskId, undefined);
		} catch (err) {
			console.error("Failed to delete task:", err);
			setError("Failed to delete task.");
		}
	};

	// --- Dialog Submit Handlers ---
	const handleAddTaskSubmit = async (formData: TaskFormData) => {
		// Default date if not provided
		const dateToSave = formData.date || Timestamp.fromDate(todayStart);

		const taskToAdd: Omit<Task, "id"> = {
			title: formData.title!, // Assert non-null as validated in dialog
			completed: false,
			date: dateToSave,
			priority: formData.priority!, // Assert non-null
			createdAt: Timestamp.now(),
			tags:
				formData.tagsString
					?.split(",")
					.map((tag: string) => tag.trim())
					.filter((tag: string) => tag !== "") || [],
		};
		try {
			await addTask(taskToAdd);
			setIsAddTaskDialogOpen(false); // Close dialog on success
		} catch (err) {
			console.error("Failed to add task:", err);
			// Re-throw the error to be caught by the dialog
			throw err instanceof Error ? err : new Error("Failed to add task.");
		}
	};

	const handleUpdateTaskSubmit = async (formData: TaskFormData) => {
		if (!editingTask) throw new Error("No task selected for editing.");

		// Default date if not provided during edit
		const dateToSave = formData.date || Timestamp.fromDate(todayStart);

		const dataToUpdate: Partial<Omit<Task, "id" | "completed" | "createdAt" | "milestoneId">> = {
			title: formData.title!,
			priority: formData.priority!,
			date: dateToSave,
			tags:
				formData.tagsString
					?.split(",")
					.map((tag: string) => tag.trim())
					.filter((tag: string) => tag !== "") || [],
		};
		try {
			await updateTask(editingTask.id, dataToUpdate);
			setIsEditTaskDialogOpen(false);
			setEditingTask(null);
		} catch (err) {
			console.error("Failed to update task:", err);
			// Re-throw the error to be caught by the dialog
			throw err instanceof Error ? err : new Error("Failed to update task.");
		}
	};

	// --- Dialog Open Handlers ---
	const openAddTaskDialog = () => {
		setEditingTask(null);
		setIsAddTaskDialogOpen(true);
	};
	const openEditTaskDialog = (task: Task) => {
		setEditingTask(task);
		setIsEditTaskDialogOpen(true);
	};

	const renderTaskList = (tasks: Task[], isLoading: boolean) => {
		if (isLoading) {
			return (
				<div className="space-y-4">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="flex items-center justify-between space-x-2 p-3 rounded-lg border">
							<div className="flex items-center space-x-3 flex-1 min-w-0">
								<Skeleton className="h-5 w-5 rounded" />
								<Skeleton className="h-5 w-3/4" />
							</div>
							<div className="flex items-center gap-2 flex-shrink-0">
								<Skeleton className="h-6 w-16 rounded-md" />
								<Skeleton className="h-6 w-24 rounded-md" />
								<Skeleton className="h-8 w-8 rounded" />
								<Skeleton className="h-8 w-8 rounded" />
							</div>
						</div>
					))}
				</div>
			);
		}
		if (tasks.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<CheckCircle2 className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
					<h3 className="font-medium text-lg">No tasks</h3>
					<p className="text-sm text-muted-foreground">No tasks scheduled for this period.</p>
				</div>
			);
		}
		return (
			<div className="space-y-4">
				{tasks.map((task) => (
					<div key={task.id} className="flex items-center justify-between space-x-2 task-card p-3 rounded-lg border group">
						<div className="flex items-center space-x-3 flex-1 min-w-0">
							<Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleTaskToggle(task.id, task.completed)} aria-label={`Mark task ${task.title} as ${task.completed ? "incomplete" : "complete"}`} className="mt-1 self-start" />
							<div className="flex-1 min-w-0">
								<label htmlFor={`task-${task.id}`} className={`text-sm font-medium leading-none truncate block ${task.completed ? "line-through text-muted-foreground" : ""}`} title={task.title}>
									{task.title}
								</label>
								{task.tags && task.tags.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-1.5">
										{task.tags.map((tag, i) => (
											<Badge key={i} variant="secondary" className="text-xs px-1.5 py-0.5">
												{tag}
											</Badge>
										))}
									</div>
								)}
							</div>
						</div>
						<div className="flex items-center gap-1.5 flex-shrink-0">
							{task.priority && (
								<Badge variant="outline" className={`${getPriorityColor(task.priority)} border-current w-[70px] justify-center px-1 py-0.5 text-xs`}>
									<Flag className={`h-3 w-3 mr-1 ${getPriorityColor(task.priority)}`} />
									{getPriorityLabel(task.priority)}
								</Badge>
							)}
							{task.date && (
								<Badge variant="outline" className="w-[95px] justify-center px-1 py-0.5 text-xs">
									<Calendar className="h-3 w-3 mr-1" />
									{formatDate(task.date)}
								</Badge>
							)}
							<Button variant="ghost" size="icon" onClick={() => openEditTaskDialog(task)} className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
								<Edit className="h-3.5 w-3.5" />
								<span className="sr-only">Edit Task</span>
							</Button>
							<Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
								<Trash2 className="h-3.5 w-3.5" />
								<span className="sr-only">Delete Task</span>
							</Button>
						</div>
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Day Planner</h1>
					<p className="text-muted-foreground">Manage your daily tasks and priorities</p>
				</div>
				<Button onClick={openAddTaskDialog}>
					<Plus className="mr-2 h-4 w-4" />
					Add Task
				</Button>
			</div>

			<TaskFormDialog isOpen={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen} onSubmit={handleAddTaskSubmit} dialogTitle="Add New Task" dialogDescription="Enter details for the new task. Priority is required." />

			<TaskFormDialog isOpen={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen} onSubmit={handleUpdateTaskSubmit} initialData={editingTask} dialogTitle="Edit Task" dialogDescription={`Update details for "${editingTask?.title || "task"}". Priority is required.`} />

			{error && (
				<Card className="border-destructive bg-destructive/10 mt-4">
					<CardContent className="p-4 text-center text-destructive flex items-center justify-center gap-2">
						<AlertTriangle className="h-4 w-4" /> {error}
					</CardContent>
				</Card>
			)}

			<Tabs defaultValue={initialTab} className="space-y-4">
				<TabsList>
					<TabsTrigger value="today">Today</TabsTrigger>
					<TabsTrigger value="upcoming">Upcoming (Next 7 Days)</TabsTrigger>
					<TabsTrigger value="all">All Tasks</TabsTrigger>
				</TabsList>
				<TabsContent value="today" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Today's Tasks</CardTitle>
							<CardDescription>Tasks scheduled for today.</CardDescription>
						</CardHeader>
						<CardContent>{renderTaskList(todayTasks, loadingToday)}</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="upcoming" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Upcoming Tasks</CardTitle>
							<CardDescription>Tasks scheduled for the next 7 days (excluding today).</CardDescription>
						</CardHeader>
						<CardContent>{renderTaskList(upcomingTasks, loadingUpcoming)}</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="all" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>All Tasks</CardTitle>
							<CardDescription>All your tasks, past, present, and future.</CardDescription>
						</CardHeader>
						<CardContent>{renderTaskList(allTasks, loadingAll)}</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function DayPlanner() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DayPlannerContent />
		</Suspense>
	);
}
