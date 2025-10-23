"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Plus, Target, Trash2, AlertTriangle, Loader2, ListTodo, ChevronDown, ChevronRight, Edit, Flag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Milestone, Task } from "@/types";
import { subscribeToMilestonesByStatus, addMilestone, deleteMilestone, updateMilestone } from "@/services/milestoneService";
import { getTasksForMilestone, addTask, updateTaskCompletion, updateTask, deleteTask as deleteTaskService } from "@/services/taskService";
import { Timestamp } from "firebase/firestore";
import { startOfDay, differenceInCalendarDays, format, addDays, parseISO, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSearchParams } from "next/navigation";

// Helper to calculate days left
const calculateDaysLeft = (endDate: Timestamp | undefined): number | undefined => {
	if (!endDate) return undefined;
	const today = startOfDay(new Date());
	const end = startOfDay(endDate.toDate());
	const diff = differenceInCalendarDays(end, today);
	return Math.max(0, diff);
};

// Colors for urgency badge
const getUrgencyColor = (urgency?: string) => {
	switch (urgency) {
		case "high":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
		case "medium":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
		case "low":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
		case "completed":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
		default:
			return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
	}
};

// Format date nicely
const formatDate = (timestamp?: Timestamp): string => {
	if (!timestamp) return "N/A";
	return format(timestamp.toDate(), "MMM d, yyyy");
};

// Colors for priority
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

// Format date for input type="date"
const formatDateForInput = (timestamp?: Timestamp): string => {
	if (!timestamp) return "";
	try {
		return format(timestamp.toDate(), "yyyy-MM-dd");
	} catch {
		// Handle potential invalid date in Firestore
		return "";
	}
};

// --- Task Item Component ---
interface MilestoneTaskItemProps {
	task: Task;
	milestoneId: string;
	onToggle: (taskId: string, currentCompleted: boolean, milestoneId?: string) => void;
	onDelete: (taskId: string, milestoneId?: string) => void;
	onEditRequest: (task: Task) => void;
}

function MilestoneTaskItem({ task, milestoneId, onToggle, onDelete, onEditRequest }: MilestoneTaskItemProps) {
	return (
		<div className="flex items-center justify-between space-x-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
			<div className="flex items-center space-x-2 flex-1 min-w-0">
				<Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => onToggle(task.id, task.completed, milestoneId)} className="h-4 w-4" aria-label={`Mark task ${task.title} as ${task.completed ? "incomplete" : "complete"}`} />
				<label htmlFor={`task-${task.id}`} className={`text-sm leading-none truncate ${task.completed ? "line-through text-muted-foreground" : ""}`} title={task.title}>
					{task.title}
				</label>
			</div>
			<div className="flex items-center space-x-1 flex-shrink-0">
				{/* Show Priority and Date */}
				{task.priority && <Flag className={`h-3.5 w-3.5 ${getPriorityColor(task.priority)}`} />}
				{task.date && <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(task.date)}</span>}
				{/* Edit Button */}
				<Button variant="ghost" size="icon" onClick={() => onEditRequest(task)} className="h-6 w-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
					<Edit className="h-3.5 w-3.5" />
					<span className="sr-only">Edit Task</span>
				</Button>
				{/* Delete Button */}
				<Button variant="ghost" size="icon" onClick={() => onDelete(task.id, milestoneId)} className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
					<Trash2 className="h-3.5 w-3.5" />
					<span className="sr-only">Delete Task</span>
				</Button>
			</div>
		</div>
	);
}

// --- Milestone Card Component ---
interface MilestoneCardProps {
	milestone: Milestone;
	onDelete: (id: string, deleteTasks: boolean) => void;
}

