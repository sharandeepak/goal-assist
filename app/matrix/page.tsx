"use client";

import { useState, useEffect } from "react";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { MatrixFilters } from "@/components/matrix/matrix-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog";
import { subscribeToMatrixTasks, updateTaskQuadrant, QuadrantType, MatrixTasksData } from "@/services/matrixService";
import { Task } from "@/types";
import { addTask, updateTaskCompletion, deleteTask, updateTask } from "@/services/taskService";
import { Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function MatrixPage() {
	const [tasks, setTasks] = useState<MatrixTasksData>({
		q1: [],
		q2: [],
		q3: [],
		q4: [],
		uncategorized: [],
	});
	const [loading, setLoading] = useState(true);
	const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
	const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
	const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [prefilledPriority, setPrefilledPriority] = useState<"low" | "medium" | "high" | undefined>(undefined);
	const [prefilledUrgency, setPrefilledUrgency] = useState<"low" | "medium" | "high" | undefined>(undefined);
	const { toast } = useToast();

	// Subscribe to tasks
	useEffect(() => {
		setLoading(true);
		const unsubscribe = subscribeToMatrixTasks(
			dateRange,
			(data) => {
				setTasks(data);
				setLoading(false);
			},
			(error) => {
				console.error("Error loading matrix tasks:", error);
				toast({
					title: "Error",
					description: "Failed to load tasks. Please try again.",
					variant: "destructive",
				});
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [dateRange, toast]);

	// Filter tasks by search query
	const filterTasksBySearch = (taskList: Task[]): Task[] => {
		if (!searchQuery.trim()) return taskList;
		const query = searchQuery.toLowerCase();
		return taskList.filter((task) => task.title.toLowerCase().includes(query));
	};

	const filteredTasks: MatrixTasksData = {
		q1: filterTasksBySearch(tasks.q1),
		q2: filterTasksBySearch(tasks.q2),
		q3: filterTasksBySearch(tasks.q3),
		q4: filterTasksBySearch(tasks.q4),
		uncategorized: filterTasksBySearch(tasks.uncategorized),
	};

	const taskCounts = {
		q1: filteredTasks.q1.length,
		q2: filteredTasks.q2.length,
		q3: filteredTasks.q3.length,
		q4: filteredTasks.q4.length,
	};

	const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
		try {
			await updateTaskCompletion(taskId, !currentCompleted, undefined);
			toast({
				title: "Success",
				description: `Task marked as ${!currentCompleted ? "completed" : "incomplete"}.`,
			});
		} catch (err) {
			console.error("Failed to update task completion:", err);
			toast({
				title: "Error",
				description: "Failed to update task status.",
				variant: "destructive",
			});
		}
	};

	const handleDeleteTask = async (taskId: string) => {
		if (!confirm("Are you sure you want to delete this task?")) return;
		try {
			await deleteTask(taskId, undefined);
			toast({
				title: "Success",
				description: "Task deleted successfully.",
			});
		} catch (err) {
			console.error("Failed to delete task:", err);
			toast({
				title: "Error",
				description: "Failed to delete task.",
				variant: "destructive",
			});
		}
	};

	const handleTaskMove = async (taskId: string, newPriority: "low" | "medium" | "high", newUrgency: "low" | "medium" | "high") => {
		try {
			await updateTaskQuadrant(taskId, newPriority, newUrgency);
			toast({
				title: "Success",
				description: "Task moved successfully.",
			});
		} catch (err) {
			console.error("Failed to move task:", err);
			toast({
				title: "Error",
				description: "Failed to move task. Please try again.",
				variant: "destructive",
			});
			throw err; // Re-throw to handle in grid component
		}
	};

	const handleAddTaskSubmit = async (formData: TaskFormData) => {
		if (!formData.priority || !formData.urgency) {
			throw new Error("Both priority and urgency are required for matrix tasks.");
		}

		const taskToAdd: Omit<Task, "id"> = {
			title: formData.title!,
			completed: false,
			date: formData.date || Timestamp.now(),
			priority: formData.priority,
			urgency: formData.urgency,
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
			toast({
				title: "Success",
				description: "Task created successfully.",
			});
		} catch (err) {
			console.error("Failed to add task:", err);
			toast({
				title: "Error",
				description: err instanceof Error ? err.message : "Failed to add task.",
				variant: "destructive",
			});
			throw err;
		}
	};

	const handleUpdateTaskSubmit = async (formData: TaskFormData) => {
		if (!editingTask) throw new Error("No task selected for editing.");
		if (!formData.priority || !formData.urgency) {
			throw new Error("Both priority and urgency are required for matrix tasks.");
		}

		try {
			// Update all task fields including title, tags, date, priority, and urgency
			const dataToUpdate: Partial<Omit<Task, "id" | "completed" | "createdAt" | "milestoneId">> = {
				title: formData.title!,
				priority: formData.priority,
				urgency: formData.urgency,
				date: formData.date,
				tags:
					formData.tagsString
						?.split(",")
						.map((tag: string) => tag.trim())
						.filter((tag: string) => tag !== "") || [],
			};

			await updateTask(editingTask.id, dataToUpdate);

			setIsEditTaskDialogOpen(false);
			setEditingTask(null);
			toast({
				title: "Success",
				description: "Task updated successfully.",
			});
		} catch (err) {
			console.error("Failed to update task:", err);
			toast({
				title: "Error",
				description: "Failed to update task.",
				variant: "destructive",
			});
			throw err;
		}
	};

	const openEditTaskDialog = (task: Task) => {
		setEditingTask(task);
		setIsEditTaskDialogOpen(true);
	};

	const handleQuadrantExpand = (quadrant: QuadrantType) => {
		setSelectedQuadrant(quadrant);
	};

	const handleQuadrantCollapse = () => {
		setSelectedQuadrant("all");
	};

	const handleAddTaskToQuadrant = (quadrant: QuadrantType) => {
		// Determine priority and urgency based on quadrant
		const { priority, urgency } = quadrantToValues(quadrant);
		setPrefilledPriority(priority);
		setPrefilledUrgency(urgency);
		setIsAddTaskDialogOpen(true);
	};

	const handleAddTaskDialogClose = (isOpen: boolean) => {
		setIsAddTaskDialogOpen(isOpen);
		if (!isOpen) {
			// Reset prefilled values when dialog closes
			setPrefilledPriority(undefined);
			setPrefilledUrgency(undefined);
		}
	};

	const quadrantToValues = (quadrant: QuadrantType): { priority: "low" | "medium" | "high"; urgency: "low" | "medium" | "high" } => {
		switch (quadrant) {
			case "q1":
				return { priority: "high", urgency: "high" };
			case "q2":
				return { priority: "high", urgency: "low" };
			case "q3":
				return { priority: "low", urgency: "high" };
			case "q4":
				return { priority: "low", urgency: "low" };
			default:
				return { priority: "medium", urgency: "medium" };
		}
	};

	// Create initial data with prefilled priority/urgency
	const initialDataForAdd = prefilledPriority && prefilledUrgency ? { priority: prefilledPriority, urgency: prefilledUrgency } : undefined;

	return (
		<div className="space-y-4">
			{/* Compact Header with Search and Date Filter */}
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div className="flex-1 flex gap-3 w-full">
					<div className="relative flex-1">
						<Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-3" />
					</div>
					<MatrixFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedQuadrant={selectedQuadrant} onQuadrantChange={setSelectedQuadrant} searchQuery={searchQuery} onSearchChange={setSearchQuery} taskCounts={taskCounts} />
				</div>
			</div>

			{/* Matrix Grid */}
			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-[400px] w-full rounded-lg" />
					))}
				</div>
			) : (
				<MatrixGrid tasks={filteredTasks} onToggleComplete={handleTaskToggle} onEdit={openEditTaskDialog} onDelete={handleDeleteTask} onTaskMove={handleTaskMove} selectedQuadrant={selectedQuadrant} onQuadrantExpand={handleQuadrantExpand} onQuadrantCollapse={handleQuadrantCollapse} onAddTaskToQuadrant={handleAddTaskToQuadrant} />
			)}

			{/* Add Task Dialog */}
			<TaskFormDialog isOpen={isAddTaskDialogOpen} onOpenChange={handleAddTaskDialogClose} onSubmit={handleAddTaskSubmit} initialData={initialDataForAdd as any} dialogTitle="Add New Task" dialogDescription="Create a task with priority and urgency for the matrix." requireUrgency={true} />

			{/* Edit Task Dialog */}
			<TaskFormDialog isOpen={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen} onSubmit={handleUpdateTaskSubmit} initialData={editingTask} dialogTitle="Edit Task" dialogDescription={`Update "${editingTask?.title || "task"}".`} requireUrgency={true} />
		</div>
	);
}