function MilestoneCard({ milestone, onDelete }: MilestoneCardProps) {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(true);
	const [taskError, setTaskError] = useState<string | null>(null);
	const [isTasksOpen, setIsTasksOpen] = useState(false);
	const [editMilestoneOpen, setEditMilestoneOpen] = useState(false);
	const [editMilestoneData, setEditMilestoneData] = useState<Partial<Omit<Milestone, "id" | "progress" | "startDate" | "tasks">>>({});
	const [editMilestoneError, setEditMilestoneError] = useState<string | null>(null);
	const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
	const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);

	useEffect(() => {
		setLoadingTasks(true);
		setTaskError(null);
		getTasksForMilestone(milestone.id)
			.then((fetchedTasks) => {
				setTasks(fetchedTasks);
			})
			.catch((err) => {
				console.error(`Error fetching tasks for milestone ${milestone.id}:`, err);
				setTaskError("Failed to load tasks.");
			})
			.finally(() => {
				setLoadingTasks(false);
			});
	}, [milestone.id]);

	const openEditMilestoneDialog = () => {
		setEditMilestoneData({
			title: milestone.title,
			description: milestone.description,
			status: milestone.status,
			urgency: milestone.urgency,
			endDate: milestone.endDate,
		});
		setEditMilestoneError(null);
		setEditMilestoneOpen(true);
	};

	const handleUpdateMilestone = async () => {
		if (!editMilestoneData.title?.trim()) {
			setEditMilestoneError("Title cannot be empty.");
			return;
		}
		try {
			setEditMilestoneError(null);
			await updateMilestone(milestone.id, {
				...editMilestoneData,
				title: editMilestoneData.title.trim(),
			});
			setEditMilestoneOpen(false);
		} catch (err) {
			console.error("Failed to update milestone:", err);
			setEditMilestoneError(err instanceof Error ? err.message : "Failed to update milestone.");
		}
	};

	const handleAddTaskSubmit = async (formData: TaskFormData) => {
		const dateToSave = formData.date || Timestamp.fromDate(startOfDay(new Date()));

		const taskToAdd: Omit<Task, "id"> = {
			title: formData.title!,
			completed: false,
			milestoneId: milestone.id,
			date: dateToSave,
			priority: formData.priority!,
			createdAt: Timestamp.now(),
			tags:
				formData.tagsString
					?.split(",")
					.map((tag: string) => tag.trim())
					.filter((tag: string) => tag !== "") || [],
		};
		try {
			await addTask(taskToAdd);
			setIsAddTaskDialogOpen(false);
			getTasksForMilestone(milestone.id)
				.then(setTasks)
				.catch(() => setTaskError("Failed to refresh tasks after add."));
		} catch (err) {
			console.error("Failed to add task:", err);
			throw err instanceof Error ? err : new Error("Failed to add task.");
		}
	};

	const handleUpdateTaskSubmit = async (formData: TaskFormData) => {
		if (!editingTask) throw new Error("No task selected for editing.");
		const dateToSave = formData.date || Timestamp.fromDate(startOfDay(new Date()));

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
			getTasksForMilestone(milestone.id)
				.then(setTasks)
				.catch(() => setTaskError("Failed to refresh tasks after edit."));
		} catch (err) {
			console.error("Failed to update task:", err);
			throw err instanceof Error ? err : new Error("Failed to update task.");
		}
	};

	const openAddTaskDialog = () => {
		setEditingTask(null);
		setIsAddTaskDialogOpen(true);
	};
	const openEditTaskDialog = (task: Task) => {
		setEditingTask(task);
		setIsEditTaskDialogOpen(true);
	};

	const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
		try {
			setTaskError(null);
			setTasks((prevTasks) => prevTasks.map((t) => (t.id === taskId ? { ...t, completed: !currentCompleted } : t)));
			await updateTaskCompletion(taskId, !currentCompleted, milestone.id);
		} catch (err) {
			console.error("Failed to toggle task:", err);
			setTaskError("Failed to update task status.");
			setTasks((prevTasks) => prevTasks.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t)));
		}
	};

	const handleDeleteTask = async (taskId: string) => {
		try {
			setTaskError(null);
			setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
			await deleteTaskService(taskId, milestone.id);
		} catch (err) {
			console.error("Failed to delete task:", err);
			setTaskError("Failed to delete task.");
			getTasksForMilestone(milestone.id).then(setTasks);
		}
	};

	const daysLeft = calculateDaysLeft(milestone.endDate);
	const urgencyLabel = milestone.urgency.charAt(0).toUpperCase() + milestone.urgency.slice(1);

	return (
		<Card>
			{/* Edit Milestone Sheet */}
			<Sheet open={editMilestoneOpen} onOpenChange={setEditMilestoneOpen}>
				<SheetContent className="sm:max-w-[480px]">
					<SheetHeader>
						<SheetTitle>Edit Milestone</SheetTitle>
						<SheetDescription>Update the details for "{milestone.title}".</SheetDescription>
					</SheetHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-milestone-title">Title</Label>
							<Input id="edit-milestone-title" value={editMilestoneData.title || ""} onChange={(e) => setEditMilestoneData({ ...editMilestoneData, title: e.target.value })} placeholder="Milestone title" />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-milestone-desc">Description</Label>
							<Textarea id="edit-milestone-desc" value={editMilestoneData.description || ""} onChange={(e) => setEditMilestoneData({ ...editMilestoneData, description: e.target.value })} placeholder="Milestone description (optional)" />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>Deadline</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!editMilestoneData.endDate ? "text-muted-foreground" : ""}`}>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{editMilestoneData.endDate ? formatDate(editMilestoneData.endDate) : <span>Pick a date</span>}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<ShadCalendar mode="single" selected={editMilestoneData.endDate?.toDate()} onSelect={(date: Date | undefined) => setEditMilestoneData({ ...editMilestoneData, endDate: date ? Timestamp.fromDate(startOfDay(date)) : undefined })} initialFocus />
									</PopoverContent>
								</Popover>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-milestone-status">Status</Label>
								<Select value={editMilestoneData.status || ""} onValueChange={(value) => setEditMilestoneData({ ...editMilestoneData, status: value as Milestone["status"] })}>
									<SelectTrigger id="edit-milestone-status">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
										<SelectItem value="archived">Archived</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					{editMilestoneError && <p className="text-sm text-red-600 text-center -mt-2 mb-2">{editMilestoneError}</p>}
					<SheetFooter>
						<Button variant="outline" onClick={() => setEditMilestoneOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleUpdateMilestone}>Save Changes</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			{/* Use Imported Task Dialog for Adding */}
			<TaskFormDialog isOpen={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen} onSubmit={handleAddTaskSubmit} dialogTitle={`Add Task to "${milestone.title}"`} dialogDescription="Enter details for the new task. Priority is required." />

			{/* Use Imported Task Dialog for Editing */}
			<TaskFormDialog isOpen={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen} onSubmit={handleUpdateTaskSubmit} initialData={editingTask} dialogTitle="Edit Task" dialogDescription={`Update details for "${editingTask?.title || "task"}". Priority is required.`} />

			{/* Card Header */}
			<CardHeader>
				<div className="flex justify-between items-start gap-2">
					<CardTitle className="text-lg flex-1 mr-2 truncate" title={milestone.title}>
						{milestone.title}
					</CardTitle>
					<div className="flex flex-shrink-0 -mt-2 -mr-2">
						{/* Edit Milestone Button - Triggers the Sheet */}
						<Button variant="ghost" size="icon" onClick={openEditMilestoneDialog} className="text-muted-foreground hover:text-primary">
							<Edit className="h-4 w-4" />
							<span className="sr-only">Edit Milestone</span>
						</Button>
						{/* Delete Milestone Button */}
						<Button variant="ghost" size="icon" onClick={() => onDelete(milestone.id, false)} className="text-muted-foreground hover:text-destructive">
							<Trash2 className="h-4 w-4" />
							<span className="sr-only">Delete Milestone</span>
						</Button>
					</div>
				</div>
				{milestone.description && <CardDescription>{milestone.description}</CardDescription>}
			</CardHeader>
			{/* Card Content */}
			<CardContent className="space-y-3">
				{/* Progress Bar */}
				<div className="flex items-center gap-4">
					<Progress value={milestone.progress} className="h-2" aria-label={`${milestone.progress}% complete`} />
					<span className="text-sm font-medium">{milestone.progress}%</span>
				</div>

				{/* Tasks Collapsible Section */}
				<Collapsible open={isTasksOpen} onOpenChange={setIsTasksOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="w-full justify-start px-1 text-muted-foreground hover:text-foreground">
							{isTasksOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
							<ListTodo className="h-4 w-4 mr-2" /> Tasks ({tasks.length})
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="pt-2 pl-5 pr-1 space-y-2">
						{/* Task List */}
						{loadingTasks ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
							</div>
						) : taskError ? (
							<p className="text-xs text-destructive text-center py-2">{taskError}</p>
						) : tasks.length === 0 ? (
							<p className="text-xs text-muted-foreground text-center py-2">No tasks added yet.</p>
						) : (
							<div className="max-h-48 overflow-y-auto space-y-1 pr-2">
								{tasks.map((task) => (
									<MilestoneTaskItem key={task.id} task={task} milestoneId={milestone.id} onToggle={handleTaskToggle} onDelete={handleDeleteTask} onEditRequest={openEditTaskDialog} />
								))}
							</div>
						)}
						{/* Add Task Button */}
						<div className="pt-2">
							<Button variant="outline" size="sm" className="w-full" onClick={openAddTaskDialog} disabled={loadingTasks}>
								<Plus className="h-4 w-4 mr-2" />
								Add Task
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{/* Badges and Deadline */}
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-2">
					<Badge variant="outline" className={getUrgencyColor(milestone.urgency)}>
						{urgencyLabel}
					</Badge>
					{daysLeft !== undefined && milestone.status === "active" && (
						<span className="flex items-center gap-1 text-muted-foreground">
							<Clock className="h-3 w-3" /> {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
						</span>
					)}
				</div>
			</CardContent>
			{/* Card Footer */}
			<CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
				<span className="flex items-center gap-1">
					<CalendarIcon className="h-3 w-3" /> Start: {formatDate(milestone.startDate)}
				</span>
				<span className="flex items-center gap-1">
					<Target className="h-3 w-3" /> End: {formatDate(milestone.endDate)}
				</span>
			</CardFooter>
		</Card>
	);
}

// --- Main Page Component ---
function MilestonesPageContent() {
	const [activeMilestones, setActiveMilestones] = useState<Milestone[]>([]);
	const [completedMilestones, setCompletedMilestones] = useState<Milestone[]>([]);
	const [loadingActive, setLoadingActive] = useState(true);
	const [loadingCompleted, setLoadingCompleted] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newMilestoneOpen, setNewMilestoneOpen] = useState(false);
	const [addMilestoneError, setAddMilestoneError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("active");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const searchParams = useSearchParams();
	const [newMilestoneData, setNewMilestoneData] = useState<Partial<Omit<Milestone, "id" | "tasks">>>({
		title: "",
		description: "",
		urgency: "medium",
		status: "active",
		progress: 0,
	});
	const [daysToComplete, setDaysToComplete] = useState<number>(14);

	useEffect(() => {
		if (searchParams?.get("action") === "add") {
			setNewMilestoneOpen(true);
		}
	}, [searchParams]);

	useEffect(() => {
		setLoadingActive(true);
		const unsubscribe = subscribeToMilestonesByStatus(
			"active",
			(data) => {
				setActiveMilestones(data);
				setLoadingActive(false);
				setError(null);
			},
			(err) => {
				console.error("Error loading active milestones:", err);
				setError("Failed to load active milestones.");
				setLoadingActive(false);
			}
		);
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		setLoadingCompleted(true);
		const unsubscribe = subscribeToMilestonesByStatus(
			"completed",
			(data) => {
				setCompletedMilestones(data);
				setLoadingCompleted(false);
			},
			(err) => {
				console.error("Error loading completed milestones:", err);
				setError((prev) => (prev ? prev + " Failed to load completed milestones." : "Failed to load completed milestones."));
				setLoadingCompleted(false);
			}
		);
		return () => unsubscribe();
	}, []);

	const handleAddMilestone = async () => {
		if (!newMilestoneData.title || newMilestoneData.title.trim() === "") {
			setError("Milestone title cannot be empty.");
			return;
		}
		if (daysToComplete <= 0) {
			setError("Days to complete must be a positive number.");
			return;
		}

		const startDate = Timestamp.now();
		const endDate = Timestamp.fromDate(addDays(startDate.toDate(), daysToComplete));

		const milestoneToAdd: Omit<Milestone, "id"> = {
			title: newMilestoneData.title.trim(),
			description: newMilestoneData.description || "",
			urgency: newMilestoneData.urgency || "medium",
			status: "active",
			progress: 0,
			startDate: startDate,
			endDate: endDate,
		};

		try {
			setError(null);
			await addMilestone(milestoneToAdd);
			setNewMilestoneData({
				title: "",
				description: "",
				urgency: "medium",
				status: "active",
				progress: 0,
			});
			setDaysToComplete(14);
			setNewMilestoneOpen(false);
		} catch (err) {
			console.error("Failed to add milestone:", err);
			setError("Failed to add the milestone. Please try again.");
		}
	};

	const handleDeleteMilestoneWrapper = async (id: string, deleteTasks: boolean) => {
		// TODO: Replace confirm with Shadcn Alert Dialog
		const confirmDelete = confirm(`Are you sure you want to delete this milestone? ${deleteTasks ? "This will also delete all associated tasks." : "Associated tasks will NOT be deleted."}`);
		if (!confirmDelete) return;

		try {
			setError(null);
			await deleteMilestone(id, deleteTasks);
		} catch (err) {
			console.error("Failed to delete milestone:", err);
			setError("Failed to delete the milestone.");
		}
	};

	const renderMilestoneList = (milestones: Milestone[], isLoading: boolean, isActiveTab: boolean) => {
		const trimmedQuery = searchQuery.trim().toLowerCase();
		const filteredMilestones = trimmedQuery ? milestones.filter((m) => m.title.toLowerCase().includes(trimmedQuery)) : milestones;
		if (isLoading) {
			return (
				<div className="space-y-4">
					{[...Array(2)].map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<Skeleton className="h-4 w-full mt-1" />
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-4">
									<Skeleton className="h-2 w-full" />
									<Skeleton className="h-4 w-8" />
								</div>
								<Skeleton className="h-5 w-1/3 mt-2" />
								<Skeleton className="h-4 w-1/2 mt-2" />
							</CardContent>
							<CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
								<Skeleton className="h-4 w-1/4" />
								<Skeleton className="h-4 w-1/4" />
							</CardFooter>
						</Card>
					))}
				</div>
			);
		}
		if (filteredMilestones.length === 0) {
			const type = isActiveTab ? "active" : "completed";
			return (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Target className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
					<h3 className="font-medium text-lg">{trimmedQuery ? "No matching milestones" : `No ${type} milestones`}</h3>
					{!trimmedQuery && type === "active" && <p className="text-sm text-muted-foreground">Add a new milestone to get started.</p>}
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{filteredMilestones.map((milestone) => (
					<MilestoneCard key={milestone.id} milestone={milestone} onDelete={handleDeleteMilestoneWrapper} />
				))}
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Milestones</h1>
					<p className="text-muted-foreground">Track your progress towards important goals</p>
				</div>
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search milestones by title..." aria-label="Search milestones by title" className="w-full sm:w-[240px] md:w-[320px]" />
					<Sheet open={newMilestoneOpen} onOpenChange={setNewMilestoneOpen}>
						<SheetTrigger asChild>
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Add Milestone
							</Button>
						</SheetTrigger>
						<SheetContent className="sm:max-w-[425px] flex flex-col h-full">
							<SheetHeader>
								<SheetTitle>Add New Milestone</SheetTitle>
								<SheetDescription>Create a new milestone to track your progress</SheetDescription>
							</SheetHeader>
							<div className="flex-grow overflow-y-auto py-4 space-y-4">
								<div className="grid gap-1.5">
									<Label htmlFor="milestone-title">Title</Label>
									<Input id="milestone-title" placeholder="e.g., Launch Version 2.0" value={newMilestoneData.title} onChange={(e) => setNewMilestoneData({ ...newMilestoneData, title: e.target.value })} />
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="milestone-description">Description (Optional)</Label>
									<Textarea id="milestone-description" placeholder="Describe the goal of this milestone" value={newMilestoneData.description} onChange={(e) => setNewMilestoneData({ ...newMilestoneData, description: e.target.value })} />
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="grid gap-1.5">
										<Label htmlFor="milestone-urgency">Urgency</Label>
										<Select value={newMilestoneData.urgency} onValueChange={(value) => setNewMilestoneData({ ...newMilestoneData, urgency: value as Milestone["urgency"] })}>
											<SelectTrigger id="milestone-urgency">
												<SelectValue placeholder="Select urgency" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="high">High</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="low">Low</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="grid gap-1.5">
										<Label htmlFor="milestone-days">Days to Complete</Label>
										<Input id="milestone-days" type="number" min="1" placeholder="e.g., 14" value={daysToComplete} onChange={(e) => setDaysToComplete(Number.parseInt(e.target.value) || 1)} />
									</div>
								</div>
								{error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
							</div>
							<SheetFooter className="mt-auto pt-4 border-t">
								<Button
									variant="outline"
									onClick={() => {
										setNewMilestoneOpen(false);
										setError(null);
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleAddMilestone}>Add Milestone</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</div>

			{error && !newMilestoneOpen && (
				<Card className="border-destructive bg-destructive/10">
					<CardContent className="p-4 text-center text-destructive flex items-center justify-center gap-2">
						<AlertTriangle className="h-4 w-4" /> {error}
					</CardContent>
				</Card>
			)}

			<Tabs defaultValue="active" className="space-y-4">
				<TabsList>
					<TabsTrigger value="active">Active</TabsTrigger>
					<TabsTrigger value="completed">Completed</TabsTrigger>
				</TabsList>
				<TabsContent value="active" className="space-y-4">
					{renderMilestoneList(activeMilestones, loadingActive, true)}
				</TabsContent>
				<TabsContent value="completed" className="space-y-4">
					{renderMilestoneList(completedMilestones, loadingCompleted, false)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function MilestonesPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<MilestonesPageContent />
		</Suspense>
	);
}
